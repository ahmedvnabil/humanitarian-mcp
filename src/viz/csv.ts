/** RFC 4180-compliant CSV serialization. */

function escapeField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(headers: readonly string[], rows: readonly (readonly unknown[])[]): string {
  const lines = [headers.map(escapeField).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeField).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

/** CSV from homogeneous objects; column order taken from the first object. */
export function objectsToCsv(objects: readonly Record<string, unknown>[]): string {
  if (objects.length === 0) return '';
  const first = objects[0]!;
  const headers = Object.keys(first);
  return toCsv(
    headers,
    objects.map((obj) => headers.map((h) => obj[h])),
  );
}
