/**
 * Display helpers shared by the polished screens. Pure: the spec pins every output.
 */

/** `5GEExMC7…otumfdB` — head and tail kept, the middle elided; a `sha256:` prefix is kept whole. */
export function middle(value: string | null | undefined, head = 8, tail = 8): string {
  if (!value) return '—';
  const prefix = value.startsWith('sha256:') ? 'sha256:' : '';
  const body = value.slice(prefix.length);
  if (body.length <= head + tail + 1) return value;
  return `${prefix}${body.slice(0, head)}…${body.slice(-tail)}`;
}

/** The visitor's own clock: `Oct 3, 2026, 6:25:16 PM GMT-3`. `—` for anything that is not a date. */
export function localDateTime(iso: string | number | null | undefined, locale?: string): string {
  if (iso === null || iso === undefined || iso === '') return '—';
  const d = typeof iso === 'number' ? new Date(iso) : new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  }).format(d);
}

/** Exact UTC, for the tooltip next to a local time: `2026-10-03 21:25:16 UTC`. */
export function utcStamp(iso: string | number | null | undefined): string {
  if (iso === null || iso === undefined || iso === '') return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC').replace(/Z$/, ' UTC');
}

/** Slot with thin grouping: `507,246,166`. */
export function slotLabel(slot: number | null | undefined): string {
  return typeof slot === 'number' && Number.isFinite(slot) ? slot.toLocaleString('en-US') : '—';
}

/** true when the visitor asked the OS for less motion (always false outside a browser). */
export function prefersReducedMotion(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
