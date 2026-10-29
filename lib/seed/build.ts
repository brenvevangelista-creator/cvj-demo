// Builds the whole demo dataset relative to `today`. Deterministic for a given today.
// The demo database is disposable sample data: the seed empties every table first.
import type { Db } from '@/lib/db';
import { withTransaction } from '@/lib/db';
import { addDays, weekday } from '@/lib/dates';
import { rng } from '@/lib/seed/rng';
import {
  APPROVALS, COMPANIES, FIRST_NAMES, INGREDIENTS, LOW_STOCK_INGREDIENT, MANPOWER_RATIOS, MENU_ITEMS,
  PACKAGES, STAFF, SURNAMES, UNITS, VENUE_AREAS,
} from '@/lib/seed/catalog';
import { loadBookingCore, loadPackage, rebuildAllProduction, writeDerived } from '@/lib/derived';

const SEED = 20261026;
const TABLES = [
  'payments', 'invoices', 'shifts', 'production_lines', 'production_runs', 'job_lines', 'job_sheets',
  'bookings', 'inquiries', 'court_bookings', 'parking_logs', 'cafe_daily', 'cash_closes', 'approvals',
  'expenses', 'stock_movements', 'recipe_lines', 'package_items', 'packages', 'menu_items', 'ingredients',
  'staff', 'manpower_ratios', 'customers', 'units',
];

const START_TIMES = ['10:00', '11:00', '12:00', '17:00', '18:00'];
const PAY_METHODS = ['bank transfer', 'GCash', 'cash', 'cheque'];

/** Empty every demo table, child tables first. Ids restart at 1 once a table is empty. */
function emptyTables(db: Db): void {
  for (const t of TABLES) db.prepare(`delete from ${t} where 1 = 1`).run();
}

export function seedDatabase(db: Db, today: string): void {
  const r = rng(SEED);
  withTransaction(db, () => {
    emptyTables(db);

    // Units
    const unitId: Record<string, number> = {};
    const insUnit = db.prepare('insert into units (slug, name, kind, capacity) values (?, ?, ?, ?)');
    for (const u of UNITS) unitId[u.slug] = Number(insUnit.run(u.slug, u.name, u.kind, u.capacity).lastInsertRowid);

    // Manpower ratios
    const insRatio = db.prepare('insert into manpower_ratios (role, pax_per_head, fixed_count) values (?, ?, ?)');
    for (const m of MANPOWER_RATIOS) insRatio.run(m.role, m.paxPerHead, m.fixedCount);

    // Ingredients + opening stock
    const ingId: Record<string, number> = {};
    const insIng = db.prepare('insert into ingredients (name, uom, cost_per_unit, par_level, fresh) values (?, ?, ?, ?, ?)');
    const insMove = db.prepare("insert into stock_movements (ingredient_id, date, qty, reason) values (?, ?, ?, 'opening stock')");
    for (const [name, uom, cost, par, fresh] of INGREDIENTS) {
      const id = Number(insIng.run(name, uom, cost, par, fresh ? 1 : 0).lastInsertRowid);
      ingId[name] = id;
      const factor = name === LOW_STOCK_INGREDIENT ? 0.4 : 1.5 + r.next();
      insMove.run(id, addDays(today, -1), Math.round(par * factor * 10) / 10);
    }

    // Menu items + recipes
    const menuId: Record<string, number> = {};
    const insMenu = db.prepare('insert into menu_items (name, unit_id, price) values (?, ?, ?)');
    const insRecipe = db.prepare('insert into recipe_lines (menu_item_id, ingredient_id, qty_per_portion) values (?, ?, ?)');
    for (const m of MENU_ITEMS) {
      const id = Number(insMenu.run(m.name, unitId[m.unit], m.price).lastInsertRowid);
      menuId[m.name] = id;
      for (const [ing, qty] of m.recipe) insRecipe.run(id, ingId[ing], qty);
    }

    // Packages
    const packageIds: number[] = [];
    const insPkg = db.prepare('insert into packages (name, price_per_pax, service_style) values (?, ?, ?)');
    const insPkgItem = db.prepare('insert into package_items (package_id, menu_item_id, portions_per_pax) values (?, ?, ?)');
    for (const p of PACKAGES) {
      const id = Number(insPkg.run(p.name, p.pricePerPax, p.serviceStyle).lastInsertRowid);
      packageIds.push(id);
      for (const [item, portions] of p.items) insPkgItem.run(id, menuId[item], portions);
    }

    // Staff
    const staffByRole: Record<string, number[]> = {};
    const insStaff = db.prepare('insert into staff (name, unit_id, role, hourly_rate) values (?, ?, ?, ?)');
    for (const [name, unit, role, rate] of STAFF) {
      const id = Number(insStaff.run(name, unitId[unit], role, rate).lastInsertRowid);
      (staffByRole[role] ??= []).push(id);
    }

    // Customers
    const customerIds: number[] = [];
    const insCust = db.prepare('insert into customers (name, phone, email, company, source) values (?, ?, ?, ?, ?)');
    const sources = ['referral', 'facebook', 'walk-in', 'repeat', 'website'];
    for (let i = 0; i < 160; i++) {
      const first = r.pick(FIRST_NAMES);
      const last = r.pick(SURNAMES);
      const company = r.chance(0.25) ? r.pick(COMPANIES) : null;
      const email = `${first}.${last}`.toLowerCase().replace(/\s+/g, '') + '@example.com';
      customerIds.push(Number(insCust.run(`${first} ${last}`, `09${r.int(100000000, 999999999)}`, email, company, r.pick(sources)).lastInsertRowid));
    }

    // Bookings
    const insBooking = db.prepare('insert into bookings (customer_id, unit_id, date, start_time, end_time, pax, package_id, venue_area, status, notes) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insPayment = db.prepare('insert into payments (booking_id, amount, paid_on, method) values (?, ?, ?, ?)');
    const invoicesOf = db.prepare('select label, amount, due_date from invoices where booking_id = ? order by id');
    const openShifts = db.prepare('select id, role, date, start_time, end_time from shifts where booking_id = ? and staff_id is null');
    // Is this person already on a shift that overlaps date/start/end? (args: staff, date, end, start)
    const busyAt = db.prepare('select 1 from shifts where staff_id = ? and date = ? and start_time < ? and end_time > ? limit 1');
    const assign = db.prepare('update shifts set staff_id = ? where id = ?');

    type Planned = { offset: number; start: string; hours: number; pax: number; area: string; status: string; offsite?: boolean };
    const planned: Planned[] = [];
    for (let i = 0; i < 48; i++) {
      const offset = r.int(-90, 60);
      const status = offset < 0 ? (r.chance(0.08) ? 'cancelled' : 'done') : r.chance(0.12) ? 'inquiry' : 'confirmed';
      const offsite = r.chance(0.12);
      planned.push({
        offset,
        start: r.pick(START_TIMES),
        hours: r.int(4, 5),
        pax: r.int(4, 40) * 5,
        area: offsite ? 'Off-site' : r.pick(VENUE_AREAS),
        status,
        offsite,
      });
    }
    // Planted event today so the overview has live numbers.
    planned.push({ offset: 0, start: '11:00', hours: 4, pax: 120, area: '2nd Floor', status: 'confirmed' });
    // Planted double-booking on the Ground Floor, 12 days out. 150 + 220 guests also
    // overflow the 120-slot parking lot (50 + 74 vehicles), so both conflict kinds show.
    planned.push({ offset: 12, start: '10:00', hours: 4, pax: 150, area: 'Ground Floor', status: 'confirmed' });
    planned.push({ offset: 12, start: '13:00', hours: 5, pax: 220, area: 'Ground Floor', status: 'confirmed' });
    // Planted off-site catering jobs so the catering business has its own recent
    // revenue: three done in the last 30 days, one today and one next week.
    for (const [offset, start, pax, status] of [
      [-4, '10:00', 80, 'done'],
      [-11, '17:00', 150, 'done'],
      [-23, '11:00', 60, 'done'],
      [0, '16:00', 100, 'confirmed'],
      [6, '11:00', 200, 'confirmed'],
    ] as const) {
      planned.push({ offset, start, hours: 4, pax, area: 'Off-site', status, offsite: true });
    }

    for (const p of planned) {
      const date = addDays(today, p.offset);
      const end = `${String(Math.min(23, Number(p.start.slice(0, 2)) + p.hours)).padStart(2, '0')}:00`;
      const pkgId = r.pick(packageIds);
      const deposit = p.status === 'inquiry' ? 0 : r.pick([20, 25, 30]) * 1000 * 100; // ₱20k–30k
      const unit = p.offsite ? unitId.catering : unitId.events;
      const bookingId = Number(
        insBooking.run(r.pick(customerIds), unit, date, p.start, end, p.pax, pkgId, p.area, p.status, p.offsite ? 'Off-site catering job' : null).lastInsertRowid,
      );
      if (p.status === 'inquiry' || p.status === 'cancelled') continue;

      // Booked some weeks before the event; never after today.
      let bookedOn = addDays(date, -r.int(30, 120));
      if (bookedOn > today) bookedOn = today;
      const core = loadBookingCore(db, bookingId, deposit)!;
      writeDerived(db, core, loadPackage(db, pkgId)!, bookedOn);

      const invoices = invoicesOf.all(bookingId) as any[];
      if (p.status === 'done') {
        for (const inv of invoices) if (inv.amount > 0) insPayment.run(bookingId, inv.amount, inv.due_date, r.pick(PAY_METHODS));
      } else if (invoices[0].amount > 0) {
        insPayment.run(bookingId, invoices[0].amount, invoices[0].due_date, r.pick(PAY_METHODS));
      }

      // Roster: done events fully staffed; upcoming ones mostly staffed, a few open.
      // A person is never put on two overlapping shifts; when everyone in the
      // role is already working at that time, the shift stays open.
      for (const s of openShifts.all(bookingId) as any[]) {
        const fill = p.status === 'done' ? true : r.chance(0.7);
        const free = (staffByRole[s.role] ?? []).filter((id) => !busyAt.get(id, s.date, s.end_time, s.start_time));
        if (fill && free.length) assign.run(r.pick(free), s.id);
      }
    }
    rebuildAllProduction(db);

    // Daily rosters for the businesses that run every day: cafe, courts, parking.
    // One shift per working day per person, with one day off a week, 90 days back and 14 ahead.
    const dailyRoles: Record<string, { start: string; end: string }> = {
      barista: { start: '07:00', end: '15:00' },
      cashier: { start: '10:00', end: '18:00' },
      'court attendant': { start: '06:00', end: '14:00' },
      'parking marshals': { start: '08:00', end: '16:00' },
    };
    const dailyStaff = db.prepare('select id, unit_id, role from staff where role in (?, ?, ?, ?)').all(...Object.keys(dailyRoles)) as { id: number; unit_id: number; role: string }[];
    const insDaily = db.prepare('insert into shifts (date, start_time, end_time, unit_id, role, staff_id, booking_id) values (?, ?, ?, ?, ?, ?, null)');
    for (let off = -90; off <= 14; off++) {
      const date = addDays(today, off);
      dailyStaff.forEach((s, i) => {
        if (weekday(date) === (i % 7)) return; // day off, staggered across the week
        const w = dailyRoles[s.role];
        if (busyAt.get(s.id, date, w.end, w.start)) return; // already working an event at that time
        insDaily.run(date, w.start, w.end, s.unit_id, s.role, s.id);
      });
    }

    // Inquiries pipeline
    const insInq = db.prepare('insert into inquiries (customer_id, unit_id, stage, pax, target_date, value_estimate) values (?, ?, ?, ?, ?, ?)');
    const stages = ['inquiry', 'inquiry', 'site_visit', 'site_visit', 'proposal_sent', 'proposal_sent', 'booked', 'lost'];
    for (let i = 0; i < 12; i++) {
      const pax = r.int(6, 40) * 5;
      insInq.run(r.pick(customerIds), unitId.events, r.pick(stages), pax, addDays(today, r.int(20, 120)), pax * r.pick([62_000, 88_000, 125_000]));
    }

    // Daily logs for the past 90 days (and courts 14 days ahead)
    const eventDays = new Set((db.prepare("select date from bookings where status in ('confirmed','done') and venue_area != 'Off-site'").all() as any[]).map((x) => x.date));
    const insCafe = db.prepare('insert into cafe_daily (date, sales, transactions, top_items) values (?, ?, ?, ?)');
    const insPark = db.prepare('insert into parking_logs (date, vehicles, revenue) values (?, ?, ?)');
    const insCourt = db.prepare('insert into court_bookings (court, date, hour, customer_id, fee) values (?, ?, ?, ?, ?)');
    const cafeItems = MENU_ITEMS.filter((m) => m.unit === 'cafe').map((m) => m.name);
    for (let off = -90; off <= 14; off++) {
      const date = addDays(today, off);
      const wkend = weekday(date) === 0 || weekday(date) === 6;
      if (off <= 0) {
        const tx = r.int(wkend ? 110 : 60, wkend ? 190 : 130);
        insCafe.run(date, tx * r.int(21_000, 29_000), tx, JSON.stringify([r.pick(cafeItems), r.pick(cafeItems), r.pick(cafeItems)]));
        const vehicles = r.int(wkend ? 90 : 50, wkend ? 160 : 110) + (eventDays.has(date) ? r.int(40, 90) : 0);
        insPark.run(date, vehicles, vehicles * 5_000);
      }
      for (let court = 1; court <= 4; court++) {
        for (let hour = 6; hour <= 21; hour++) {
          const busy = hour >= 17 || hour <= 8 || wkend;
          if (r.chance(busy ? 0.65 : 0.3)) insCourt.run(court, date, hour, r.pick(customerIds), 45_000);
        }
      }
    }

    // Approvals: three pending plus a little history
    const insAppr = db.prepare('insert into approvals (kind, unit_id, requested_by, amount, status) values (?, ?, ?, ?, ?)');
    for (const a of APPROVALS) insAppr.run(a.kind, unitId[a.unit], a.requestedBy, a.amount, 'pending');
    insAppr.run('Discount request', unitId.events, 'Edgar Santos', 800_000, 'approved');
    insAppr.run('Purchase above limit', unitId.cafe, 'Ana Marie Lim', 2_400_000, 'declined');

    // Supplier bills
    const insExp = db.prepare('insert into expenses (supplier, unit_id, amount, due_date, paid) values (?, ?, ?, ?, ?)');
    const suppliers = ['Magnolia Poultry Supply', 'Bulacan Meats', 'Dagupan Fish Dealers', 'Rice Depot Inc.', 'Metro Dairy', 'Baguio Greens Co-op'];
    for (let i = 0; i < 14; i++) {
      const off = r.int(-20, 25);
      insExp.run(r.pick(suppliers), r.pick([unitId.commissary, unitId.cafe]), r.int(8, 60) * 100_000, addDays(today, off), off < -3 ? 1 : 0);
    }
  });
}
