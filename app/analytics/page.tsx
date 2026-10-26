import Link from 'next/link';
import { getAnalytics } from '@/lib/data';
import { addDays, fmtDate, todayManila } from '@/lib/dates';
import { compactPesos, pct, UNIT_NAMES, UNIT_SLUGS } from '@/lib/analytics';
import { php } from '@/lib/money';
import { ChartCard } from '@/lib/charts/chart-card';
import { StackedBars } from '@/lib/charts/stacked-bars';
import { HBars } from '@/lib/charts/hbars';
import { SmallMultiples } from '@/lib/charts/small-multiples';
import { Heatmap } from '@/lib/charts/heatmap';
import { StatTile } from '@/lib/charts/stat-tile';

export const dynamic = 'force-dynamic';

const RANGES = [7, 30, 90] as const;
const STAGE_LABEL: Record<string, string> = { inquiry: 'Inquiry', site_visit: 'Site visit', proposal_sent: 'Proposal sent', booked: 'Booked' };
const FUNNEL_RAMP = ['var(--seq-300)', 'var(--seq-400)', 'var(--seq-500)', 'var(--seq-600)'];

function unitColor(slug: string): string {
  const i = UNIT_SLUGS.indexOf(slug as (typeof UNIT_SLUGS)[number]);
  return i >= 0 ? `var(--series-${i + 1})` : 'var(--series-muted)';
}

export default function AnalyticsPage({ searchParams }: { searchParams: { range?: string } }) {
  const today = todayManila();
  const range = (RANGES as readonly number[]).includes(Number(searchParams.range)) ? Number(searchParams.range) : 30;
  const from = addDays(today, -(range - 1));
  const a = getAnalytics(from, today);
  const prev = getAnalytics(addDays(from, -range), addDays(from, -1));

  const revenue = a.daily.totals.reduce((s, v) => s + v, 0);
  const prevRevenue = prev.daily.totals.reduce((s, v) => s + v, 0);
  const change = prevRevenue > 0 ? (revenue - prevRevenue) / prevRevenue : null;

  // The commissary is a cost centre with no revenue of its own, so it has no row in revenue charts.
  const revenueUnits = UNIT_SLUGS.filter((s) => s !== 'commissary');
  const series = revenueUnits.map((slug) => ({ key: slug, name: UNIT_NAMES[slug], color: unitColor(slug), values: a.daily.series[slug] ?? [] }));
  const mix = a.mix.filter((m) => m.slug !== 'commissary');
  const legend = series.map((s) => ({ name: s.name, color: s.color }));
  const dailyTable = { columns: ['Day', ...series.map((s) => s.name), 'Total'], rows: a.daily.dates.map((d, i) => [fmtDate(d), ...series.map((s) => php(s.values[i] ?? 0)), php(a.daily.totals[i])]) };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>
            {fmtDate(from)} to {fmtDate(today)} · compared with the {range} days before
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 p-0.5 text-xs" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <Link key={r} href={`/analytics?range=${r}`} aria-current={r === range ? 'true' : undefined} className={`rounded-md px-3 py-1 ${r === range ? 'bg-white/10 text-zinc-100' : 'text-zinc-400 hover:text-zinc-100'}`}>
              Last {r} days
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          hero
          label={`Revenue, last ${range} days`}
          value={compactPesos(revenue)}
          delta={change === null ? undefined : { text: `${change >= 0 ? '+' : ''}${(change * 100).toFixed(0)}%`, good: change >= 0 }}
          hint={change === null ? 'no earlier period to compare' : `vs ${compactPesos(prevRevenue)} before`}
          spark={a.daily.totals}
        />
        <StatTile label="Venue occupancy" value={pct(a.occupancy.rate)} hint={`${a.occupancy.booked} of ${a.occupancy.available} days had an event`} />
        <StatTile label="Repeat business" value={pct(a.repeat.repeatShare)} hint={`${a.repeat.repeatCustomers} of ${a.repeat.totalCustomers} customers booked more than once`} spark={a.repeatTrend.values} sparkColor="var(--series-1)" />
        <StatTile label="Falling due, next 30 days" value={compactPesos(a.payments.due)} hint={`${compactPesos(a.payments.collected)} collected in this range`} />
      </div>

      <ChartCard title="Revenue by day" subtitle="Each column is one day; one segment per business (the commissary is a cost centre, so it has no revenue segment)" legend={legend} table={dailyTable}>
        <StackedBars dates={a.daily.dates} series={series} kind="pesos" />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Revenue mix" subtitle="Share of revenue by business in this range" table={{ columns: ['Business', 'Revenue', 'Share'], rows: mix.map((m) => [UNIT_NAMES[m.slug] ?? m.slug, php(m.amount), pct(m.share, 1)]) }}>
          <HBars kind="percent" max={1} rows={mix.map((m) => ({ label: UNIT_NAMES[m.slug] ?? m.slug, value: m.share, color: unitColor(m.slug), display: `${pct(m.share)} · ${compactPesos(m.amount)}` }))} />
        </ChartCard>
        <ChartCard title="Top packages" subtitle="By booked revenue of events in this range" table={{ columns: ['Package', 'Revenue', 'Bookings'], rows: a.topPackages.map((p) => [p.name, php(p.revenue), p.bookings]) }}>
          <HBars kind="pesos" rows={a.topPackages.map((p) => ({ label: p.name, value: p.revenue, sub: `${p.bookings} booking${p.bookings === 1 ? '' : 's'}` }))} emptyText="No events in this range." />
        </ChartCard>
      </div>

      <ChartCard title="Revenue by business over time" subtitle="Same scale on every panel, so the sizes compare honestly" legend={legend.map((l) => ({ ...l, kind: 'line' as const }))} table={dailyTable}>
        <SmallMultiples dates={a.daily.dates} series={series} kind="pesos" />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Court utilisation"
          subtitle={`Share of days each hour was booked, per court, over ${a.courts.days} days`}
          table={{ columns: ['Court', ...a.courts.hours.map((h) => `${h}:00`)], rows: a.courts.grid.map((row, i) => [`Court ${i + 1}`, ...row.map((v) => pct(v))]) }}
        >
          <Heatmap rows={a.courts.grid.map((_, i) => `Court ${i + 1}`)} cols={a.courts.hours.map((h) => `${h}:00`)} grid={a.courts.grid} />
        </ChartCard>
        <ChartCard title="Inquiry pipeline" subtitle="How many inquiries reached each stage" table={{ columns: ['Stage', 'Reached', 'From previous'], rows: a.funnel.map((f) => [STAGE_LABEL[f.stage], f.count, pct(f.conversion)]) }}>
          <HBars kind="count" rows={a.funnel.map((f, i) => ({ label: STAGE_LABEL[f.stage], value: f.count, color: FUNNEL_RAMP[i], sub: f.conversion === null ? undefined : `${pct(f.conversion)} of previous` }))} emptyText="No inquiries yet." />
        </ChartCard>
      </div>

      <ChartCard title="Labor cost as a share of revenue" subtitle="Assigned shift hours times hourly rate, over each business's revenue in this range" table={{ columns: ['Business', 'Labor', 'Revenue', 'Share'], rows: a.labor.map((l) => [UNIT_NAMES[l.slug], php(l.labor), php(l.revenue), pct(l.share)]) }}>
        <HBars kind="percent" max={Math.max(0.5, ...a.labor.map((l) => l.share ?? 0))} rows={a.labor.filter((l) => l.share !== null).map((l) => ({ label: UNIT_NAMES[l.slug], value: l.share ?? 0, sub: `${compactPesos(l.labor)} of ${compactPesos(l.revenue)}` }))} emptyText="No revenue in this range." />
      </ChartCard>
    </div>
  );
}
