import Link from 'next/link';
import type { ReactNode } from 'react';

export { php } from '@/lib/money';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

const TONES = {
  ok: 'bg-emerald-500/20 text-emerald-300',
  warn: 'bg-amber-500/20 text-amber-300',
  info: 'bg-sky-500/20 text-sky-300',
  muted: 'bg-white/10 text-zinc-400',
} as const;

export function Badge({ tone = 'muted', children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${TONES[tone]}`}>{children}</span>;
}

export function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-sm text-zinc-500">{text}</div>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-zinc-500">{hint}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="h mb-0">{children}</h2>
      {action}
    </div>
  );
}

export function ButtonLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-emerald-400">
      {children}
    </Link>
  );
}

export const STATUS_TONE: Record<string, keyof typeof TONES> = {
  confirmed: 'ok',
  inquiry: 'info',
  done: 'muted',
  cancelled: 'muted',
};
