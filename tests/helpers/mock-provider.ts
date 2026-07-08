import { matchCountries } from '../../src/shared/country-match.js';
import type {
  CountryMatch,
  CountryRef,
  DatasetId,
  HumanitarianProvider,
  ListQuery,
  NormalizedRecord,
  Page,
  ProviderHealth,
  ProviderMetadata,
  SearchQuery,
} from '../../src/providers/types.js';

/**
 * Deterministic in-memory provider used by integration tests: no network,
 * stable numbers, same contract as a real provider.
 */

const COUNTRIES: CountryRef[] = [
  { name: 'Egypt', iso3: 'EGY', iso2: 'EG', region: 'Africa' },
  { name: 'Jordan', iso3: 'JOR', iso2: 'JO', region: 'Asia' },
  { name: 'Syrian Arab Rep.', iso3: 'SYR', iso2: 'SY', region: 'Asia' },
  { name: 'Sudan', iso3: 'SDN', iso2: 'SD', region: 'Africa' },
];

const ALIASES: Record<string, string[]> = {
  SYR: ['syria'],
};

function populationRecord(country: CountryRef, year: number, refugees: number): NormalizedRecord {
  return {
    country: country.name,
    country_code: country.iso3,
    asylum: country.name,
    asylum_code: country.iso3,
    year,
    population: refugees + 1000,
    metrics: { refugees, asylum_seekers: 1000 },
    source: 'mock',
    last_updated: '2026-01-01T00:00:00.000Z',
    dataset: 'population',
  };
}

/** Refugees hosted: deterministic ramp per country so trends are testable. */
function refugeesFor(iso3: string, year: number): number {
  const base: Record<string, number> = { EGY: 100_000, JOR: 600_000, SYR: 10_000, SDN: 800_000 };
  return (base[iso3] ?? 50_000) + (year - 2015) * 10_000;
}

export class MockProvider implements HumanitarianProvider {
  readonly id = 'mock';
  readonly name = 'Mock Provider';

  search(query: SearchQuery): Promise<CountryMatch[]> {
    const candidates = COUNTRIES.map((c) => ({
      value: c,
      names: [c.name, c.iso3, ...(c.iso2 ? [c.iso2] : []), ...(ALIASES[c.iso3] ?? [])],
    }));
    return Promise.resolve(
      matchCountries(query.query, candidates, query.limit ?? 5).map((m) => ({
        ...m.value,
        score: m.score,
      })),
    );
  }

  get(ref: string): Promise<CountryRef | null> {
    const upper = ref.toUpperCase();
    return Promise.resolve(COUNTRIES.find((c) => c.iso3 === upper) ?? null);
  }

  countries(): Promise<CountryRef[]> {
    return Promise.resolve([...COUNTRIES]);
  }

  list(query: ListQuery): Promise<Page<NormalizedRecord>> {
    const yearFrom = query.yearFrom ?? 2015;
    const yearTo = Math.min(query.yearTo ?? 2024, 2024);
    let records: NormalizedRecord[] = [];

    if (query.dataset === 'population') {
      const asylumFilter = query.asylum_iso3?.toUpperCase();
      const subjects = asylumFilter
        ? COUNTRIES.filter((c) => c.iso3 === asylumFilter)
        : query.groupBy === 'asylum' || query.groupBy === 'origin'
          ? COUNTRIES
          : [{ name: 'All countries', iso3: '', region: undefined } as unknown as CountryRef];
      for (let year = yearFrom; year <= yearTo; year++) {
        for (const subject of subjects) {
          records.push(
            populationRecord(
              subject,
              year,
              subject.iso3 ? refugeesFor(subject.iso3, year) : 5_000_000,
            ),
          );
        }
      }
      if (query.origin_iso3) {
        // Mock keeps it simple: origin filters return the same shaped data.
        records = records.map((r) => ({
          ...r,
          origin: 'Syrian Arab Rep.',
          origin_code: 'SYR',
        }));
      }
    } else if (query.dataset === 'demographics') {
      const iso3 = (query.asylum_iso3 ?? query.origin_iso3 ?? 'EGY').toUpperCase();
      const country = COUNTRIES.find((c) => c.iso3 === iso3);
      if (country) {
        records.push({
          country: country.name,
          country_code: country.iso3,
          year: 2024,
          population: 200_000,
          metrics: {
            f_0_4: 10_000,
            f_5_11: 15_000,
            f_12_17: 12_000,
            f_18_59: 50_000,
            f_60: 8_000,
            f_total: 95_000,
            m_0_4: 11_000,
            m_5_11: 16_000,
            m_12_17: 13_000,
            m_18_59: 57_000,
            m_60: 8_000,
            m_total: 105_000,
            total: 200_000,
          },
          source: 'mock',
          last_updated: '2026-01-01T00:00:00.000Z',
          dataset: 'demographics',
        });
      }
    } else {
      const iso3 = (query.asylum_iso3 ?? 'EGY').toUpperCase();
      const country = COUNTRIES.find((c) => c.iso3 === iso3);
      if (country) {
        for (let year = Math.max(yearFrom, 2020); year <= yearTo; year++) {
          const metrics: Record<string, number> =
            query.dataset === 'asylum-applications'
              ? { applied: 20_000 + (year - 2020) * 1_000 }
              : {
                  dec_recognized: 8_000,
                  dec_other: 500,
                  dec_rejected: 1_500,
                  dec_closed: 2_000,
                  dec_total: 12_000,
                };
          records.push({
            country: country.name,
            country_code: country.iso3,
            asylum: country.name,
            asylum_code: country.iso3,
            year,
            population: metrics['applied'] ?? metrics['dec_total'] ?? 0,
            metrics,
            source: 'mock',
            last_updated: '2026-01-01T00:00:00.000Z',
            dataset: query.dataset,
          });
        }
      }
    }

    const limit = query.limit ?? 100;
    const page = query.page ?? 1;
    const start = (page - 1) * limit;
    return Promise.resolve({
      items: records.slice(start, start + limit),
      page,
      maxPages: Math.max(1, Math.ceil(records.length / limit)),
      total: records.length,
    });
  }

  metadata(): Promise<ProviderMetadata> {
    return Promise.resolve({
      id: this.id,
      name: this.name,
      description: 'Deterministic fixture data for tests',
      homepage: 'https://example.test',
      datasets: (
        ['population', 'demographics', 'asylum-applications', 'asylum-decisions'] as DatasetId[]
      ).map((id) => ({
        id,
        title: id,
        description: `mock ${id}`,
        metrics: ['refugees'],
        citation: 'mock',
      })),
      attribution: 'Mock data — tests only',
      terms: 'https://example.test/terms',
    });
  }

  health(): Promise<ProviderHealth> {
    return Promise.resolve({
      provider: this.id,
      ok: true,
      latencyMs: 1,
      detail: 'mock always healthy',
      checkedAt: '2026-01-01T00:00:00.000Z',
    });
  }

  normalize(raw: unknown, dataset: DatasetId): NormalizedRecord[] {
    void dataset;
    return Array.isArray(raw) ? (raw as NormalizedRecord[]) : [];
  }
}
