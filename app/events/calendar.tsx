import Link from 'next/link';
import { monthDays, weekday } from '@/lib/dates';

export interface CalendarChip {
  id: number;
  date: string;
  label: string;
  tone: 'ok' | 'info' | 'muted' | 'warn' | 'violet';
  strike?: boolean;
  href?: string;
}

const CHIP: Record<CalendarChip['tone'], string> = {
  ok: 'bg-emerald-500/20 text-emerald-200',
  info: 'bg-sky-500/20 text-sky-200',
  muted: 'bg-white/10 text-zinc-400',
  warn: 'bg-amber-500/20 text-amber-200',
  violet: 'bg-violet-500/20 text-violet-200',
};

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function shiftMonth(yyyyMm: string, delta: number): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function monthTitle(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** Seven-column month grid. `basePath` receives ?month= for the prev/next links. */
export function MonthCalendar({ month, chips, today, basePath, extraQuery = '' }: { month: string; chips: CalendarChip[]; today: string; basePath: string; extraQuery?: string }) {
  const days = monthDays(month);
  const lead = weekday(days[0]);
  const byDate = new Map<string, CalendarChip[]>();
  for (const c of chips) byDate.set(c.date, [...(byDate.get(c.date) ?? []), c]);
  const cells: (string | null)[] = [...Array(lead).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <Link href={`${basePath}?month=${shiftMonth(month, -1)}${extraQuery}`} className="text-sm text-zinc-400 hover:text-zinc-100">
          ← previous
        </Link>
        <div className="font-medium">{monthTitle(month)}</div>
        <Link href={`${basePath}?month=${shiftMonth(month, 1)}${extraQuery}`} className="text-sm text-zinc-400 hover:text-zinc-100">
          next →
        </Link>
      </div>
      <div className="grid grid-cols-7 gap-px text-[11px] text-zinc-500">
        {DOW.map((d) => (
          <div key={d} className="px-1 pb-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px rounded-lg bg-white/5 overflow-hidden">
        {cells.map((d, i) => (
          <div key={i} className={`min-h-[84px] bg-zinc-900 p-1 ${d === today ? 'ring-1 ring-inset ring-emerald-500/60' : ''}`}>
            {d && <div className={`text-[11px] ${d === today ? 'text-emerald-300' : 'text-zinc-500'}`}>{Number(d.slice(8))}</div>}
            <div className="mt-0.5 space-y-0.5">
              {(d ? byDate.get(d) ?? [] : []).slice(0, 4).map((c) => {
                const cls = `block truncate rounded px-1 text-[11px] leading-5 ${CHIP[c.tone]} ${c.strike ? 'line-through' : ''}`;
                return c.href ? (
                  <Link key={`${c.id}-${c.label}`} href={c.href} className={cls} title={c.label}>
                    {c.label}
                  </Link>
                ) : (
                  <div key={`${c.id}-${c.label}`} className={cls} title={c.label}>
                    {c.label}
                  </div>
                );
              })}
              {d && (byDate.get(d)?.length ?? 0) > 4 && <div className="px-1 text-[10px] text-zinc-500">+{byDate.get(d)!.length - 4} more</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
