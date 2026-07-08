# Tool reference

Conventions shared by every tool:

- `country` accepts a name, alias or ISO3 code (`"Egypt"`, `"egypt"`, `"EGY"`,
  `"DRC"`). Unresolvable queries return an `isError` result suggesting
  `search_country`.
- `role`: `"asylum"` (default) = people hosted **in** the country;
  `"origin"` = people displaced **from** it.
- `year_from` / `year_to` default to the last 10 years.
- Every tool returns markdown `content` plus `structuredContent` matching its
  declared `outputSchema`, and is annotated `readOnlyHint: true`.
- Source figures are end-year stocks from the UNHCR Refugee Data Finder.

---

### search_country

`query` (string, required) · `limit` (1–20, default 5)
→ `{ matches: [{ name, iso3, iso2?, region?, score }] }`

### country_profile

`country`
→ `{ country, country_code, year?, hosted{...}, displaced_abroad{...}, top_origins[...] }`
Latest hosted figures, figures for nationals abroad, top 5 origins of hosted refugees.

### compare_countries

`countries` (2–5) · `metric` (default `refugees`) · `role` · `year_from` · `year_to`
→ `{ metric, role, series: [{ country, country_code, points: [{year, value}] }] }`

### refugee_population

`country` · `role` · `other_country` · `year_from` · `year_to` · `page` · `limit` (≤1000)
→ `{ records: NormalizedRecord[], page_info: { page, maxPages?, total? } }`
`other_country` cross-filters the opposite role: `country="Egypt", other_country="Syria"` = Syrians in Egypt.

### demographics

`country` · `role`
→ `{ year, female{0_4,5_11,12_17,18_59,60,total}, male{...}, total }`
Latest available year only (UNHCR publishes recent demographics only).

### latest_statistics

`country?` · `role`
→ `{ scope, year, figures{...} }` — omit `country` for global totals.

### asylum_applications

`country` · `role` · `year_from` · `year_to`
→ `{ yearly: [{ year, applied }] }`

### asylum_decisions

`country` · `role` · `year_from` · `year_to`
→ `{ yearly: [{ year, recognized, complementary, rejected, closed, total, recognition_rate_pct }] }`
Recognition rate = (recognized + complementary) / substantive decisions.

### trend_analysis

`country` · `metric` · `role` · `year_from` · `year_to`
→ `{ series, year_over_year, trend: { slope_per_year, r2, direction, cagr_pct }, anomalies: [{year, change, zScore}] }`
Anomalies are years whose YoY change deviates ≥2σ from the series mean.

### forecast

`country` · `metric` · `role` · `years_ahead` (1–5, default 3)
→ `{ historical, projected, method, caveat }`
Ordinary least squares over the last 10 years, floored at 0. **Always relay the caveat.**

### top_host_countries

`year?` (default latest) · `metric` · `by` (`asylum`|`origin`) · `limit` (≤50)
→ `{ year, metric, by, ranking: [{ rank, country, country_code, value }] }`
`by="origin"` turns it into top origin countries.

### generate_chart

`countries` (1–5) · `metric` · `role` · `format` (`chartjs`|`vega-lite`|`mermaid`|`svg`) · `kind` (`line`|`bar`) · `year_from` · `year_to`
→ `{ format, title, spec }` — object for chartjs/vega-lite, string for mermaid/svg.

### generate_map

`year?` · `metric` · `by` · `limit` (≤200, default 25)
→ `{ year, metric, feature_count, skipped_countries, geojson }`
Country-centroid points; countries without a centroid are listed, not dropped silently.

### generate_country_report

`country` · `year_from` · `year_to`
→ `{ markdown }` — key figures, trend table + embedded mermaid chart, top origins,
asylum decisions, demographics, method notes. Emits 5 MCP progress notifications.

### export_data

`dataset` (`population`|`demographics`|`asylum-applications`|`asylum-decisions`) ·
`format` (`csv`|`json`|`markdown`|`geojson`) · `country?` · `role` · `group_by` ·
`year_from` · `year_to` · `limit` (≤5000, default 500)
→ `{ dataset, format, row_count, truncated, data }`
`group_by` breaks rows down per asylum/origin country (needed for meaningful geojson).

### get_metadata

(no arguments)
→ `{ providers: [{ id, name, datasets: [{ id, metrics, citation }], attribution, terms }] }`

### provider_health

(no arguments)
→ `{ healthy, providers: [{ provider, ok, latencyMs?, detail, checkedAt }] }`
