/**
 * HDX provider — planned.
 *
 * The Humanitarian Data Exchange (https://data.humdata.org) is a CKAN
 * instance; its HAPI (https://hapi.humdata.org) offers normalized indicators
 * that map naturally onto this platform's NormalizedRecord:
 *
 *   search()   → HAPI /api/v1/metadata/location autocomplete
 *   list()     → HAPI themes (population, food security, conflict events...)
 *                filtered by location_code (ISO3 — no translation needed)
 *   metadata() → HAPI theme catalogue
 *   health()   → GET /api/v1/metadata/version
 *
 * Implementation checklist (see docs/adding-providers.md for the full guide):
 *   1. client.ts     — typed wrapper over HAPI (requires a free app identifier)
 *   2. normalize.ts  — HAPI rows → NormalizedRecord (pure, unit-tested)
 *   3. index.ts      — class HdxProvider implements HumanitarianProvider
 *   4. register in src/context.ts behind the 'hdx' provider id
 */
export const HDX_PROVIDER_ID = 'hdx';

export function hdxNotImplemented(): never {
  throw new Error(
    'The HDX provider is scaffolded but not implemented yet — track progress in docs/adding-providers.md',
  );
}
