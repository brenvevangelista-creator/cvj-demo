import { describe, it, expect } from 'vitest';
import { openDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed/build';
import { overlaps } from '@/lib/dates';

const TODAY = '2026-10-26';

function seeded() {
  const db = openDb(':memory:');
  seedDatabase(db, TODAY);
  return db;
}
const count = (db: any, table: string, where = '1=1') =>
  (db.prepare(`select count(*) as n from ${table} where ${where}`).get() as any).n as number;

describe('seed', () => {
  it('populates customers and bookings in range', () => {
    const db = seeded();
    expect(count(db, 'customers')).toBeGreaterThanOrEqual(150);
    const b = count(db, 'bookings');
    expect(b).toBeGreaterThanOrEqual(40);
    expect(b).toBeLessThanOrEqual(60);
  });

  it('every confirmed or done booking has its derived rows', () => {
    const db = seeded();
    const rows = db
      .prepare(`select b.id, b.pax, p.price_per_pax from bookings b join packages p on p.id = b.package_id where b.status in ('confirmed','done')`)
      .all() as any[];
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(count(db, 'job_sheets', `booking_id = ${r.id}`), `job sheet for ${r.id}`).toBe(1);
      const prod = (db.prepare(`select count(*) as n from production_lines pl join production_runs pr on pr.id = pl.run_id join bookings b on b.id = ${r.id} where pr.date in (b.date, date(b.date, '-1 day'))`).get() as any).n;
      expect(prod, `production for ${r.id}`).toBeGreaterThanOrEqual(1);
      expect(count(db, 'shifts', `booking_id = ${r.id}`), `shifts for ${r.id}`).toBeGreaterThanOrEqual(5);
      expect(count(db, 'invoices', `booking_id = ${r.id}`), `invoices for ${r.id}`).toBe(3);
      const sum = (db.prepare(`select sum(amount) as s from invoices where booking_id = ${r.id}`).get() as any).s;
      expect(sum, `invoice total for ${r.id}`).toBe(r.pax * r.price_per_pax);
    }
  });

  it('plants pending approvals, a double-booking and a low-stock ingredient', () => {
    const db = seeded();
    expect(count(db, 'approvals', "status = 'pending'")).toBeGreaterThanOrEqual(1);

    const bookings = db.prepare(`select id, date, venue_area, start_time, end_time from bookings where status = 'confirmed'`).all() as any[];
    let conflict = false;
    for (const a of bookings) for (const b of bookings) {
      if (a.id < b.id && a.date === b.date && a.venue_area === b.venue_area && overlaps(a.start_time, a.end_time, b.start_time, b.end_time)) conflict = true;
    }
    expect(conflict).toBe(true);

    const low = db.prepare(`select i.name from ingredients i join (select ingredient_id, sum(qty) as on_hand from stock_movements group by ingredient_id) s on s.ingredient_id = i.id where s.on_hand < i.par_level`).all();
    expect(low.length).toBeGreaterThanOrEqual(1);
  });

  it('is deterministic for the same today', () => {
    const q = `select id, customer_id, date, start_time, end_time, pax, package_id, venue_area, status from bookings order by id`;
    const a = seeded().prepare(q).all();
    const b = seeded().prepare(q).all();
    expect(a).toEqual(b);
  });
});
