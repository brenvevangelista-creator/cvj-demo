// Database-side writer for the derived records of a booking. Used by the seed
// and by booking create/edit. The rules themselves live in lib/derive.ts.
import type { Db } from '@/lib/db';
import { addDays } from '@/lib/dates';
import { deriveJobSheet, deriveManpower, derivePaymentSchedule, deriveProduction } from '@/lib/derive';
import type { BookingCore, JobSheet, ManpowerRatio, PackageDef, RecipeLine } from '@/lib/types';

export function loadPackage(db: Db, packageId: number): PackageDef | null {
  const p = db.prepare('select id, name, price_per_pax, service_style from packages where id = ?').get(packageId) as any;
  if (!p) return null;
  const items = db
    .prepare('select pi.menu_item_id, mi.name, pi.portions_per_pax from package_items pi join menu_items mi on mi.id = pi.menu_item_id where pi.package_id = ? order by pi.id')
    .all(packageId) as any[];
  return {
    id: p.id,
    name: p.name,
    pricePerPax: p.price_per_pax,
    serviceStyle: p.service_style,
    items: items.map((i) => ({ menuItemId: i.menu_item_id, name: i.name, portionsPerPax: i.portions_per_pax })),
  };
}

export function loadRecipes(db: Db): RecipeLine[] {
  return (
    db
      .prepare('select rl.menu_item_id, rl.ingredient_id, rl.qty_per_portion, i.fresh from recipe_lines rl join ingredients i on i.id = rl.ingredient_id')
      .all() as any[]
  ).map((r) => ({ menuItemId: r.menu_item_id, ingredientId: r.ingredient_id, qtyPerPortion: r.qty_per_portion, fresh: !!r.fresh }));
}

export function loadRatios(db: Db): ManpowerRatio[] {
  return (db.prepare('select role, pax_per_head, fixed_count from manpower_ratios order by id').all() as any[]).map((r) => ({
    role: r.role,
    paxPerHead: r.pax_per_head,
    fixedCount: r.fixed_count,
  }));
}

export function loadBookingCore(db: Db, bookingId: number, depositCentavos = 0): BookingCore | null {
  const b = db.prepare('select id, date, start_time, end_time, pax, package_id, venue_area from bookings where id = ?').get(bookingId) as any;
  if (!b) return null;
  return { id: b.id, date: b.date, startTime: b.start_time, endTime: b.end_time, pax: b.pax, packageId: b.package_id, venueArea: b.venue_area, depositCentavos };
}

/** Which unit a manpower role belongs to. */
const ROLE_UNIT: Record<string, string> = {
  servers: 'catering',
  cooks: 'commissary',
  dishwashers: 'catering',
  'parking marshals': 'parking',
  supervisor: 'events',
};

function shiftTime(hhmm: string, deltaHours: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const nh = Math.min(23, Math.max(0, h + deltaHours));
  return `${String(nh).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Write the job sheet, open shifts and invoices for a booking. Call inside a
 * transaction. The existing job sheet, UNASSIGNED shifts and invoices for the
 * booking are replaced; assigned shifts and payments are kept. Production lines
 * for the booking's dates are rebuilt afterwards by recomputeProduction.
 */
export function writeDerived(db: Db, b: BookingCore, pkg: PackageDef, today: string): JobSheet {
  const sheet = deriveJobSheet(b, pkg);
  db.prepare('delete from job_sheets where booking_id = ?').run(b.id);
  const js = db
    .prepare('insert into job_sheets (booking_id, service_style, in_site, pax) values (?, ?, ?, ?)')
    .run(b.id, sheet.serviceStyle, b.venueArea === 'Off-site' ? 0 : 1, sheet.pax);
  const insLine = db.prepare('insert into job_lines (job_sheet_id, menu_item_id, qty) values (?, ?, ?)');
  for (const l of sheet.lines) insLine.run(js.lastInsertRowid, l.menuItemId, l.qty);

  // Shifts: keep assigned ones, top up to the required headcount per role.
  const needs = deriveManpower(b.pax, loadRatios(db));
  db.prepare('delete from shifts where booking_id = ? and staff_id is null').run(b.id);
  const unitId = db.prepare('select id from units where slug = ?');
  const insShift = db.prepare('insert into shifts (date, start_time, end_time, unit_id, role, staff_id, booking_id) values (?, ?, ?, ?, ?, null, ?)');
  const assigned = db.prepare('select count(*) as n from shifts where booking_id = ? and role = ? and staff_id is not null');
  for (const n of needs) {
    const have = (assigned.get(b.id, n.role) as any).n as number;
    const uid = (unitId.get(ROLE_UNIT[n.role] ?? 'events') as any).id;
    for (let i = have; i < n.headcount; i++) insShift.run(b.date, shiftTime(b.startTime, -2), shiftTime(b.endTime, 1), uid, n.role, b.id);
  }

  // Invoices (payments untouched).
  db.prepare('delete from invoices where booking_id = ?').run(b.id);
  const insInv = db.prepare('insert into invoices (booking_id, label, amount, due_date) values (?, ?, ?, ?)');
  for (const inv of derivePaymentSchedule(b, pkg, today)) insInv.run(b.id, inv.label, inv.amount, inv.dueDate);
  return sheet;
}

/** Remove every derived row of a booking (used when a booking is cancelled). */
export function deleteDerived(db: Db, bookingId: number): void {
  db.prepare('delete from job_sheets where booking_id = ?').run(bookingId);
  db.prepare('delete from shifts where booking_id = ?').run(bookingId);
  db.prepare('delete from invoices where booking_id = ?').run(bookingId);
}

function activeSheets(db: Db, where: string, params: unknown[]): { sheets: JobSheet[]; dateOf: Map<number, string> } {
  const rows = db
    .prepare(`select js.id, js.booking_id, js.service_style, js.in_site, js.pax, b.date from job_sheets js join bookings b on b.id = js.booking_id where b.status in ('confirmed','done') and ${where}`)
    .all(...params) as any[];
  const lines = db.prepare('select jl.menu_item_id, mi.name, jl.qty from job_lines jl join menu_items mi on mi.id = jl.menu_item_id where jl.job_sheet_id = ?');
  const dateOf = new Map<number, string>();
  const sheets: JobSheet[] = rows.map((r) => {
    dateOf.set(r.booking_id, r.date);
    return {
      bookingId: r.booking_id,
      serviceStyle: r.service_style,
      inSite: !!r.in_site,
      pax: r.pax,
      lines: (lines.all(r.id) as any[]).map((l) => ({ menuItemId: l.menu_item_id, name: l.name, qty: l.qty })),
    };
  });
  return { sheets, dateOf };
}

function writeProductionLines(db: Db, lines: { productionDate: string; ingredientId: number; qty: number }[]): void {
  const run = db.prepare('insert into production_runs (date) values (?) on conflict(date) do nothing');
  const runId = db.prepare('select id from production_runs where date = ?');
  const ins = db.prepare('insert into production_lines (run_id, ingredient_id, qty) values (?, ?, ?) on conflict(run_id, ingredient_id) do update set qty = excluded.qty');
  for (const l of lines) {
    run.run(l.productionDate);
    ins.run((runId.get(l.productionDate) as any).id, l.ingredientId, l.qty);
  }
}

/** Rebuild production lines for the given production dates from all active job sheets. */
export function recomputeProduction(db: Db, productionDates: string[]): void {
  const dates = [...new Set(productionDates)];
  if (!dates.length) return;
  // Sheets that can contribute to these dates: event on the date (fresh) or the day after (regular).
  const eventDates = [...new Set(dates.flatMap((d) => [d, addDays(d, 1)]))];
  const { sheets, dateOf } = activeSheets(db, `b.date in (${eventDates.map(() => '?').join(',')})`, eventDates);
  const all = deriveProduction(sheets, loadRecipes(db), (id) => dateOf.get(id)!);
  const del = db.prepare('delete from production_lines where run_id in (select id from production_runs where date = ?)');
  for (const d of dates) del.run(d);
  writeProductionLines(db, all.filter((l) => dates.includes(l.productionDate)));
  db.prepare('delete from production_runs where id not in (select distinct run_id from production_lines)').run();
}

/** Rebuild every production line from scratch (seed only; the demo database is disposable). */
export function rebuildAllProduction(db: Db): void {
  db.prepare('delete from production_lines where 1 = 1').run();
  db.prepare('delete from production_runs where 1 = 1').run();
  const { sheets, dateOf } = activeSheets(db, '1=1', []);
  writeProductionLines(db, deriveProduction(sheets, loadRecipes(db), (id) => dateOf.get(id)!));
}

/** The production dates a booking touches. */
export function productionDatesOf(eventDate: string): string[] {
  return [addDays(eventDate, -1), eventDate];
}
