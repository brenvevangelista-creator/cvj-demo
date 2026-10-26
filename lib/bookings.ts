// Create and edit bookings. Validation with zod, derived rows through lib/derived.ts,
// everything inside one transaction so a failure leaves nothing half-written.
import { z } from 'zod';
import type { Db } from '@/lib/db';
import { withTransaction } from '@/lib/db';
import { VENUE_AREAS } from '@/lib/seed/catalog';
import { loadBookingCore, loadPackage, productionDatesOf, recomputeProduction, writeDerived } from '@/lib/derived';

export const BookingInputSchema = z.object({
  customerId: z.number().int().positive().optional(),
  customerName: z.string().trim().max(120).nullish(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
  pax: z.number().int('Whole number of guests').min(10, 'At least 10 guests').max(1000, 'At most 1000 guests'),
  packageId: z.number().int().positive(),
  venueArea: z.enum(VENUE_AREAS, { message: 'Choose a venue area' }),
  depositCentavos: z.number().int().min(0, 'Deposit cannot be negative'),
  notes: z.string().max(500, 'Keep notes under 500 characters').nullish(),
});

export type BookingInput = z.input<typeof BookingInputSchema>;
export type Errors = Record<string, string>;
export type SaveResult = { ok: true; id: number } | { ok: false; errors: Errors };

const FORM_ERROR = 'Could not save, try again.';

/** Validate the input against the schema and the rules that need the database or today. */
function validate(db: Db, raw: BookingInput, today: string): { ok: true; input: z.output<typeof BookingInputSchema>; total: number } | { ok: false; errors: Errors } {
  const parsed = BookingInputSchema.safeParse(raw);
  const errors: Errors = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }
  const input = parsed.data;
  if (!input.customerId && !input.customerName?.trim()) errors.customerName = 'Choose a customer or type a new name';
  if (input.customerId && !db.prepare('select 1 from customers where id = ?').get(input.customerId)) errors.customerId = 'Unknown customer';
  if (input.date < today) errors.date = 'Date cannot be in the past';
  if (input.endTime <= input.startTime) errors.endTime = 'End must be after start';
  const pkg = loadPackage(db, input.packageId);
  if (!pkg) errors.packageId = 'Choose a package';
  const total = pkg ? pkg.pricePerPax * input.pax : 0;
  if (pkg && input.depositCentavos > total) errors.depositCentavos = 'Deposit cannot exceed the total';
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, input, total };
}

function resolveCustomer(db: Db, input: { customerId?: number; customerName?: string | null }): number {
  if (input.customerId) return input.customerId;
  const name = input.customerName!.trim();
  const existing = db.prepare('select id from customers where name = ? collate nocase').get(name) as { id: number } | undefined;
  if (existing) return existing.id;
  return Number(db.prepare("insert into customers (name, source) values (?, 'walk-in')").run(name).lastInsertRowid);
}

export function createBooking(db: Db, raw: BookingInput, today: string): SaveResult {
  const v = validate(db, raw, today);
  if (!v.ok) return v;
  const { input } = v;
  try {
    const id = withTransaction(db, () => {
      const customerId = resolveCustomer(db, input);
      const unitId = (db.prepare("select id from units where slug = 'events'").get() as { id: number }).id;
      const id = Number(
        db
          .prepare("insert into bookings (customer_id, unit_id, date, start_time, end_time, pax, package_id, venue_area, status, notes) values (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)")
          .run(customerId, unitId, input.date, input.startTime, input.endTime, input.pax, input.packageId, input.venueArea, input.notes ?? null).lastInsertRowid,
      );
      writeDerived(db, loadBookingCore(db, id, input.depositCentavos)!, loadPackage(db, input.packageId)!, today);
      recomputeProduction(db, productionDatesOf(input.date));
      if (input.depositCentavos > 0) {
        db.prepare("insert into payments (booking_id, amount, paid_on, method) values (?, ?, ?, 'deposit on booking')").run(id, input.depositCentavos, today);
      }
      return id;
    });
    return { ok: true, id };
  } catch (err) {
    console.error('createBooking failed', err);
    return { ok: false, errors: { form: FORM_ERROR } };
  }
}

export function updateBooking(db: Db, id: number, raw: BookingInput, today: string): SaveResult {
  const existing = db.prepare('select date, status from bookings where id = ?').get(id) as { date: string; status: string } | undefined;
  if (!existing) return { ok: false, errors: { form: 'Not found' } };
  const v = validate(db, raw, today);
  if (!v.ok) return v;
  const { input } = v;
  try {
    withTransaction(db, () => {
      const customerId = resolveCustomer(db, input);
      db.prepare("update bookings set customer_id = ?, date = ?, start_time = ?, end_time = ?, pax = ?, package_id = ?, venue_area = ?, notes = ?, status = case when status = 'inquiry' then 'confirmed' else status end, updated_at = datetime('now') where id = ?")
        .run(customerId, input.date, input.startTime, input.endTime, input.pax, input.packageId, input.venueArea, input.notes ?? null, id);
      if (existing.date !== input.date) {
        // Shifts belong to the event date; unassigned ones are rebuilt by writeDerived, assigned ones move.
        db.prepare('update shifts set date = ? where booking_id = ?').run(input.date, id);
      }
      const r = rederiveInside(db, id, today, input.depositCentavos);
      if (!r.ok) throw new Error(r.errors.form);
      if (existing.date !== input.date) recomputeProduction(db, productionDatesOf(existing.date));
    });
    return { ok: true, id };
  } catch (err) {
    console.error('updateBooking failed', err);
    return { ok: false, errors: { form: FORM_ERROR } };
  }
}

/** Rebuild the derived rows of a booking; payments are kept. */
export function rederive(db: Db, bookingId: number, today: string, depositCentavos?: number): SaveResult {
  try {
    return withTransaction(db, () => rederiveInside(db, bookingId, today, depositCentavos));
  } catch (err) {
    console.error('rederive failed', err);
    return { ok: false, errors: { form: FORM_ERROR } };
  }
}

function rederiveInside(db: Db, bookingId: number, today: string, depositCentavos?: number): SaveResult {
  const row = db.prepare('select date, package_id from bookings where id = ?').get(bookingId) as { date: string; package_id: number } | undefined;
  if (!row) return { ok: false, errors: { form: 'Not found' } };
  const prior = db.prepare("select amount, due_date from invoices where booking_id = ? and label = 'Deposit'").get(bookingId) as { amount: number; due_date: string } | undefined;
  const deposit = depositCentavos ?? prior?.amount ?? 0;
  const bookedOn = prior?.due_date && prior.due_date < today ? prior.due_date : today;
  writeDerived(db, loadBookingCore(db, bookingId, deposit)!, loadPackage(db, row.package_id)!, bookedOn);
  recomputeProduction(db, productionDatesOf(row.date));
  return { ok: true, id: bookingId };
}
