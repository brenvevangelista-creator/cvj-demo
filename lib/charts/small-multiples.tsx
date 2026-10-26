'use client';

import { useState } from 'react';
import { EmptyChart, Frame, Tooltip, fmt, shortDate, ticks, useWidth, type TipState, type ValueKind } from '@/lib/charts/util';
import { fmtDate } from '@/lib/dates';
import type { Series } from '@/lib/charts/stacked-bars';

interface Props {
  dates: string[];
  series: Series[];
  kind: ValueKind;
  panelHeight?: number;
}

const PAD = { top: 14, right: 12, bottom: 18, left: 52 };

/**
 * One small line chart per series, all on the same y scale (never a dual axis).
 * A shared crosshair: hovering any panel highlights the same day in every panel.
 */
export function SmallMultiples({ dates, series, kind, panelHeight = 120 }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [tip, setTip] = useState<TipState | null>(null);
  const n = dates.length;
  if (!n) return <EmptyChart text="No data in this range." />;
  const cols = width >= 900 ? 3 : width >= 560 ? 2 : 1;
  const panelW = width > 0 ? Math.floor(width / cols) : 0;
  const all = ticks(Math.max(...series.flatMap((s) => s.values), 0));
  // Small panels: gridlines at every tick, labels only at the baseline, the middle and the top.
  const max = all.max;
  const yTicks = all.values;
  const labelled = new Set([0, Math.floor(yTicks.length / 2), yTicks.length - 1]);
  const plotW = Math.max(0, panelW - PAD.left - PAD.right);
  const plotH = panelHeight - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - box.left - PAD.left;
    const i = Math.max(0, Math.min(n - 1, Math.round((px / Math.max(1, plotW)) * (n - 1))));
    setHover(i);
    const wrap = (e.currentTarget.ownerSVGElement!.parentElement as HTMLElement).getBoundingClientRect();
    setTip({
      x: e.clientX - wrap.left,
      y: e.clientY - wrap.top,
      title: fmtDate(dates[i]),
      rows: series.map((s) => ({ name: s.name, value: fmt(kind, s.values[i] ?? 0), color: s.color, kind: 'line' as const })),
    });
  };

  return (
    <Frame>
      <div ref={ref} className="grid w-full" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {width > 0 &&
          series.map((s) => {
            const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
            const last = s.values.length - 1;
            return (
              <div key={s.key} style={{ height: panelHeight }}>
                <svg width={panelW} height={panelHeight} role="img" aria-label={s.name}>
                  <text x={PAD.left} y={PAD.top - 1} fontSize={11} fill="var(--ink-secondary)">
                    {s.name}
                  </text>
                  {yTicks.map((t, ti) => (
                    <g key={t}>
                      <line x1={PAD.left} x2={panelW - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--axis-line)' : 'var(--grid-hairline)'} strokeWidth={1} />
                      {labelled.has(ti) && (
                        <text x={PAD.left - 5} y={y(t) + 3} textAnchor="end" fontSize={9} fill="var(--ink-muted)" className="tabular-nums">
                          {fmt(kind, t, 'tick')}
                        </text>
                      )}
                    </g>
                  ))}
                  <polygon points={`${x(0)},${y(0)} ${pts} ${x(last)},${y(0)}`} fill={s.color} opacity={0.1} />
                  <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  {hover !== null ? (
                    <>
                      <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--ink-muted)" strokeWidth={1} />
                      <circle cx={x(hover)} cy={y(s.values[hover] ?? 0)} r={4} fill={s.color} stroke="var(--surface-1)" strokeWidth={2} />
                    </>
                  ) : (
                    <circle cx={x(last)} cy={y(s.values[last] ?? 0)} r={4} fill={s.color} stroke="var(--surface-1)" strokeWidth={2} />
                  )}
                  <text x={PAD.left} y={panelHeight - 5} fontSize={9} fill="var(--ink-muted)">{shortDate(dates[0])}</text>
                  <text x={panelW - PAD.right} y={panelHeight - 5} textAnchor="end" fontSize={9} fill="var(--ink-muted)">{shortDate(dates[last])}</text>
                  <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} fill="transparent" onPointerMove={onMove} onPointerLeave={() => { setHover(null); setTip(null); }} />
                </svg>
              </div>
            );
          })}
      </div>
      <Tooltip tip={tip} width={width} />
    </Frame>
  );
}
