import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, type Db } from '@/lib/db';
import { seedDatabase } from '@/lib/seed/build';
import { createBooking, updateBooking, rederive, type BookingInput } from '@/lib/bookings';
import { deriveManpower } from '@/lib/derive';
import { loadRatios } from '@/lib/derived';
import { addDays } from '@/lib/dates';

const TODAY = '2026-10-26';
let db: Db;

const count = (table: string, where: string, ...params: unknown[]) =>
  (db.prepare(`select count(*) as n from ${table} where ${where}`).get(...params) as any).n as number;

function input(over: Partial<BookingInput> = {}): BookingInput {
  return {
    customerName: 'Smoke Test Co',
    date: '2026-12-05',
    startTime: '11:00',
    endTime: '15:00',
    pax: 100,
    packageId: 1,
    venueArea: '2nd Floor',
    depositCentavos: 2_000_000,
    notes: null,
    ...over,
  };
}

beforeEach(() => {
  db = openDb(':memory:');
  seedDatabase(db, TODAY);
});

describe('createBooking', () => {
  it('creates the customer, job sheet, production, shifts, invoices and deposit payment', () => {
    const r = createBooking(db, input(), TODAY);
    expect(r.ok).toBe(true);
    const id = (r as any).id as number;
    expect(count('customers', 'name = ?', 'Smoke Test Co')).toBe(1);
    expect(count('job_sheets', 'booking_id = ?', id)).toBe(1);
    expect(count('production_lines pl join production_runs pr on pr.id = pl.run_id', 'pr.date = ?', addDays('2026-12-05', -1))).toBeGreaterThan(0);
    expect(count('production_lines pl join production_runs pr on pr.id = pl.run_id join ingredients i on i.id = pl.ingredient_id', 'pr.date = ? and i.fresh = 1', '2026-12-05')).toBeGreaterThan(0);
    const expectedShifts = deriveManpower(100, loadRatios(db)).reduce((s, n) => s + n.headcount, 0);
    expect(count('shifts', 'booking_id = ?', id)).toBe(expectedShifts);
    expect(count('invoices', 'booking_id = ?', id)).toBe(3);
    const pay = db.prepare('select amount, paid_on from payments where booking_id = ?').all(id) as any[];
    expect(pay).toEqual([{ amount: 2_000_000, paid_on: TODAY }]);
  });

  it('reuses an existing customer by id', () => {
    const before = count('customers', '1=1');
    const r = createBooking(db, input({ customerId: 7, customerName: undefined }), TODAY);
    expect(r.ok).toBe(true);
    expect(count('customers', '1=1')).toBe(before);
    expect((db.prepare('select customer_id from bookings where id = ?').get((r as any).id) as any).customer_id).toBe(7);
  });

  it('records no payment when the deposit is zero', () => {
    const r = createBooking(db, input({ depositCentavos: 0 }), TODAY);
    expect(count('payments', 'booking_id = ?', (r as any).id)).toBe(0);
  });

  it('rejects pax below 10', () => {
    const r = createBooking(db, input({ pax: 5 }), TODAY);
    expect(r.ok).toBe(false);
    expect((r as any).errors.pax).toBeTruthy();
  });

  it('rejects a deposit above the total', () => {
    const r = createBooking(db, input({ pax: 10, depositCentavos: 999_999_999 }), TODAY);
    expect(r.ok).toBe(false);
    expect((r as any).errors.depositCentavos).toBeTruthy();
  });

  it('rejects a date before today but accepts today', () => {
    expect((createBooking(db, input({ date: addDays(TODAY, -1) }), TODAY) as any).errors.date).toBeTruthy();
    expect(createBooking(db, input({ date: TODAY }), TODAY).ok).toBe(true);
  });

  it('rejects an end time that is not after the start time', () => {
    expect((createBooking(db, input({ startTime: '14:00', endTime: '14:00' }), TODAY) as any).errors.endTime).toBeTruthy();
  });

  it('rejects a missing customer, an unknown package and an unknown venue area', () => {
    expect((createBooking(db, input({ customerName: '   ' }), TODAY) as any).errors.customerName).toBeTruthy();
    expect((createBooking(db, input({ packageId: 999 }), TODAY) as any).errors.packageId).toBeTruthy();
    expect((createBooking(db, input({ venueArea: 'Rooftop' as any }), TODAY) as any).errors.venueArea).toBeTruthy();
  });

  it('rejects notes over 500 characters but accepts exactly 500', () => {
    expect((createBooking(db, input({ notes: 'x'.repeat(501) }), TODAY) as any).errors.notes).toBeTruthy();
    expect(createBooking(db, input({ notes: 'x'.repeat(500) }), TODAY).ok).toBe(true);
  });

  it('accepts the pax boundaries 10 and 1000 and rejects 1001', () => {
    // At 10 guests the total is below the fixture deposit, so use no deposit here.
    expect(createBooking(db, input({ pax: 10, depositCentavos: 0 }), TODAY).ok).toBe(true);
    expect(createBooking(db, input({ pax: 1000, depositCentavos: 0 }), TODAY).ok).toBe(true);
    expect((createBooking(db, input({ pax: 1001 }), TODAY) as any).errors.pax).toBeTruthy();
  });

  it('treats null notes and a null customer name as absent', () => {
    expect(createBooking(db, input({ notes: null }), TODAY).ok).toBe(true);
    const r = createBooking(db, input({ customerName: null as any, customerId: undefined }), TODAY);
    expect(r.ok).toBe(false);
    expect((r as any).errors.customerName).toBeTruthy();
  });

  it('writes nothing when validation fails', () => {
    const before = count('bookings', '1=1');
    createBooking(db, input({ pax: 5 }), TODAY);
    expect(count('bookings', '1=1')).toBe(before);
  });
});

describe('updateBooking and rederive', () => {
  it('re-derive keeps payments', () => {
    const id = (createBooking(db, input({ pax: 100 }), TODAY) as any).id as number;
    db.prepare("insert into payments (booking_id, amount, paid_on, method) values (?, 1_000_000, ?, 'cash')").run(id, TODAY);
    const qtyBefore = (db.prepare('select max(qty) as q from job_lines jl join job_sheets js on js.id = jl.job_sheet_id where js.booking_id = ?').get(id) as any).q;
    const r = updateBooking(db, id, input({ pax: 150 }), TODAY);
    expect(r.ok).toBe(true);
    const qtyAfter = (db.prepare('select max(qty) as q from job_lines jl join job_sheets js on js.id = jl.job_sheet_id where js.booking_id = ?').get(id) as any).q;
    expect(qtyAfter).toBeGreaterThan(qtyBefore);
    expect(count('payments', 'booking_id = ?', id)).toBe(2);
    const total = (db.prepare('select b.pax * p.price_per_pax as t from bookings b join packages p on p.id = b.package_id where b.id = ?').get(id) as any).t;
    expect((db.prepare('select sum(amount) as s from invoices where booking_id = ?').get(id) as any).s).toBe(total);
    expect(count('shifts', 'booking_id = ?', id)).toBe(deriveManpower(150, loadRatios(db)).reduce((s, n) => s + n.headcount, 0));
  });

  it('recomputes a shared production day when one booking changes', () => {
    const a = (createBooking(db, input({ pax: 100, packageId: 1, venueArea: '2nd Floor' }), TODAY) as any).id as number;
    const b = (createBooking(db, input({ pax: 60, packageId: 1, venueArea: '3rd Floor', startTime: '17:00', endTime: '21:00' }), TODAY) as any).id as number;
    const prodDate = addDays('2026-12-05', -1);
    const ingredient = (db.prepare('select ingredient_id from recipe_lines rl join package_items pi on pi.menu_item_id = rl.menu_item_id join ingredients i on i.id = rl.ingredient_id where pi.package_id = 1 and i.fresh = 0 limit 1').get() as any).ingredient_id;
    const qty = () => (db.prepare('select pl.qty from production_lines pl join production_runs pr on pr.id = pl.run_id where pr.date = ? and pl.ingredient_id = ?').get(prodDate, ingredient) as any).qty as number;
    const before = qty();
    updateBooking(db, b, input({ pax: 120, packageId: 1, venueArea: '3rd Floor', startTime: '17:00', endTime: '21:00' }), TODAY);
    const after = qty();
    expect(after).toBeGreaterThan(before);
    // Still exactly one aggregated line for that ingredient on that day.
    expect(count('production_lines pl join production_runs pr on pr.id = pl.run_id', 'pr.date = ? and pl.ingredient_id = ?', prodDate, ingredient)).toBe(1);
    expect(a).not.toBe(b);
  });

  it('moves production when the event date changes', () => {
    const id = (createBooking(db, input({ date: '2031-05-10' }), TODAY) as any).id as number;
    expect(count('production_runs', 'date = ?', '2031-05-09')).toBe(1);
    updateBooking(db, id, input({ date: '2031-06-10' }), TODAY);
    expect(count('production_runs', 'date = ?', '2031-05-09')).toBe(0);
    expect(count('production_runs', 'date = ?', '2031-06-09')).toBe(1);
  });

  it('moves assigned shifts to the new date and times when the event changes', () => {
    const id = (createBooking(db, input({ date: '2031-05-10', startTime: '11:00', endTime: '15:00' }), TODAY) as any).id as number;
    const staffId = (db.prepare("select id from staff where role = 'servers' limit 1").get() as any).id;
    const shiftId = (db.prepare("select id from shifts where booking_id = ? and role = 'servers' limit 1").get(id) as any).id;
    db.prepare('update shifts set staff_id = ? where id = ?').run(staffId, shiftId);
    const r = updateBooking(db, id, input({ date: '2031-05-11', startTime: '17:00', endTime: '22:00' }), TODAY);
    expect(r.ok).toBe(true);
    const s = db.prepare('select date, start_time, end_time, staff_id from shifts where id = ?').get(shiftId) as any;
    expect(s).toEqual({ date: '2031-05-11', start_time: '15:00', end_time: '23:00', staff_id: staffId });
    const stale = db.prepare("select count(*) as n from shifts where booking_id = ? and (date != '2031-05-11' or start_time != '15:00' or end_time != '23:00')").get(id) as any;
    expect(stale.n).toBe(0);
  });

  it('keeps the recorded deposit when the edit form sends a different deposit', () => {
    const id = (createBooking(db, input({ depositCentavos: 2_000_000 }), TODAY) as any).id as number;
    const r = updateBooking(db, id, input({ pax: 120, depositCentavos: 9_000_000 }), TODAY);
    expect(r.ok).toBe(true);
    const dep = db.prepare("select amount from invoices where booking_id = ? and label = 'Deposit'").get(id) as any;
    expect(dep.amount).toBe(2_000_000);
    expect((db.prepare('select sum(amount) as s from payments where booking_id = ?').get(id) as any).s).toBe(2_000_000);
  });

  it('allows editing a past booking when the date is unchanged but not moving it to another past date', () => {
    const past = db.prepare("select id, date, start_time, end_time, pax, package_id, venue_area, customer_id from bookings where status = 'done' and venue_area != 'Off-site' order by date desc limit 1").get() as any;
    const same = updateBooking(db, past.id, { customerId: past.customer_id, date: past.date, startTime: past.start_time, endTime: past.end_time, pax: past.pax, packageId: past.package_id, venueArea: past.venue_area, depositCentavos: 0, notes: 'Fixed a typo' }, TODAY);
    expect(same.ok).toBe(true);
    expect((db.prepare('select notes from bookings where id = ?').get(past.id) as any).notes).toBe('Fixed a typo');
    const moved = updateBooking(db, past.id, { customerId: past.customer_id, date: addDays(past.date, -1), startTime: past.start_time, endTime: past.end_time, pax: past.pax, packageId: past.package_id, venueArea: past.venue_area, depositCentavos: 0, notes: null }, TODAY);
    expect(moved.ok).toBe(false);
    expect((moved as any).errors.date).toBeTruthy();
  });

  it('reports an unknown booking on update and rederive', () => {
    expect((updateBooking(db, 999_999, input(), TODAY) as any).errors.form).toBe('Not found');
    expect((rederive(db, 999_999, TODAY) as any).errors.form).toBe('Not found');
  });
});
