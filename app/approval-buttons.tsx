'use client';

import { useState, useTransition } from 'react';
import { approve, decline } from '@/app/actions/approvals';

export function ApprovalButtons({ id }: { id: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: (id: number) => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn(id);
      setError(r.ok ? null : r.error ?? 'Could not save, try again.');
    });
  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-rose-300">{error}</span>}
      <button
        onClick={() => run(approve)}
        disabled={pending}
        className="rounded bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
      >
        Approve
      </button>
      <button
        onClick={() => run(decline)}
        disabled={pending}
        className="rounded bg-white/10 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-white/20 disabled:opacity-50"
      >
        Decline
      </button>
    </div>
  );
}
