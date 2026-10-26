'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
import { todayManila } from '@/lib/dates';
import { createBooking, updateBooking, type BookingInput, type Errors } from '@/lib/bookings';

export interface BookingFormState {
  errors: Errors;
}

function num(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? '').trim());
  return Number.isFinite(n) ? n : NaN;
}

/** Form fields -> BookingInput. Pesos typed by the user become centavos here. */
function parseForm(formData: FormData): BookingInput {
  const customerIdRaw = String(formData.get('customerId') ?? '').trim();
  const pesos = num(formData.get('depositPesos'));
  return {
    customerId: customerIdRaw ? num(customerIdRaw) : undefined,
    customerName: String(formData.get('customerName') ?? ''),
    date: String(formData.get('date') ?? ''),
    startTime: String(formData.get('startTime') ?? ''),
    endTime: String(formData.get('endTime') ?? ''),
    pax: num(formData.get('pax')),
    packageId: num(formData.get('packageId')),
    venueArea: String(formData.get('venueArea') ?? '') as BookingInput['venueArea'],
    depositCentavos: Number.isFinite(pesos) ? Math.round(pesos * 100) : NaN,
    notes: String(formData.get('notes') ?? '') || null,
  };
}

export async function createBookingAction(_prev: BookingFormState, formData: FormData): Promise<BookingFormState> {
  const r = createBooking(getDb(), parseForm(formData), todayManila());
  if (!r.ok) return { errors: r.errors };
  revalidatePath('/');
  revalidatePath('/events');
  revalidatePath('/schedule');
  redirect(`/events/${r.id}`);
}

export async function updateBookingAction(id: number, _prev: BookingFormState, formData: FormData): Promise<BookingFormState> {
  const r = updateBooking(getDb(), id, parseForm(formData), todayManila());
  if (!r.ok) return { errors: r.errors };
  revalidatePath('/');
  revalidatePath('/events');
  revalidatePath('/schedule');
  redirect(`/events/${id}`);
}
