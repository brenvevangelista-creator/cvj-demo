'use client';

import { useState } from 'react';
import { EmptyChart, Frame, Tooltip, fmt, useWidth, type TipState } from '@/lib/charts/util';

interface Props {
  rows: string[];
  cols: string[];
  /** Values in 0..1. */
  grid: number[][];
  emptyText?: string;
}

const STEPS = ['--seq-100', '--seq-200', '--seq-300', '--seq-400', '--seq-500', '--seq-600', '--seq-700'];
const LABEL_W = 60;
const GAP = 2;
const CELL_H = 26;

function stepFor(v: number): string {
  if (v <= 0) return 'var(--grid-hairline)';
  const i = Math.min(STEPS.length - 1, Math.floor(v * STEPS.length));
  return `var(${STEPS[i]})`;
}

/** Sequential heatmap (one hue, light to dark) with a scale legend and per-cell hover. */
export function Heatmap({ rows, cols, grid, emptyText = 'No bookings in this range.' }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<TipState | null>(null);
  if (!rows.length || !cols.length || grid.flat().every((v) => v <= 0)) return <EmptyChart text={emptyText} />;
  const plotW = Math.max(0, width - LABEL_W);
  const cellW = cols.length ? plotW / cols.length : 0;
  const height = rows.length * CELL_H + 20;
  return (
    <Frame>
      <div ref={ref} className="w-full" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label="Heatmap">
            {rows.map((r, ri) => (
              <g key={r}>
                <text x={LABEL_W - 8} y={ri * CELL_H + CELL_H / 2 + 4} textAnchor="end" fontSize={11} fill="var(--ink-secondary)">
                  {r}
                </text>
                {cols.map((c, ci) => {
                  const v = grid[ri]?.[ci] ?? 0;
                  return (
                    <rect
                      key={c}
                      x={LABEL_W + ci * cellW + GAP / 2}
                      y={ri * CELL_H + GAP / 2}
                      width={Math.max(0, cellW - GAP)}
                      height={CELL_H - GAP}
                      rx={2}
                      fill={stepFor(v)}
                      onPointerMove={(e) => {
                        const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                        setTip({ x: e.clientX - box.left, y: e.clientY - box.top, title: `${r} · ${c}`, rows: [{ name: 'Booked', value: fmt('rate', v) }] });
                      }}
                      onPointerLeave={() => setTip(null)}
                    />
                  );
                })}
              </g>
            ))}
            {cols.map((c, ci) =>
              ci % 2 === 0 ? (
                <text key={c} x={LABEL_W + ci * cellW + cellW / 2} y={rows.length * CELL_H + 14} textAnchor="middle" fontSize={10} fill="var(--ink-muted)">
                  {c}
                </text>
              ) : null,
            )}
          </svg>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[10px]" style={{ color: 'var(--ink-muted)' }}>
        <span>Empty</span>
        {STEPS.map((s) => (
          <span key={s} aria-hidden style={{ width: 18, height: 8, borderRadius: 2, background: `var(${s})` }} />
        ))}
        <span>Always booked</span>
      </div>
      <Tooltip tip={tip} width={width} />
    </Frame>
  );
}
