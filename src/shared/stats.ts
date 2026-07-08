/**
 * Small, dependency-free statistics helpers behind the trend, forecast and
 * anomaly tools. All functions are pure.
 */

export interface YearValue {
  year: number;
  value: number;
}

export interface Regression {
  slope: number;
  intercept: number;
  /** Coefficient of determination, 0..1 (0 when undefined, e.g. < 2 points). */
  r2: number;
}

export function linearRegression(points: readonly YearValue[]): Regression {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.value ?? 0, r2: 0 };

  const meanX = points.reduce((s, p) => s + p.year, 0) / n;
  const meanY = points.reduce((s, p) => s + p.value, 0) / n;

  let ssXY = 0;
  let ssXX = 0;
  let ssYY = 0;
  for (const p of points) {
    ssXY += (p.year - meanX) * (p.value - meanY);
    ssXX += (p.year - meanX) ** 2;
    ssYY += (p.value - meanY) ** 2;
  }
  if (ssXX === 0) return { slope: 0, intercept: meanY, r2: 0 };

  const slope = ssXY / ssXX;
  const intercept = meanY - slope * meanX;
  const r2 = ssYY === 0 ? 1 : (ssXY * ssXY) / (ssXX * ssYY);
  return { slope, intercept, r2 };
}

/** Naive linear projection. Values are floored at zero (populations). */
export function forecastLinear(points: readonly YearValue[], yearsAhead: number): YearValue[] {
  if (points.length === 0 || yearsAhead <= 0) return [];
  const { slope, intercept } = linearRegression(points);
  const lastYear = Math.max(...points.map((p) => p.year));
  const projected: YearValue[] = [];
  for (let i = 1; i <= yearsAhead; i++) {
    const year = lastYear + i;
    projected.push({ year, value: Math.max(0, Math.round(slope * year + intercept)) });
  }
  return projected;
}

export interface YearChange {
  year: number;
  value: number;
  change: number;
  /** Percent change vs the previous year; null when the previous value is 0. */
  changePct: number | null;
}

/** Year-over-year deltas for a series sorted by year. */
export function yearOverYear(points: readonly YearValue[]): YearChange[] {
  const sorted = [...points].sort((a, b) => a.year - b.year);
  const changes: YearChange[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    changes.push({
      year: curr.year,
      value: curr.value,
      change: curr.value - prev.value,
      changePct: prev.value === 0 ? null : ((curr.value - prev.value) / prev.value) * 100,
    });
  }
  return changes;
}

export interface Anomaly extends YearChange {
  /** How many standard deviations this year's change sits from the mean change. */
  zScore: number;
}

/**
 * Flag years whose year-over-year change deviates more than `threshold`
 * standard deviations from the series' mean change.
 */
export function detectAnomalies(points: readonly YearValue[], threshold = 2): Anomaly[] {
  const changes = yearOverYear(points);
  if (changes.length < 3) return [];

  const mean = changes.reduce((s, c) => s + c.change, 0) / changes.length;
  const variance = changes.reduce((s, c) => s + (c.change - mean) ** 2, 0) / changes.length;
  const stddev = Math.sqrt(variance);
  if (stddev === 0) return [];

  return changes
    .map((c) => ({ ...c, zScore: (c.change - mean) / stddev }))
    .filter((c) => Math.abs(c.zScore) >= threshold);
}

/** Compound annual growth rate (%), null when undefined for the series. */
export function cagr(points: readonly YearValue[]): number | null {
  const sorted = [...points].sort((a, b) => a.year - b.year);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last || first.year === last.year || first.value <= 0 || last.value <= 0) {
    return null;
  }
  const years = last.year - first.year;
  return ((last.value / first.value) ** (1 / years) - 1) * 100;
}
