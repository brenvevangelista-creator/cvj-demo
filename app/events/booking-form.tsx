'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import type { BookingFormState } from '@/app/actions/bookings';
import type { PackageDef } from '@/lib/types';

export interface BookingFormValues {
  customerId?: number;
  customerName?: string;
  date: string;
  startTime: string;
  endTime: string;
  pax: number;
  packageId: number;
  venueArea: string;
  depositPesos: number;
  notes?: string | null;
}

interface Props {
  action: (prev: BookingFormState, formData: FormData) => Promise<BookingFormState>;
  customers: { id: number; name: string }[];
  packages: PackageDef[];
  venueAreas: readonly string[];
  initial: BookingFormValues;
  submitLabel: string;
}

const NEW = '';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs text-zinc-400">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-300" data-field-error>{error}</span>}
    </label>
  );
}

const input = 'w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500/60 focus:outline-none';

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-60">
      {pending ? 'Saving…' : label}
    </button>
  );
}

export function BookingForm({ action, customers, packages, venueAreas, initial, submitLabel }: Props) {
  const [state, formAction] = useFormState(action, { errors: {} });
  const [customerId, setCustomerId] = useState<string>(initial.customerId ? String(initial.customerId) : NEW);
  const e = state.errors;
  return (
    <form action={formAction} className="card max-w-2xl space-y-4">
      {e.form && <div className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-200" data-form-error>{e.form}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer" error={e.customerId}>
          <select name="customerId" value={customerId} onChange={(ev) => setCustomerId(ev.target.value)} className={input}>
            <option value={NEW}>New customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="New customer name" error={e.customerName}>
          <input name="customerName" defaultValue={initial.customerName ?? ''} disabled={customerId !== NEW} placeholder="e.g. Rotary Club of Marikina" className={input} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Date" error={e.date}>
          <input type="date" name="date" defaultValue={initial.date} required className={input} />
        </Field>
        <Field label="Start" error={e.startTime}>
          <input type="time" name="startTime" defaultValue={initial.startTime} required className={input} />
        </Field>
        <Field label="End" error={e.endTime}>
          <input type="time" name="endTime" defaultValue={initial.endTime} required className={input} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Guests (pax)" error={e.pax}>
          <input type="number" name="pax" defaultValue={initial.pax} min={10} max={1000} required className={input} />
        </Field>
        <Field label="Package" error={e.packageId}>
          <select name="packageId" defaultValue={initial.packageId} className={input}>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · ₱{(p.pricePerPax / 100).toLocaleString('en-US')}/pax
              </option>
            ))}
          </select>
        </Field>
        <Field label="Venue area" error={e.venueArea}>
          <select name="venueArea" defaultValue={initial.venueArea} className={input}>
            {venueAreas.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Deposit received (₱)" error={e.depositCentavos}>
          <input type="number" name="depositPesos" defaultValue={initial.depositPesos} min={0} step="0.01" className={input} />
        </Field>
        <Field label="Notes" error={e.notes}>
          <textarea name="notes" defaultValue={initial.notes ?? ''} rows={2} maxLength={500} className={input} />
        </Field>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton label={submitLabel} />
        <span className="text-xs text-zinc-500">Saving derives the job sheet, production list, roster and payment schedule.</span>
      </div>
    </form>
  );
}
