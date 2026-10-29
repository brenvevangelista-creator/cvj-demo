import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBooking } from '@/lib/data';
import { fmtDate, todayManila } from '@/lib/dates';
import { roleCount } from '@/lib/labels';
import { Badge, Empty, STATUS_TONE, php } from '@/lib/ui';

export const dynamic = 'force-dynamic';

export default function BookingPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const d = Number.isInteger(id) ? getBooking(id) : null;
  if (!d) notFound();
  const today = todayManila();

  // Manpower: group shifts by role.
  const roles = new Map<string, { total: number; assigned: string[] }>();
  for (const s of d.shifts) {
    const r = roles.get(s.role) ?? { total: 0, assigned: [] };
    r.total++;
    if (s.staff) r.assigned.push(s.staff);
    roles.set(s.role, r);
  }
  const prodByDate = new Map<string, typeof d.productionLines>();
  for (const p of d.productionLines) prodByDate.set(p.productionDate, [...(prodByDate.get(p.productionDate) ?? []), p]);

  // Paid flag per invoice: payments are applied to invoices in order.
  let remaining = d.collected;
  const invoices = d.invoices.map((inv) => {
    const paid = remaining >= inv.amount;
    remaining = Math.max(0, remaining - inv.amount);
    return { ...inv, paid, overdue: !paid && inv.dueDate < today && d.status === 'confirmed' };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-zinc-500">
            <Link href="/events" className="hover:underline">Events</Link> / booking #{d.id}
          </div>
          <h1 className="mt-1 text-xl font-semibold">{d.customer}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-300">
            <span>{fmtDate(d.date)}</span>
            <span className="text-zinc-500">·</span>
            <span>{d.startTime}–{d.endTime}</span>
            <span className="text-zinc-500">·</span>
            <span>{d.pax} pax</span>
            <span className="text-zinc-500">·</span>
            <span>{d.venueArea}</span>
            <span className="text-zinc-500">·</span>
            <span>{d.packageName}</span>
            <Badge tone={STATUS_TONE[d.status] ?? 'muted'}>{d.status}</Badge>
          </div>
          {d.notes && <div className="mt-2 text-sm text-zinc-400">{d.notes}</div>}
        </div>
        <Link href={`/events/${d.id}/edit`} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:border-white/40">
          Edit booking
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card" data-panel="job-sheet">
          <h2 className="h">Catering job sheet</h2>
          {d.jobSheet ? (
            <>
              <div className="mb-2 text-xs text-zinc-400">
                {d.jobSheet.serviceStyle} · {d.jobSheet.inSite ? 'in-site' : 'off-site'} · {d.jobSheet.pax} pax
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-white/5">
                  {d.jobSheet.lines.map((l) => (
                    <tr key={l.name}>
                      <td className="py-1">{l.name}</td>
                      <td className="py-1 text-right tabular-nums">{l.qty} portions</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <Empty text="No job sheet: the booking is not confirmed." />
          )}
        </section>

        <section className="card" data-panel="production">
          <h2 className="h">Commissary production</h2>
          {prodByDate.size ? (
            [...prodByDate.entries()].map(([date, lines]) => (
              <div key={date} className="mb-3">
                <div className="mb-1 text-xs text-zinc-400">Produce on {fmtDate(date)}</div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-white/5">
                    {lines.map((p) => (
                      <tr key={p.ingredient}>
                        <td className="py-1">{p.ingredient}</td>
                        <td className="py-1 text-right tabular-nums">
                          {p.qty} {p.uom}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          ) : (
            <Empty text="Nothing to produce yet." />
          )}
        </section>

        <section className="card" data-panel="manpower">
          <h2 className="h">Manpower</h2>
          {roles.size ? (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-white/5">
                {[...roles.entries()].map(([role, r]) => {
                  const open = r.total - r.assigned.length;
                  return (
                    <tr key={role}>
                      <td className="py-1">
                        <span className="font-medium">{roleCount(r.total, role)}</span>
                        <span className="block text-xs text-zinc-500">{r.assigned.join(', ') || 'nobody assigned yet'}</span>
                      </td>
                      <td className="py-1 text-right align-top">{open > 0 ? <Badge tone="warn">{open} open</Badge> : <Badge tone="ok">staffed</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <Empty text="No shifts yet." />
          )}
        </section>

        <section className="card" data-panel="payments">
          <h2 className="h">Payments</h2>
          {invoices.length ? (
            <>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-white/5">
                  {invoices.map((inv) => (
                    <tr key={inv.id} data-invoice-row>
                      <td className="py-1">
                        {inv.label}
                        <span className="block text-xs text-zinc-500">due {fmtDate(inv.dueDate)}</span>
                      </td>
                      <td className="py-1 text-right tabular-nums">{php(inv.amount)}</td>
                      <td className="py-1 pl-2 text-right">
                        {inv.amount === 0 ? <Badge tone="muted">n/a</Badge> : inv.paid ? <Badge tone="ok">paid</Badge> : inv.overdue ? <Badge tone="warn">overdue</Badge> : <Badge tone="info">due</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-zinc-400">
                <div>
                  <div className="text-base text-zinc-100 tabular-nums">{php(d.total)}</div>total
                </div>
                <div>
                  <div className="text-base text-zinc-100 tabular-nums">{php(d.collected)}</div>collected
                </div>
                <div>
                  <div className="text-base text-zinc-100 tabular-nums">{php(d.balanceDue)}</div>balance
                </div>
              </div>
              {d.payments.length > 0 && (
                <div className="mt-3 text-xs text-zinc-500">
                  {d.payments.map((p) => `${php(p.amount)} on ${fmtDate(p.paidOn)} by ${p.method}`).join(' · ')}
                </div>
              )}
            </>
          ) : (
            <Empty text="No payment schedule: the booking is not confirmed." />
          )}
        </section>
      </div>
    </div>
  );
}
