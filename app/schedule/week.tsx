import Link from 'next/link';
import { addDays, fmtDate, weekday } from '@/lib/dates';
import type { ScheduleItem } from '@/lib/data';

export const KIND_CLASS: Record<ScheduleItem['kind'], string> = {
  event: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30',
  catering: 'bg-amber-500/20 text-amber-200 border-amber-500/30',
  court: 'bg-sky-500/20 text-sky-200 border-sky-500/30',
  production: 'bg-violet-500/20 text-violet-200 border-violet-500/30',
  shift: 'bg-white/10 text-zinc-300 border-white/10',
};

export const KIND_LABEL: Record<ScheduleItem['kind'], string> = {
  event: 'Event',
  catering: 'Off-site catering',
  court: 'Pickleball Park',
  production: 'Commissary production',
  shift: 'Staff shift',
};

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WeekView({ from, items, today }: { from: string; items: ScheduleItem[]; today: string }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const byDate = new Map<string, ScheduleItem[]>();
  for (const it of items) byDate.set(it.date, [...(byDate.get(it.date) ?? []), it]);
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/5 md:grid-cols-7">
      {days.map((d) => (
        <div key={d} className={`min-h-[160px] bg-zinc-900 p-2 ${d === today ? 'ring-1 ring-inset ring-emerald-500/60' : ''}`} data-day={d}>
          <div className={`mb-1 text-[11px] ${d === today ? 'text-emerald-300' : 'text-zinc-500'}`}>
            {DOW[weekday(d)]} · {fmtDate(d)}
          </div>
          <div className="space-y-1">
            {(byDate.get(d) ?? []).map((it, i) => {
              const cls = `block rounded border px-1.5 py-1 text-[11px] leading-4 ${KIND_CLASS[it.kind]}`;
              const body = (
                <>
                  <div className="text-[10px] opacity-70">
                    {it.startTime}–{it.endTime}
                    {it.venueArea && it.venueArea !== 'Off-site' ? ` · ${it.venueArea}` : ''}
                  </div>
                  <div className="truncate" title={it.title}>{it.title}</div>
                </>
              );
              return it.href ? (
                <Link key={i} href={it.href} className={cls} data-kind={it.kind}>
                  {body}
                </Link>
              ) : (
                <div key={i} className={cls} data-kind={it.kind}>
                  {body}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
