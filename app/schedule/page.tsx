import Link from 'next/link';
import { getConflicts, getScheduleItems, type ScheduleItem } from '@/lib/data';
import { addDays, monthDays, monthOf, todayManila } from '@/lib/dates';
import { Empty } from '@/lib/ui';
import { MonthCalendar, type CalendarChip } from '@/app/events/calendar';
import { KIND_LABEL, WeekView } from '@/app/schedule/week';

export const dynamic = 'force-dynamic';

const UNITS: { slug: string; label: string; kinds: ScheduleItem['kind'][] }[] = [
  { slug: 'all', label: 'All units', kinds: ['event', 'catering', 'court', 'production', 'shift'] },
  { slug: 'events', label: 'Events Place', kinds: ['event'] },
  { slug: 'catering', label: 'Catering', kinds: ['catering', 'shift'] },
  { slug: 'commissary', label: 'Commissary', kinds: ['production'] },
  { slug: 'pickleball', label: 'Pickleball', kinds: ['court'] },
  { slug: 'parking', label: 'Parking', kinds: ['event'] },
  { slug: 'cafe', label: 'Cafe', kinds: [] },
];

const CHIP_TONE: Record<ScheduleItem['kind'], CalendarChip['tone']> = { event: 'ok', catering: 'warn', court: 'info', production: 'violet', shift: 'muted' };

export default function SchedulePage({ searchParams }: { searchParams: { view?: string; from?: string; unit?: string; month?: string } }) {
  const today = todayManila();
  const view = searchParams.view === 'month' || searchParams.month ? 'month' : 'week';
  const unit = UNITS.find((u) => u.slug === searchParams.unit) ?? UNITS[0];
  const from = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.from ?? '') ? searchParams.from! : today;
  const month = /^\d{4}-\d{2}$/.test(searchParams.month ?? '') ? searchParams.month! : monthOf(from);
  const days = monthDays(month);
  const [rangeFrom, rangeTo] = view === 'week' ? [from, addDays(from, 6)] : [days[0], days[days.length - 1]];

  const items = getScheduleItems(rangeFrom, rangeTo).filter((i) => unit.kinds.includes(i.kind));
  const conflicts = getConflicts(rangeFrom, rangeTo);
  const unitQuery = unit.slug === 'all' ? '' : `&unit=${unit.slug}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Compound schedule</h1>
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/schedule?view=week&from=${today}${unitQuery}`} className={`rounded px-2 py-1 ${view === 'week' ? 'bg-white/10' : 'text-zinc-400 hover:text-zinc-100'}`}>
            Week
          </Link>
          <Link href={`/schedule?view=month&month=${monthOf(from)}${unitQuery}`} className={`rounded px-2 py-1 ${view === 'month' ? 'bg-white/10' : 'text-zinc-400 hover:text-zinc-100'}`}>
            Month
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {UNITS.map((u) => (
          <Link
            key={u.slug}
            href={view === 'week' ? `/schedule?view=week&from=${from}${u.slug === 'all' ? '' : `&unit=${u.slug}`}` : `/schedule?view=month&month=${month}${u.slug === 'all' ? '' : `&unit=${u.slug}`}`}
            className={`rounded-full border px-2.5 py-1 ${u.slug === unit.slug ? 'border-emerald-500/60 text-emerald-200' : 'border-white/10 text-zinc-400 hover:text-zinc-100'}`}
          >
            {u.label}
          </Link>
        ))}
      </div>

      <section className="card" data-conflicts>
        <h2 className="h">Conflicts</h2>
        {conflicts.length ? (
          <ul className="space-y-1 text-sm">
            {conflicts.map((c, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 text-amber-200" data-conflict={c.kind}>
                <span>{c.message}</span>
                <span className="text-xs text-zinc-500">
                  {c.bookingIds.map((id) => (
                    <Link key={id} href={`/events/${id}`} className="mr-1 underline">
                      booking #{id}
                    </Link>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="No conflicts in this range." />
        )}
      </section>

      {unit.kinds.length === 0 ? (
        <Empty text={`${unit.label} has no scheduled items in the demo; its daily figures are on the overview.`} />
      ) : view === 'week' ? (
        <>
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <Link href={`/schedule?view=week&from=${addDays(from, -7)}${unitQuery}`} className="hover:text-zinc-100">← previous week</Link>
            <Link href={`/schedule?view=week&from=${today}${unitQuery}`} className="hover:text-zinc-100">today</Link>
            <Link href={`/schedule?view=week&from=${addDays(from, 7)}${unitQuery}`} className="hover:text-zinc-100">next week →</Link>
          </div>
          <WeekView from={from} items={items} today={today} />
        </>
      ) : (
        <MonthCalendar
          month={month}
          today={today}
          basePath="/schedule"
          extraQuery={`&view=month${unitQuery}`}
          chips={items.map((it, i) => ({ id: i, date: it.date, label: `${it.startTime} ${it.title}`, tone: CHIP_TONE[it.kind], href: it.href }))}
        />
      )}

      <div className="flex flex-wrap gap-3 text-[11px] text-zinc-500">
        {(Object.keys(KIND_LABEL) as ScheduleItem['kind'][]).map((k) => (
          <span key={k}>
            <span className={`mr-1 inline-block h-2 w-2 rounded-sm ${CHIP_TONE[k] === 'ok' ? 'bg-emerald-400' : CHIP_TONE[k] === 'warn' ? 'bg-amber-400' : CHIP_TONE[k] === 'info' ? 'bg-sky-400' : CHIP_TONE[k] === 'violet' ? 'bg-violet-400' : 'bg-zinc-400'}`} />
            {KIND_LABEL[k]}
          </span>
        ))}
      </div>
    </div>
  );
}
