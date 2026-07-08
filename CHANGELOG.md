# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-07-09

First public release.

### Added

- **UNHCR provider** over the Refugee Statistics API: population, demographics,
  asylum applications and asylum decisions, 1951–present, no API key required.
  Full normalization of UNHCR quirks (internal country codes, `"-"` cells,
  mixed number/string values) behind ISO3-only records.
- **17 read-only tools**: `search_country`, `country_profile`,
  `compare_countries`, `refugee_population`, `demographics`,
  `latest_statistics`, `asylum_applications`, `asylum_decisions`,
  `trend_analysis` (with anomaly detection), `forecast`, `top_host_countries`,
  `generate_chart` (Chart.js / Vega-Lite / Mermaid / SVG), `generate_map`
  (GeoJSON), `generate_country_report` (with MCP progress notifications),
  `export_data` (CSV / JSON / Markdown / GeoJSON), `get_metadata`,
  `provider_health`. All with structured outputs.
- **Resources**: `metadata://providers|countries|datasets`, `dataset://{id}`,
  `country://{code}`, `report://{code}`, `chart://{code}` with URI-template
  completion.
- **7 prompts**: situation summary, two-country comparison, donor briefing,
  trend explainer, anomaly hunt, executive report, infographic content.
- **Transports**: stdio (default) and stateless Streamable HTTP (`--http`)
  with a self-contained demo dashboard.
- **Caching**: memory or SQLite (`node:sqlite`, zero native deps), TTL + ETag
  revalidation, stale-while-revalidate background refresh, offline mode.
- **Politeness**: per-provider token-bucket rate limiting, retry with
  exponential backoff, identified User-Agent.
- **Test suite**: 99 tests including an MCP compliance suite driven through
  the official SDK client and fixture-based provider tests (no network).

[0.1.0]: https://github.com/ahmedvnabil/humanitarian-mcp/releases/tag/v0.1.0
