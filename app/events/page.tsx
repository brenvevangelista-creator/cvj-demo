import Link from 'next/link';
import { listBookings } from '@/lib/data';
import { fmtDate, monthOf, safeMonth, todayManila } from '@/lib/dates';
import { Badge, ButtonLink, Empty, STATUS_TONE, php } from '@/lib/ui';
import { MonthCalendar, type CalendarChip } from '@/app/events/calendar';

export const dynamic = 'force-dynamic';

export default function EventsPage({ searchParams }: { searchParams: { month?: string } }) {
  const today = todayManila();
  const month = safeMonth(searchParams.month, monthOf(today));
  const rows = listBookings(month);
  const chips: CalendarChip[] = rows.map((r) => ({
    id: r.id,
    date: r.date,
    label: `${r.startTime} ${r.customer}`,
    tone: STATUS_TONE[r.status] ?? 'muted',
    strike: r.status === 'cancelled',
    href: `/events/${r.id}`,
  }));
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Events Place</h1>
        <ButtonLink href="/events/new">New booking</ButtonLink>
      </div>
      <MonthCalendar month={month} chips={chips} today={today} basePath="/events" />
      <section className="card overflow-x-auto">
        <h2 className="h">Bookings this month</h2>
        {rows.length ? (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-zinc-500">
              <tr>
                <th className="py-1 pr-3 font-normal">Date</th>
                <th className="py-1 pr-3 font-normal">Customer</th>
                <th className="py-1 pr-3 font-normal">Pax</th>
                <th className="py-1 pr-3 font-normal">Package</th>
                <th className="py-1 pr-3 font-normal">Venue</th>
                <th className="py-1 pr-3 font-normal">Status</th>
                <th className="py-1 pr-3 text-right font-normal">Balance due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-white/5" data-booking-row>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    <Link href={`/events/${r.id}`} className="hover:underline">
                      {fmtDate(r.date)} · {r.startTime}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-3">{r.customer}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{r.pax}</td>
                  <td className="py-1.5 pr-3">{r.packageName}</td>
                  <td className="py-1.5 pr-3">{r.venueArea}</td>
                  <td className="py-1.5 pr-3">
                    <Badge tone={STATUS_TONE[r.status] ?? 'muted'}>{r.status}</Badge>
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{r.status === 'cancelled' || r.status === 'inquiry' ? '—' : php(r.balanceDue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty text="No bookings this month." />
        )}
      </section>
    </div>
  );
}
