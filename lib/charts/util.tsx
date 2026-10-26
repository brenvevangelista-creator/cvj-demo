'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { axisTicks, compactPesos, pct, UNIT_SLUGS } from '@/lib/analytics';
import { php } from '@/lib/money';
import { fmtDate } from '@/lib/dates';

export type ValueKind = 'pesos' | 'percent' | 'count' | 'rate';

/** Format a value for ticks (compact) or for a tooltip (full). */
export function fmt(kind: ValueKind, v: number, where: 'tick' | 'full' = 'full'): string {
  switch (kind) {
    case 'pesos':
      return where === 'tick' ? compactPesos(v) : php(v);
    case 'percent':
    case 'rate':
      return pct(v, where === 'tick' ? 0 : 1);
    default:
      return Math.round(v).toLocaleString('en-US');
  }
}

export function shortDate(d: string): string {
  return fmtDate(d).replace(/ \d{4}$/, '');
}

/** Series color for a business unit: palette slot by fixed order. */
export function unitColor(slug: string): string {
  const i = UNIT_SLUGS.indexOf(slug as (typeof UNIT_SLUGS)[number]);
  return i >= 0 ? `var(--series-${i + 1})` : 'var(--series-muted)';
}

/** Clean y-axis ticks: 0 .. clean ceiling, steps that are themselves clean numbers. */
export function ticks(max: number): { max: number; values: number[] } {
  return axisTicks(max);
}

/** Measure the width of a container so SVG charts can lay out in pixels. */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

export interface TipState {
  x: number;
  y: number;
  title: string;
  rows: { name: string; value: string; color?: string; kind?: 'rect' | 'line' }[];
}

/** One tooltip per chart; values lead, labels follow; keyed by a short stroke of the series color. */
export function Tooltip({ tip, width }: { tip: TipState | null; width: number }) {
  if (!tip) return null;
  const flip = width > 0 && tip.x > width * 0.6;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-[160px] rounded-lg border border-white/10 bg-zinc-950/95 px-3 py-2 text-xs shadow-xl"
      style={{ left: flip ? undefined : tip.x + 12, right: flip ? width - tip.x + 12 : undefined, top: Math.max(0, tip.y - 8) }}
    >
      <div className="mb-1 text-[11px]" style={{ color: 'var(--ink-muted)' }}>{tip.title}</div>
      {tip.rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-2" style={{ color: 'var(--ink-secondary)' }}>
            {r.color && (
              <span
                aria-hidden
                className="inline-block"
                style={r.kind === 'line' ? { width: 12, height: 2, background: r.color } : { width: 8, height: 8, borderRadius: 2, background: r.color }}
              />
            )}
            {r.name}
          </span>
          <strong className="tabular-nums" style={{ color: 'var(--ink-primary)' }}>{r.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { name: string; color: string; kind?: 'rect' | 'line' }[] }) {
  if (items.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: 'var(--ink-secondary)' }}>
      {items.map((it) => (
        <span key={it.name} className="inline-flex items-center gap-1.5">
          <span aria-hidden style={it.kind === 'line' ? { width: 14, height: 2, background: it.color } : { width: 10, height: 10, borderRadius: 2, background: it.color }} />
          {it.name}
        </span>
      ))}
    </div>
  );
}

export function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-white/10 text-sm" style={{ color: 'var(--ink-muted)' }}>
      {text}
    </div>
  );
}

export function Frame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`relative ${className}`}>{children}</div>;
}
