import { centroid } from '../shared/geo.js';
import type { NormalizedRecord } from '../providers/types.js';

/**
 * Build a GeoJSON FeatureCollection of country-centroid points from
 * normalized records. Countries without a known centroid are listed in
 * `skipped` so callers can disclose gaps instead of hiding them.
 */
export function toGeoJson(records: readonly NormalizedRecord[]): {
  featureCollection: Record<string, unknown>;
  skipped: string[];
} {
  const features: Record<string, unknown>[] = [];
  const skipped: string[] = [];

  for (const record of records) {
    const point = record.country_code ? centroid(record.country_code) : undefined;
    if (!point) {
      skipped.push(record.country || record.country_code || 'unknown');
      continue;
    }
    const [lat, lon] = point;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: {
        country: record.country,
        country_code: record.country_code,
        year: record.year,
        population: record.population,
        dataset: record.dataset,
        source: record.source,
        ...record.metrics,
      },
    });
  }

  return {
    featureCollection: { type: 'FeatureCollection', features },
    skipped,
  };
}
