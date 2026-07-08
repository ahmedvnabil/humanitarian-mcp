/**
 * Error taxonomy shared across providers and tools.
 *
 * Providers throw typed errors; the tool layer converts them into MCP tool
 * results with `isError: true` and a message an LLM can act on (never a stack
 * trace, never provider internals).
 */

export type ProviderErrorKind =
  'not_found' | 'bad_request' | 'rate_limited' | 'upstream_error' | 'network' | 'offline_miss';

export class ProviderError extends Error {
  constructor(
    readonly kind: ProviderErrorKind,
    message: string,
    readonly provider?: string,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/** Raised when a country query cannot be resolved to a known country. */
export class CountryNotFoundError extends Error {
  constructor(
    readonly query: string,
    readonly suggestions: readonly string[] = [],
  ) {
    const hint = suggestions.length > 0 ? ` Did you mean: ${suggestions.join(', ')}?` : '';
    super(`No country matched "${query}".${hint} Try the search_country tool first.`);
    this.name = 'CountryNotFoundError';
  }
}

/** A user-facing message for any error thrown inside a tool handler. */
export function toUserMessage(err: unknown): string {
  if (err instanceof CountryNotFoundError) return err.message;
  if (err instanceof ProviderError) {
    switch (err.kind) {
      case 'offline_miss':
        return `Offline mode is enabled and this data is not cached yet: ${err.message}`;
      case 'rate_limited':
        return `The ${err.provider ?? 'data'} provider is rate limiting requests. Retry shortly.`;
      case 'network':
        return `Could not reach the ${err.provider ?? 'data'} provider: ${err.message}`;
      case 'not_found':
        return err.message;
      default:
        return `The ${err.provider ?? 'data'} provider returned an error: ${err.message}`;
    }
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
