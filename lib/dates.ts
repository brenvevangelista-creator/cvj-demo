// Date helpers. All dates are 'YYYY-MM-DD' strings and times 'HH:MM'.
// Arithmetic is done in UTC on the string so no local time zone leaks in.

const MANILA = 'Asia/Manila';

/** Today's date in Asia/Manila as YYYY-MM-DD. */
export function todayManila(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function toUtc(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Add n days (negative allowed) to a YYYY-MM-DD date. */
export function addDays(date: string, n: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtc(d);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);
}

/** True when two HH:MM ranges intersect. Touching ends do not overlap. */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Every date of a month given as YYYY-MM. */
export function monthDays(yyyyMm: string): string[] {
  const [y, m] = yyyyMm.split('-').map(Number);
  const out: string[] = [];
  const d = new Date(Date.UTC(y, m - 1, 1));
  while (d.getUTCMonth() === m - 1) {
    out.push(fromUtc(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** '2026-11-14' -> '14 Nov 2026'. */
export function fmtDate(date: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(toUtc(date));
}

/** 'YYYY-MM' of a date. */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** Weekday index 0 = Sunday for a YYYY-MM-DD date. */
export function weekday(date: string): number {
  return toUtc(date).getUTCDay();
}
