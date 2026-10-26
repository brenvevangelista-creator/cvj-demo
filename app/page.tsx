import Link from 'next/link';
import { getAnalytics, getOverview } from '@/lib/data';
import { addDays, fmtDate, todayManila } from '@/lib/dates';
import { compactPesos, pct, UNIT_NAMES, UNIT_SLUGS } from '@/lib/analytics';
import { php } from '@/lib/money';
import { Badge, Empty } from '@/lib/ui';
import { StatTile } from '@/lib/charts/stat-tile';
import { ChartCard } from '@/lib/charts/chart-card';
import { StackedBars } from '@/lib/charts/stacked-bars';
import { HBars } from '@/lib/charts/hbars';
import { ApprovalButtons } from '@/app/approval-buttons';

export const dynamic = 'force-dynamic';

function unitColor(slug: string): string {
  const i = UNIT_SLUGS.indexOf(slug as (typeof UNIT_SLUGS)[number]);
  return i >= 0 ? `var(--series-${i + 1})` : 'var(--series-muted)';
}

export default function Page() {
  const today = todayManila();
  const o = getOverview(today);
  const a = getAnalytics(addDays(today, -29), today);
  const prev = getAnalytics(addDays(today, -59), addDays(today, -30));
  const rev30 = a.daily.totals.reduce((s, v) => s + v, 0);
  const prev30 = prev.daily.totals.reduce((s, v) => s + v, 0);
  const change = prev30 > 0 ? (rev30 - prev30) / prev30 : null;
  const series = UNIT_SLUGS.filter((s) => s !== 'commissary').map((slug) => ({ key: slug, name: UNIT_NAMES[slug], color: unitColor(slug), values: a.daily.series[slug] ?? [] }));
  const mix = a.mix.filter((m) => m.slug !== 'commissary');

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Group overview</h1>
        <div className="text-sm" style={{ color: 'var(--ink-muted)' }}>{fmtDate(today)}</div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Revenue today" value={compactPesos(o.totals.revenueToday)} hint="all six businesses" />
        <StatTile
          label="Revenue, last 30 days"
          value={compactPesos(rev30)}
          delta={change === null ? undefined : { text: `${change >= 0 ? '+' : ''}${(change * 100).toFixed(0)}%`, good: change >= 0 }}
          hint="vs the 30 days before"
          spark={a.daily.totals}
        />
        <StatTile label="Bookings this week" value={o.totals.bookingsThisWeek} hint="confirmed events" />
        <StatTile label="Staff on shift today" value={o.totals.staffOnShift} hint={`${pct(a.occupancy.rate)} venue occupancy, 30 days`} />
        <StatTile label="Collected this month" value={compactPesos(o.totals.collectedMtd)} hint={`${compactPesos(o.totals.dueMtd)} falls due this month`} />
      </div>

      <section>
        <h2 className="h">Businesses</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {o.units.map((u) => (
            <Link key={u.slug} href={u.slug === 'events' ? '/events' : `/schedule?unit=${u.slug}`} className="card block transition hover:border-white/30" data-unit-card>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium">
                  <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: unitColor(u.slug) }} />
                  {u.name}
                </span>
                {u.alert ? <Badge tone="warn">attention</Badge> : <Badge tone="ok">ok</Badge>}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs" style={{ color: 'var(--ink-muted)' }}>
                <div>
                  <div className="text-base" style={{ color: 'var(--ink-primary)' }}>{php(u.revenueToday)}</div>
                  revenue today
                </div>
                <div>
                  <div className="text-base" style={{ color: 'var(--ink-primary)' }}>{u.activityCount}</div>
                  {u.activityLabel}
                </div>
              </div>
              {u.alert && <div className="mt-3 text-xs text-amber-300">{u.alert}</div>}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <ChartCard className="lg:col-span-3" title="Revenue, last 30 days" subtitle="Each column is one day; one segment per business (the commissary is a cost centre, so it has no revenue segment)" legend={series.map((s) => ({ name: s.name, color: s.color }))} table={{ columns: ['Day', ...series.map((s) => s.name), 'Total'], rows: a.daily.dates.map((d, i) => [fmtDate(d), ...series.map((s) => php(s.values[i] ?? 0)), php(a.daily.totals[i])]) }}>
          <StackedBars dates={a.daily.dates} series={series} kind="pesos" height={200} />
        </ChartCard>
        <ChartCard className="lg:col-span-2" title="Revenue mix, last 30 days" subtitle="Share by business" table={{ columns: ['Business', 'Revenue', 'Share'], rows: mix.map((m) => [UNIT_NAMES[m.slug] ?? m.slug, php(m.amount), pct(m.share, 1)]) }}>
          <HBars kind="percent" max={1} rows={mix.map((m) => ({ label: UNIT_NAMES[m.slug] ?? m.slug, value: m.share, color: unitColor(m.slug), display: pct(m.share) }))} />
        </ChartCard>
      </div>

      <section className="card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="h mb-0">Needs your decision</h2>
          <Link href="/analytics" className="text-xs text-zinc-400 hover:text-zinc-100">Open analytics →</Link>
        </div>
        {o.approvals.length ? (
          <div className="divide-y divide-white/5">
            {o.approvals.map((ap) => (
              <div key={ap.id} className="flex items-center justify-between gap-3 py-2 text-sm" data-approval-row>
                <div>
                  <span>{ap.kind}</span>
                  <span className="text-zinc-500"> · {ap.unitName} · {php(ap.amount)} · asked by {ap.requestedBy}</span>
                </div>
                <ApprovalButtons id={ap.id} />
              </div>
            ))}
          </div>
        ) : (
          <Empty text="Nothing waiting on you." />
        )}
      </section>
    </div>
  );
}
