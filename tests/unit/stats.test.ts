import { describe, expect, it } from 'vitest';
import {
  cagr,
  detectAnomalies,
  forecastLinear,
  linearRegression,
  yearOverYear,
} from '../../src/shared/stats.js';

describe('linearRegression', () => {
  it('fits a perfect line exactly', () => {
    const points = [2020, 2021, 2022, 2023].map((year) => ({ year, value: (year - 2020) * 100 }));
    const { slope, intercept, r2 } = linearRegression(points);
    expect(slope).toBeCloseTo(100);
    expect(intercept).toBeCloseTo(-202000);
    expect(r2).toBeCloseTo(1);
  });

  it('degrades gracefully below two points', () => {
    expect(linearRegression([])).toEqual({ slope: 0, intercept: 0, r2: 0 });
    expect(linearRegression([{ year: 2020, value: 5 }])).toEqual({ slope: 0, intercept: 5, r2: 0 });
  });

  it('r2 is 1 for a constant series (ssYY = 0)', () => {
    const points = [2020, 2021, 2022].map((year) => ({ year, value: 7 }));
    expect(linearRegression(points).r2).toBe(1);
  });
});

describe('forecastLinear', () => {
  it('projects the trend forward and floors at zero', () => {
    const rising = [2021, 2022, 2023].map((year) => ({ year, value: (year - 2020) * 10 }));
    expect(forecastLinear(rising, 2)).toEqual([
      { year: 2024, value: 40 },
      { year: 2025, value: 50 },
    ]);

    const falling = [2021, 2022, 2023].map((year) => ({ year, value: 30 - (year - 2020) * 10 }));
    const projected = forecastLinear(falling, 3);
    expect(projected.at(-1)).toEqual({ year: 2026, value: 0 });
  });

  it('returns nothing without history or horizon', () => {
    expect(forecastLinear([], 3)).toEqual([]);
    expect(forecastLinear([{ year: 2020, value: 1 }], 0)).toEqual([]);
  });
});

describe('yearOverYear', () => {
  it('computes deltas and percentages, sorting by year first', () => {
    const changes = yearOverYear([
      { year: 2022, value: 150 },
      { year: 2021, value: 100 },
      { year: 2023, value: 75 },
    ]);
    expect(changes).toEqual([
      { year: 2022, value: 150, change: 50, changePct: 50 },
      { year: 2023, value: 75, change: -75, changePct: -50 },
    ]);
  });

  it('reports null percentage when the previous value is zero', () => {
    const [change] = yearOverYear([
      { year: 2021, value: 0 },
      { year: 2022, value: 10 },
    ]);
    expect(change!.changePct).toBeNull();
  });
});

describe('detectAnomalies', () => {
  it('flags a spike that breaks a steady pattern', () => {
    const steady = [2015, 2016, 2017, 2018, 2019, 2020].map((year) => ({
      year,
      value: 1000 + (year - 2015) * 10,
    }));
    const withSpike = [...steady, { year: 2021, value: 5000 }];
    const anomalies = detectAnomalies(withSpike);
    expect(anomalies.map((a) => a.year)).toEqual([2021]);
    expect(anomalies[0]!.zScore).toBeGreaterThan(2);
  });

  it('returns nothing for short or flat series', () => {
    expect(detectAnomalies([{ year: 2020, value: 1 }])).toEqual([]);
    const flat = [2019, 2020, 2021, 2022].map((year) => ({ year, value: 100 }));
    expect(detectAnomalies(flat)).toEqual([]);
  });
});

describe('cagr', () => {
  it('computes compound annual growth', () => {
    const doubled = [
      { year: 2020, value: 100 },
      { year: 2022, value: 400 },
    ];
    expect(cagr(doubled)).toBeCloseTo(100);
  });

  it('is null when undefined (zero start, single year)', () => {
    expect(
      cagr([
        { year: 2020, value: 0 },
        { year: 2021, value: 10 },
      ]),
    ).toBeNull();
    expect(cagr([{ year: 2020, value: 10 }])).toBeNull();
  });
});
