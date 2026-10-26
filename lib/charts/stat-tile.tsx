import type { ReactNode } from 'react';

interface SparkProps {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}

/** Small trend line; the last point is marked. Server-renderable (no hover). */
export function Sparkline({ values, color = 'var(--series-1)', width = 88, height = 26 }: SparkProps) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 0) || 1;
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const x = (i: number) => 2 + (i / (values.length - 1)) * (width - 4);
  const y = (v: number) => height - 3 - ((v - min) / span) * (height - 6);
  const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const last = values.length - 1;
  return (
    <svg width={width} height={height} aria-hidden className="shrink-0">
      <polyline points={pts} fill="none" stroke="var(--series-muted)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last)} cy={y(values[last])} r={3} fill={color} stroke="var(--surface-1)" strokeWidth={2} />
    </svg>
  );
}

interface TileProps {
  label: string;
  value: ReactNode;
  /** Secondary line under the value, e.g. "vs previous 30 days" or "of 30 days". */
  hint?: string;
  /** Signed change text; `good` colors it, null leaves it neutral. */
  delta?: { text: string; good: boolean | null };
  spark?: number[];
  sparkColor?: string;
  hero?: boolean;
}

/**
 * Stat tile per the figure contract: label, value (proportional figures), delta,
 * hint, optional sparkline. Fixed vertical rhythm so a row of tiles lines up
 * whether or not a tile carries a sparkline.
 */
export function StatTile({ label, value, hint, delta, spark, sparkColor, hero = false }: TileProps) {
  const deltaColor = delta?.good === true ? 'var(--status-good)' : delta?.good === false ? 'var(--status-critical)' : 'var(--ink-secondary)';
  return (
    <div className="card flex min-h-[124px] flex-col justify-between">
      <div className="text-xs leading-tight" style={{ color: 'var(--ink-muted)' }}>{label}</div>
      <div className={`font-semibold leading-none ${hero ? 'text-4xl' : 'text-[1.75rem]'}`} style={{ color: 'var(--ink-primary)' }}>
        {value}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="flex min-h-[14px] flex-wrap items-center gap-x-2 text-[11px] leading-tight">
          {delta && <span style={{ color: deltaColor }}>{delta.text}</span>}
          {hint && <span style={{ color: 'var(--ink-muted)' }}>{hint}</span>}
        </div>
        {spark && spark.length > 1 && <Sparkline values={spark} color={sparkColor} />}
      </div>
    </div>
  );
}
