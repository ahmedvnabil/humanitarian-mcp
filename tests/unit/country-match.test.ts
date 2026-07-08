import { describe, expect, it } from 'vitest';
import { matchCountries, normalizeName } from '../../src/shared/country-match.js';

describe('normalizeName', () => {
  it('lowercases, strips diacritics and punctuation', () => {
    expect(normalizeName('Türkiye')).toBe('turkiye');
    expect(normalizeName("Cote d'Ivoire")).toBe('cote d ivoire');
    expect(normalizeName('  Syrian   Arab Rep. ')).toBe('syrian arab rep');
  });
});

describe('matchCountries', () => {
  const candidates = [
    { value: 'EGY', names: ['Egypt', 'EGY', 'EG'] },
    { value: 'SYR', names: ['Syrian Arab Rep.', 'SYR', 'syria'] },
    { value: 'ARE', names: ['United Arab Emirates', 'ARE', 'uae'] },
  ];

  it('ranks exact matches first', () => {
    const [best] = matchCountries('egypt', candidates);
    expect(best).toEqual({ value: 'EGY', score: 1 });
  });

  it('finds aliases and codes', () => {
    expect(matchCountries('syria', candidates)[0]!.value).toBe('SYR');
    expect(matchCountries('SYR', candidates)[0]!.value).toBe('SYR');
    expect(matchCountries('uae', candidates)[0]!.value).toBe('ARE');
  });

  it('scores prefix above substring, and drops non-matches', () => {
    const results = matchCountries('egy', candidates);
    expect(results[0]!.value).toBe('EGY');
    expect(results.find((r) => r.value === 'ARE')).toBeUndefined();
  });

  it('matches multi-token queries by overlap', () => {
    expect(matchCountries('arab emirates', candidates)[0]!.value).toBe('ARE');
  });

  it('returns nothing for empty or unmatched queries', () => {
    expect(matchCountries('', candidates)).toEqual([]);
    expect(matchCountries('wakanda', candidates)).toEqual([]);
  });
});
