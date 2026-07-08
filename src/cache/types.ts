/**
 * Cache abstraction used by the shared HTTP layer.
 *
 * Entries store the response body plus HTTP validation metadata (ETag) so the
 * fetch layer can do conditional requests and stale-while-revalidate.
 */

export interface CacheEntry {
  /** Serialized response body (JSON text). */
  body: string;
  etag?: string;
  /** Epoch milliseconds when the entry was stored or last revalidated. */
  fetchedAt: number;
}

export interface Cache {
  get(key: string): Promise<CacheEntry | undefined>;
  set(key: string, entry: CacheEntry): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  /** Number of stored entries (for diagnostics/dashboard). */
  size(): Promise<number>;
  /** Human-readable backend name. */
  readonly backend: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  revalidations: number;
  staleServed: number;
}

/** Wraps a cache with hit/miss counters for the dashboard. */
export class InstrumentedCache implements Cache {
  readonly stats: CacheStats = { hits: 0, misses: 0, revalidations: 0, staleServed: 0 };

  constructor(private readonly inner: Cache) {}

  get backend(): string {
    return this.inner.backend;
  }

  async get(key: string): Promise<CacheEntry | undefined> {
    const entry = await this.inner.get(key);
    if (entry) this.stats.hits += 1;
    else this.stats.misses += 1;
    return entry;
  }

  set(key: string, entry: CacheEntry): Promise<void> {
    return this.inner.set(key, entry);
  }

  delete(key: string): Promise<void> {
    return this.inner.delete(key);
  }

  clear(): Promise<void> {
    return this.inner.clear();
  }

  size(): Promise<number> {
    return this.inner.size();
  }
}
