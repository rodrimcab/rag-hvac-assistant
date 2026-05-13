/**
 * Parse datetimes from the API as an absolute instant, then format with `Intl` in the
 * **system** timezone (default `Intl` behaviour).
 *
 * ISO strings **without** a zone (common with SQLite) are treated as **UTC**, not local,
 * so they match what the backend stores and do not jump when optimistic messages are replaced.
 */
export function parseBackendDateTime(iso: string): Date {
  const s = iso.trim();
  if (!s) return new Date(NaN);

  if (/[zZ]$|[+-]\d{2}:\d{2}$|[+-]\d{2}\d{2}$/.test(s)) {
    return new Date(s);
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
    return new Date(`${s}Z`);
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
    return new Date(`${s.replace(" ", "T")}Z`);
  }

  return new Date(s);
}
