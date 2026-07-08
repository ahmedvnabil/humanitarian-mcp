/**
 * ReliefWeb provider — planned.
 *
 * ReliefWeb (https://apidoc.reliefweb.int/) exposes reports, disasters and
 * jobs. The intended mapping onto the provider contract:
 *
 *   search()   → /reports with query[value]=<text>, country facet filters
 *   list()     → dataset 'situation-reports' filtered by country + date range,
 *                normalized to NormalizedRecord with population = report count
 *   metadata() → dataset descriptors for reports and disasters
 *   health()   → GET /reports?limit=1
 *
 * Implementation checklist (see docs/adding-providers.md for the full guide):
 *   1. client.ts     — typed wrapper over the ReliefWeb REST endpoints
 *   2. normalize.ts  — raw report → NormalizedRecord (pure, unit-tested)
 *   3. index.ts      — class ReliefWebProvider implements HumanitarianProvider
 *   4. register in src/context.ts behind the 'reliefweb' provider id
 *
 * Until then the provider id is recognised but reports itself as unavailable,
 * so `HMCP_PROVIDERS=unhcr,reliefweb` fails loudly instead of silently.
 */
export const RELIEFWEB_PROVIDER_ID = 'reliefweb';

export function reliefwebNotImplemented(): never {
  throw new Error(
    'The ReliefWeb provider is scaffolded but not implemented yet — track progress in docs/adding-providers.md',
  );
}
