'use client';

import { useState } from 'react';
import { EmptyChart, Frame, Tooltip, fmt, useWidth, type TipState, type ValueKind } from '@/lib/charts/util';

export interface HBarRow {
  label: string;
  value: number;
  /** Extra text under the label, e.g. a conversion rate. */
  sub?: string;
  /** Series color; defaults to slot 1 (one nominal series, one hue). */
  color?: string;
  /** Replaces the formatted value at the bar tip, e.g. "42% · ₱1.2M". */
  display?: string;
}

interface Props {
  rows: HBarRow[];
  kind: ValueKind;
  /** Scale ceiling; defaults to the largest value. Pass 1 for shares. */
  max?: number;
  emptyText?: string;
}

const LABEL_W = 132;
const BAR_H = 18;
const ROW_H = 30;
const RIGHT_W = 96;

/** Horizontal bars for ranked or part-to-whole comparisons; value at the tip, hover for detail. */
export function HBars({ rows, kind, max, emptyText = 'Nothing to show yet.' }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<TipState | null>(null);
  if (!rows.length || rows.every((r) => r.value <= 0)) return <EmptyChart text={emptyText} />;
  const top = max ?? (Math.max(...rows.map((r) => r.value), 0) || 1);
  const height = rows.length * ROW_H + 4;
  const plotW = Math.max(0, width - LABEL_W - RIGHT_W);
  return (
    <Frame>
      <div ref={ref} className="w-full" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label="Horizontal bars">
            {rows.map((r, i) => {
              const yTop = i * ROW_H + (ROW_H - BAR_H) / 2;
              const w = Math.max(0, Math.min(1, r.value / top) * plotW);
              const x = LABEL_W;
              const rr = Math.min(4, w);
              const path = w > 0 ? `M${x},${yTop} H${x + w - rr} Q${x + w},${yTop} ${x + w},${yTop + rr} V${yTop + BAR_H - rr} Q${x + w},${yTop + BAR_H} ${x + w - rr},${yTop + BAR_H} H${x} Z` : '';
              return (
                <g
                  key={r.label}
                  onPointerMove={(e) => {
                    const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                    setTip({ x: e.clientX - box.left, y: e.clientY - box.top, title: r.label, rows: [{ name: r.sub ?? 'Value', value: fmt(kind, r.value), color: r.color ?? 'var(--series-1)' }] });
                  }}
                  onPointerLeave={() => setTip(null)}
                >
                  <rect x={0} y={i * ROW_H} width={width} height={ROW_H} fill="transparent" />
                  <text x={LABEL_W - 10} y={yTop + BAR_H / 2 + (r.sub ? -2 : 4)} textAnchor="end" fontSize={12} fill="var(--ink-secondary)">
                    {r.label.length > 18 ? r.label.slice(0, 17) + '…' : r.label}
                  </text>
                  {r.sub && (
                    <text x={LABEL_W - 10} y={yTop + BAR_H / 2 + 10} textAnchor="end" fontSize={10} fill="var(--ink-muted)">
                      {r.sub}
                    </text>
                  )}
                  <line x1={x} x2={x} y1={yTop - 2} y2={yTop + BAR_H + 2} stroke="var(--axis-line)" strokeWidth={1} />
                  {w > 0 && <path d={path} fill={r.color ?? 'var(--series-1)'} />}
                  <text x={x + w + 8} y={yTop + BAR_H / 2 + 4} fontSize={12} fill="var(--ink-primary)" className="tabular-nums">
                    {r.display ?? fmt(kind, r.value, 'tick')}
                  </text>
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
