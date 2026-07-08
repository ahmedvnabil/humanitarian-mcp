/** Markdown table rendering for tool text output. */

export function markdownTable(
  headers: readonly string[],
  rows: readonly (readonly (string | number | null | undefined)[])[],
): string {
  if (rows.length === 0) return '_No data._';
  const head = `| ${headers.join(' | ')} |`;
  const divider = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.map(formatCell).join(' | ')} |`);
  return [head, divider, ...body].join('\n');
}

export function formatCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return formatNumber(value);
  return value.replace(/\|/g, '\\|');
}

/** Human-readable integer formatting (12,345,678). */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return Number.isInteger(value)
    ? value.toLocaleString('en-US')
    : value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
