import type { InstrumentedCache } from '../cache/index.js';
import type { Config } from '../config.js';
import { ProviderError } from '../errors.js';
import type { Logger } from '../logger.js';
import type { RateLimiter } from './rate-limiter.js';

/**
 * Resilient JSON fetcher shared by all providers.
 *
 * Layered behaviour, in order:
 *  1. fresh cache hit          → return, zero network
 *  2. offline mode             → return any cached body, else fail clearly
 *  3. stale-but-usable hit     → return stale immediately, refresh in background
 *  4. network fetch            → rate-limited, retried with exponential backoff,
 *                                conditional (If-None-Match) when an ETag is cached
 *  5. network failure          → fall back to any cached body, else raise
 */

export interface HttpClientOptions {
  cache: InstrumentedCache;
  config: Config;
  logger: Logger;
  limiter: RateLimiter;
  provider: string;
  fetchImpl?: typeof fetch;
}

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 400;
const REQUEST_TIMEOUT_MS = 20_000;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export class HttpClient {
  private readonly refreshing = new Set<string>();

  constructor(private readonly opts: HttpClientOptions) {}

  /** Fetch and parse JSON with caching. `ttlSeconds` overrides the config TTL. */
  async getJson<T>(url: string, ttlSeconds?: number): Promise<T> {
    const { cache, config, logger, provider } = this.opts;
    const ttlMs = (ttlSeconds ?? config.cacheTtlSeconds) * 1000;
    const staleMs = Math.max(ttlMs, config.cacheStaleTtlSeconds * 1000);

    const cached = await cache.get(url);
    const age = cached ? Date.now() - cached.fetchedAt : Infinity;

    if (cached && age < ttlMs) {
      return JSON.parse(cached.body) as T;
    }

    if (config.offline) {
      if (cached) {
        cache.stats.staleServed += 1;
        return JSON.parse(cached.body) as T;
      }
      throw new ProviderError('offline_miss', url, provider);
    }

    if (cached && age < staleMs) {
      // Stale-while-revalidate: serve immediately, refresh in the background.
      cache.stats.staleServed += 1;
      this.refreshInBackground(url, cached.etag);
      return JSON.parse(cached.body) as T;
    }

    try {
      const body = await this.fetchWithRetry(url, cached?.etag);
      return JSON.parse(body) as T;
    } catch (err) {
      if (cached) {
        logger.warn('http: network failed, serving stale cache', { url, provider });
        cache.stats.staleServed += 1;
        return JSON.parse(cached.body) as T;
      }
      throw err;
    }
  }

  private refreshInBackground(url: string, etag: string | undefined): void {
    if (this.refreshing.has(url)) return;
    this.refreshing.add(url);
    void this.fetchWithRetry(url, etag)
      .catch((err: unknown) => {
        this.opts.logger.debug('http: background refresh failed', {
          url,
          error: err instanceof Error ? err.message : String(err),
        });
      })
      .finally(() => this.refreshing.delete(url));
  }

  /** Network fetch with rate limiting, retries and ETag revalidation. */
  private async fetchWithRetry(url: string, etag?: string): Promise<string> {
    const { cache, config, logger, limiter, provider } = this.opts;
    const fetchImpl = this.opts.fetchImpl ?? fetch;
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      await limiter.acquire();
      try {
        const headers: Record<string, string> = {
          accept: 'application/json',
          'user-agent': config.userAgent,
        };
        if (etag) headers['if-none-match'] = etag;

        const response = await fetchImpl(url, {
          headers,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (response.status === 304) {
          const cached = await cache.get(url);
          if (cached) {
            cache.stats.revalidations += 1;
            await cache.set(url, { ...cached, fetchedAt: Date.now() });
            return cached.body;
          }
          // 304 without a cached body should not happen; retry unconditionally.
          etag = undefined;
          continue;
        }

        if (!response.ok) {
          const kind = response.status === 429 ? 'rate_limited' : 'upstream_error';
          const error = new ProviderError(kind, `HTTP ${response.status} from ${url}`, provider);
          if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_ATTEMPTS) {
            lastError = error;
            await this.backoff(attempt);
            continue;
          }
          throw error;
        }

        const body = await response.text();
        const responseEtag = response.headers.get('etag');
        await cache.set(url, {
          body,
          ...(responseEtag !== null ? { etag: responseEtag } : {}),
          fetchedAt: Date.now(),
        });
        return body;
      } catch (err) {
        if (err instanceof ProviderError && err.kind !== 'rate_limited') throw err;
        lastError = err;
        if (attempt < MAX_ATTEMPTS) {
          logger.debug('http: retrying', { url, attempt, provider });
          await this.backoff(attempt);
        }
      }
    }

    if (lastError instanceof ProviderError) throw lastError;
    throw new ProviderError(
      'network',
      lastError instanceof Error ? lastError.message : String(lastError),
      provider,
    );
  }

  private backoff(attempt: number): Promise<void> {
    const jitter = Math.floor(Math.random() * 100);
    const delay = BASE_BACKOFF_MS * 2 ** (attempt - 1) + jitter;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
