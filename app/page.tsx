import Link from 'next/link';
import { getOverview } from '@/lib/data';
import { todayManila, fmtDate } from '@/lib/dates';
import { Badge, Empty, Stat, php } from '@/lib/ui';
import { ApprovalButtons } from '@/app/approval-buttons';

export const dynamic = 'force-dynamic';

export default function Page() {
  const today = todayManila();
  const o = getOverview(today);
  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Group overview</h1>
        <div className="text-sm text-zinc-400">{fmtDate(today)}</div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Revenue today" value={php(o.totals.revenueToday)} />
        <Stat label="Revenue month to date" value={php(o.totals.revenueMtd)} />
        <Stat label="Bookings this week" value={o.totals.bookingsThisWeek} />
        <Stat label="Staff on shift today" value={o.totals.staffOnShift} />
        <Stat label="Collected vs due this month" value={php(o.totals.collectedMtd)} hint={`${php(o.totals.dueMtd)} falls due this month`} />
      </div>

      <section>
        <h2 className="h">Businesses</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {o.units.map((u) => (
            <Link
              key={u.slug}
              href={u.slug === 'events' ? '/events' : `/schedule?unit=${u.slug}`}
              className="card block transition hover:border-white/30"
              data-unit-card
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{u.name}</span>
                {u.alert ? <Badge tone="warn">attention</Badge> : <Badge tone="ok">ok</Badge>}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                <div>
                  <div className="text-base text-zinc-100 tabular-nums">{php(u.revenueToday)}</div>
                  revenue today
                </div>
                <div>
                  <div className="text-base text-zinc-100 tabular-nums">{u.activityCount}</div>
                  {u.activityLabel}
                </div>
              </div>
              {u.alert && <div className="mt-3 text-xs text-amber-300">{u.alert}</div>}
            </Link>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="h">Needs your decision</h2>
        {o.approvals.length ? (
          <div className="divide-y divide-white/5">
            {o.approvals.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm" data-approval-row>
                <div>
                  <span>{a.kind}</span>
                  <span className="text-zinc-500">
                    {' '}
                    · {a.unitName} · {php(a.amount)} · asked by {a.requestedBy}
                  </span>
                </div>
                <ApprovalButtons id={a.id} />
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
