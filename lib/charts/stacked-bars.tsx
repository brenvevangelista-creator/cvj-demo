'use client';

import { useState } from 'react';
import { EmptyChart, Frame, Tooltip, fmt, shortDate, ticks, useWidth, type TipState, type ValueKind } from '@/lib/charts/util';
import { fmtDate } from '@/lib/dates';

export interface Series {
  key: string;
  name: string;
  color: string;
  values: number[];
}

interface Props {
  dates: string[];
  series: Series[];
  kind: ValueKind;
  height?: number;
}

const PAD = { top: 8, right: 8, bottom: 22, left: 56 };
const GAP = 2; // surface gap between stacked segments and adjacent columns
const MAX_BAR = 24;

/** Daily stacked columns, one segment per series; hovering a day lists every series. */
export function StackedBars({ dates, series, kind, height = 220 }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<TipState | null>(null);
  const n = dates.length;
  if (!n) return <EmptyChart text="No data in this range." />;
  const totals = dates.map((_, i) => series.reduce((s, sr) => s + (sr.values[i] ?? 0), 0));
  const { max, values: yTicks } = ticks(Math.max(...totals));
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const slot = n ? plotW / n : 0;
  const bar = Math.min(MAX_BAR, Math.max(2, slot - GAP));
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / 70))));

  return (
    <Frame>
      <div ref={ref} className="w-full" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label="Stacked daily columns">
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--axis-line)' : 'var(--grid-hairline)'} strokeWidth={1} />
                <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill="var(--ink-muted)" className="tabular-nums">
                  {fmt(kind, t, 'tick')}
                </text>
              </g>
            ))}
            {dates.map((d, i) => {
              const x = PAD.left + i * slot + (slot - bar) / 2;
              let acc = 0;
              const segs = series
                .map((sr) => {
                  const v = sr.values[i] ?? 0;
                  const y0 = y(acc);
                  const y1 = y(acc + v);
                  acc += v;
                  return { sr, v, top: y1, h: Math.max(0, y0 - y1) };
                })
                .filter((s) => s.v > 0);
              const last = segs[segs.length - 1];
              return (
                <g key={d}>
                  {segs.map((s, j) => {
                    const h = Math.max(0, s.h - (j < segs.length - 1 ? GAP : 0));
                    const r = s === last ? 4 : 0;
                    const path = `M${x},${s.top + h} V${s.top + r} Q${x},${s.top} ${x + r},${s.top} H${x + bar - r} Q${x + bar},${s.top} ${x + bar},${s.top + r} V${s.top + h} Z`;
                    return <path key={s.sr.key} d={path} fill={s.sr.color} />;
                  })}
                  {i % labelEvery === 0 && (
                    <text x={x + bar / 2} y={height - 6} textAnchor="middle" fontSize={10} fill="var(--ink-muted)">
                      {shortDate(d)}
                    </text>
                  )}
                  <rect
                    x={PAD.left + i * slot}
                    y={PAD.top}
                    width={slot}
                    height={plotH}
                    fill="transparent"
                    onPointerMove={(e) => {
                      const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                      setTip({
                        x: e.clientX - box.left,
                        y: e.clientY - box.top,
                        title: fmtDate(d),
                        rows: [
                          ...series.filter((sr) => (sr.values[i] ?? 0) > 0).map((sr) => ({ name: sr.name, value: fmt(kind, sr.values[i] ?? 0), color: sr.color })),
                          { name: 'Total', value: fmt(kind, totals[i]) },
                        ],
                      });
                    }}
                    onPointerLeave={() => setTip(null)}
                  />
                </g>
              );
            })}
          </svg>
        )}
      </div>
      <Tooltip tip={tip} width={width} />
    </Frame>
  );
}
