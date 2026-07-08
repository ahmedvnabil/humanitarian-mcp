import { describe, expect, it } from 'vitest';
import { CountryNotFoundError, ProviderError, toUserMessage } from '../../src/errors.js';

describe('CountryNotFoundError', () => {
  it('embeds suggestions and a next step', () => {
    const err = new CountryNotFoundError('siria', ['Syrian Arab Rep.', 'Serbia']);
    expect(err.message).toContain('siria');
    expect(err.message).toContain('Syrian Arab Rep.');
    expect(err.message).toContain('search_country');
  });

  it('omits the suggestion clause when there are none', () => {
    expect(new CountryNotFoundError('xyz').message).not.toContain('Did you mean');
  });
});

describe('toUserMessage', () => {
  it('maps every ProviderError kind to actionable text', () => {
    expect(toUserMessage(new ProviderError('offline_miss', 'https://x', 'unhcr'))).toContain(
      'Offline mode',
    );
    expect(toUserMessage(new ProviderError('rate_limited', 'slow down', 'unhcr'))).toContain(
      'rate limiting',
    );
    expect(toUserMessage(new ProviderError('network', 'ECONNREFUSED', 'unhcr'))).toContain(
      'Could not reach',
    );
    expect(toUserMessage(new ProviderError('not_found', 'no such dataset'))).toBe(
      'no such dataset',
    );
    expect(toUserMessage(new ProviderError('upstream_error', 'HTTP 500', 'unhcr'))).toContain(
      'returned an error',
    );
  });

  it('passes through plain errors and stringifies the rest', () => {
    expect(toUserMessage(new Error('boom'))).toBe('boom');
    expect(toUserMessage('raw string')).toBe('raw string');
    expect(toUserMessage(new CountryNotFoundError('q'))).toContain('No country matched');
  });
});
