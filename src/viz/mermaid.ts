import type { ChartSpecInput } from './series.js';

/**
 * Build a Mermaid `xychart-beta` block. Mermaid xy charts support a single
 * series per axis type, so multi-series input renders each series as its own
 * line/bar sequence (Mermaid stacks them in declaration order).
 */
export function toMermaid(input: ChartSpecInput): string {
  const labels = [...new Set(input.series.flatMap((s) => s.points.map((p) => p.x)))].sort();
  const lines: string[] = [
    '```mermaid',
    'xychart-beta',
    `    title "${escapeQuotes(input.title)}"`,
    `    x-axis "${escapeQuotes(input.xLabel)}" [${labels.join(', ')}]`,
    `    y-axis "${escapeQuotes(input.yLabel)}"`,
  ];
  for (const series of input.series) {
    const values = labels.map((x) => series.points.find((p) => p.x === x)?.y ?? 0);
    lines.push(`    ${input.kind} [${values.join(', ')}]`);
  }
  lines.push('```');
  return lines.join('\n');
}

function escapeQuotes(text: string): string {
  return text.replace(/"/g, "'");
}
