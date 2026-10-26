// Pure aggregates for the analytics page and the overview charts. No database access.
import { addDays, monthOf } from '@/lib/dates';

/** Business units in fixed palette order: slot N of the chart palette belongs to UNIT_SLUGS[N-1]. */
export const UNIT_SLUGS = ['events', 'catering', 'cafe', 'commissary', 'parking', 'pickleball'] as const;
export type UnitSlug = (typeof UNIT_SLUGS)[number];

export const UNIT_NAMES: Record<string, string> = {
  events: 'Events Place',
  catering: 'Catering',
  cafe: 'Cafe',
  commissary: 'Commissary',
  parking: 'Parking',
  pickleball: 'Pickleball',
};

export interface DailyRow {
  date: string;
  unitSlug: string;
  amount: number;
}

export interface DailySeries {
  dates: string[];
  series: Record<string, number[]>;
  totals: number[];
  max: number;
}

function daysBetweenInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  if (from > to) return out;
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** One value per day per unit over the range, zeros filled in; totals across units. */
export function dailySeries(rows: DailyRow[], from: string, to: string): DailySeries {
  const dates = daysBetweenInclusive(from, to);
  const index = new Map(dates.map((d, i) => [d, i]));
  const series: Record<string, number[]> = {};
  for (const slug of UNIT_SLUGS) series[slug] = dates.map(() => 0);
  for (const r of rows) {
    const i = index.get(r.date);
    if (i === undefined) continue;
    (series[r.unitSlug] ??= dates.map(() => 0))[i] += r.amount;
  }
  const totals = dates.map((_, i) => Object.values(series).reduce((s, arr) => s + arr[i], 0));
  return { dates, series, totals, max: totals.length ? Math.max(...totals) : 0 };
}

export interface MixRow {
  slug: string;
  amount: number;
  share: number;
}

/** Part-to-whole by unit, largest first; shares sum to one (or all zero). */
export function revenueMix(totals: Record<string, number>): MixRow[] {
  const slugs = [...new Set([...UNIT_SLUGS, ...Object.keys(totals)])];
  const sum = slugs.reduce((s, k) => s + (totals[k] ?? 0), 0);
  return slugs
    .map((slug) => ({ slug, amount: totals[slug] ?? 0, share: sum > 0 ? (totals[slug] ?? 0) / sum : 0 }))
    .sort((a, b) => b.amount - a.amount || UNIT_SLUGS.indexOf(a.slug as UnitSlug) - UNIT_SLUGS.indexOf(b.slug as UnitSlug));
}

/** Distinct days with at least one event over the days in range. */
export function occupancy(eventDates: string[], from: string, to: string): { booked: number; available: number; rate: number } {
  const days = daysBetweenInclusive(from, to);
  if (!days.length) return { booked: 0, available: 0, rate: 0 };
  const booked = new Set(eventDates.filter((d) => d >= from && d <= to)).size;
  return { booked, available: days.length, rate: booked / days.length };
}

/** Rate of booked slots per court (rows) per hour (columns) over `days` days. */
export function utilisationGrid(rows: { court: number; hour: number }[], courts: number, hours: number[], days: number): number[][] {
  const hourIndex = new Map(hours.map((h, i) => [h, i]));
  const grid = Array.from({ length: courts }, () => hours.map(() => 0));
  if (days <= 0) return grid;
  for (const r of rows) {
    const hi = hourIndex.get(r.hour);
    if (hi === undefined || r.court < 1 || r.court > courts) continue;
    grid[r.court - 1][hi] += 1 / days;
  }
  return grid.map((row) => row.map((v) => Math.min(1, Math.round(v * 1000) / 1000)));
}

export const FUNNEL_STAGES = ['inquiry', 'site_visit', 'proposal_sent', 'booked'] as const;
const STAGE_RANK: Record<string, number> = { inquiry: 0, site_visit: 1, proposal_sent: 2, booked: 3, done: 3, lost: 0 };

export interface FunnelRow {
  stage: (typeof FUNNEL_STAGES)[number];
  count: number;
  conversion: number | null;
}

/** How many inquiries reached each stage; conversion is relative to the previous stage. */
export function pipelineFunnel(inquiries: { stage: string }[]): FunnelRow[] {
  const ranks = inquiries.map((i) => STAGE_RANK[i.stage] ?? 0);
  const counts = FUNNEL_STAGES.map((_, i) => ranks.filter((r) => r >= i).length);
  return FUNNEL_STAGES.map((stage, i) => ({
    stage,
    count: counts[i],
    conversion: i === 0 || counts[i - 1] === 0 ? null : counts[i] / counts[i - 1],
  }));
}

/** Labor cost as a share of revenue per unit; null where there is no revenue. */
export function laborShare(labor: Record<string, number>, revenue: Record<string, number>): { slug: string; labor: number; revenue: number; share: number | null }[] {
  return UNIT_SLUGS.map((slug) => {
    const l = labor[slug] ?? 0;
    const r = revenue[slug] ?? 0;
    return { slug, labor: l, revenue: r, share: r > 0 ? l / r : null };
  });
}

/**
 * Repeat business: how many customers booked more than once, and the share of all
 * bookings that came from those repeat customers.
 */
export function repeatRate(bookings: { customerId: number }[]): { repeatCustomers: number; totalCustomers: number; repeatShare: number } {
  const counts = new Map<number, number>();
  for (const b of bookings) counts.set(b.customerId, (counts.get(b.customerId) ?? 0) + 1);
  const totalCustomers = counts.size;
  const repeatCounts = [...counts.values()].filter((n) => n > 1);
  const repeatBookings = repeatCounts.reduce((s, n) => s + n, 0);
  return {
    repeatCustomers: repeatCounts.length,
    totalCustomers,
    repeatShare: bookings.length ? repeatBookings / bookings.length : 0,
  };
}

/** Per month, the share of that month's bookings whose customer had booked before. */
export function repeatByMonth(bookings: { customerId: number; date: string }[], months: string[]): number[] {
  const sorted = [...bookings].sort((a, b) => a.date.localeCompare(b.date));
  const seen = new Set<number>();
  const perMonth = new Map<string, { total: number; repeat: number }>();
  for (const b of sorted) {
    const m = monthOf(b.date);
    const cur = perMonth.get(m) ?? { total: 0, repeat: 0 };
    cur.total++;
    if (seen.has(b.customerId)) cur.repeat++;
    perMonth.set(m, cur);
    seen.add(b.customerId);
  }
  return months.map((m) => {
    const x = perMonth.get(m);
    return x && x.total ? x.repeat / x.total : 0;
  });
}

/** Round a maximum up to a clean axis ceiling (1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10 × 10^n). */
export function niceMax(x: number): number {
  if (!(x > 0)) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(x)));
  const norm = x / mag;
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const step = steps.find((s) => s >= norm - 1e-9) ?? 10;
  return step * mag;
}

const trim = (n: number, digits: number) => n.toFixed(digits).replace(/\.?0+$/, '');

/** Centavos -> '₱1.66M', '₱12.5K', '₱950'. For axis ticks and compact tiles. */
export function compactPesos(centavos: number): string {
  const pesos = centavos / 100;
  const abs = Math.abs(pesos);
  const sign = pesos < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}₱${trim(abs / 1_000_000, 2)}M`;
  if (abs >= 1_000) return `${sign}₱${trim(abs / 1_000, 1)}K`;
  return `${sign}₱${Math.round(abs)}`;
}

/** 0.234 -> '23%'. */
export function pct(share: number | null, digits = 0): string {
  return share === null ? '—' : `${(share * 100).toFixed(digits)}%`;
}
