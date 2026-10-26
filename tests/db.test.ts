import { describe, it, expect } from 'vitest';
import { openDb, withTransaction } from '@/lib/db';

const TABLES = [
  'units', 'customers', 'inquiries', 'bookings', 'packages', 'package_items', 'menu_items',
  'recipe_lines', 'ingredients', 'stock_movements', 'job_sheets', 'job_lines', 'production_runs',
  'production_lines', 'staff', 'shifts', 'manpower_ratios', 'invoices', 'payments', 'expenses',
  'court_bookings', 'parking_logs', 'cafe_daily', 'cash_closes', 'approvals',
];

describe('db', () => {
  it('openDb applies the schema', () => {
    const db = openDb(':memory:');
    const names = db
      .prepare("select name from sqlite_master where type='table'")
      .all()
      .map((r: any) => r.name as string);
    for (const t of TABLES) expect(names, `missing ${t}`).toContain(t);
  });

  it('withTransaction rolls back when the callback throws', () => {
    const db = openDb(':memory:');
    expect(() =>
      withTransaction(db, () => {
        db.prepare("insert into units (slug, name, kind, capacity) values ('x', 'X', 'test', 0)").run();
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(db.prepare('select count(*) as n from units').get()).toEqual({ n: 0 });
  });
});
