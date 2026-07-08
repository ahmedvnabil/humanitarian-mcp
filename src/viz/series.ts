/** Common shape all chart generators consume. */

export interface Series {
  label: string;
  points: { x: number | string; y: number }[];
}

export type ChartKind = 'line' | 'bar';

export interface ChartSpecInput {
  title: string;
  kind: ChartKind;
  xLabel: string;
  yLabel: string;
  series: Series[];
}
