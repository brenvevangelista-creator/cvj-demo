'use client';

import { useState, type ReactNode } from 'react';
import { Legend } from '@/lib/charts/util';

export interface TableView {
  columns: string[];
  rows: (string | number)[][];
}

interface Props {
  title: string;
  subtitle?: string;
  legend?: { name: string; color: string; kind?: 'rect' | 'line' }[];
  table?: TableView;
  children: ReactNode;
  className?: string;
}

/** Chart container: title, subtitle, legend, and the table-view twin behind a toggle. */
export function ChartCard({ title, subtitle, legend = [], table, children, className = '' }: Props) {
  const [showTable, setShowTable] = useState(false);
  return (
    <figure className={`card flex flex-col gap-3 ${className}`}>
      <figcaption className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold" style={{ color: 'var(--ink-primary)' }}>{title}</div>
          {subtitle && <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>{subtitle}</div>}
        </div>
        {table && (
          <button
            type="button"
            onClick={() => setShowTable((s) => !s)}
            aria-pressed={showTable}
            className="rounded border border-white/10 px-2 py-0.5 text-[11px] hover:border-white/30"
            style={{ color: 'var(--ink-secondary)' }}
          >
            {showTable ? 'Chart' : 'Table'}
          </button>
        )}
      </figcaption>
      <Legend items={legend} />
      {showTable && table ? (
        <div className="max-h-72 overflow-auto rounded-lg border border-white/5">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-zinc-900 text-left" style={{ color: 'var(--ink-muted)' }}>
              <tr>
                {table.columns.map((c) => (
                  <th key={c} className="px-2 py-1 font-normal">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((cell, j) => (
                    <td key={j} className={`px-2 py-1 ${j > 0 ? 'text-right tabular-nums' : ''}`} style={{ color: 'var(--ink-secondary)' }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </figure>
  );
}
