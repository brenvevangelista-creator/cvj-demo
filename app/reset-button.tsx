'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { resetDemoAction } from '@/app/actions/reset';

export function ResetButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const onClick = () => {
    if (!window.confirm('Reset all demo data to the seed?')) return;
    start(async () => {
      const r = await resetDemoAction();
      setError(r.ok ? null : r.error);
      if (r.ok) router.push('/');
      router.refresh();
    });
  };
  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-rose-300">{error}</span>}
      <button
        onClick={onClick}
        disabled={pending}
        data-reset-demo
        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-zinc-300 hover:border-white/40 disabled:opacity-60"
      >
        {pending ? 'Resetting…' : 'Reset demo'}
      </button>
    </div>
  );
}
