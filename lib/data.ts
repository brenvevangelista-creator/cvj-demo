import 'server-only';
// Read layer. Every function runs SQL only; business rules live in lib/derive.ts
// and lib/conflicts.ts. The optional trailing `db` argument is for tests.
import { getDb, type Db } from '@/lib/db';
import { addDays, monthDays } from '@/lib/dates';
import { findConflicts, type Conflict, type ConflictBooking } from '@/lib/conflicts';
import type { PackageDef } from '@/lib/types';
import { loadPackage } from '@/lib/derived';

export interface Approval {
  id: number;
  kind: string;
  unitName: string;
  requestedBy: string;
  amount: number;
  status: 'pending' | 'approved' | 'declined';
}

export interface UnitCard {
  slug: string;
  name: string;
  revenueToday: number;
  activityLabel: string;
  activityCount: number;
  alert: string | null;
}

export interface Overview {
  totals: {
    revenueToday: number;
    revenueMtd: number;
    bookingsThisWeek: number;
    staffOnShift: number;
    collectedMtd: number;
    dueMtd: number;
  };
  units: UnitCard[];
  approvals: Approval[];
}

export interface BookingRow {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  customer: string;
  pax: number;
  packageName: string;
  venueArea: string;
  status: string;
  total: number;
  collected: number;
  balanceDue: number;
}

export interface BookingDetail extends BookingRow {
  notes: string | null;
  customerId: number;
  package: PackageDef;
  jobSheet: { serviceStyle: string; inSite: boolean; pax: number; lines: { name: string; qty: number }[] } | null;
  productionLines: { productionDate: string; ingredient: string; uom: string; qty: number }[];
  shifts: { id: number; role: string; startTime: string; endTime: string; staff: string | null }[];
  invoices: { id: number; label: string; amount: number; dueDate: string }[];
  payments: { id: number; amount: number; paidOn: string; method: string }[];
}

export interface ScheduleItem {
  kind: 'event' | 'catering' | 'court' | 'production' | 'shift';
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  unitSlug: string;
  href?: string;
  pax?: number;
  venueArea?: string;
}

const UNIT_ORDER = ['events', 'catering', 'cafe', 'commissary', 'parking', 'pickleball'];

const n = (row: unknown): number => Number((row as any)?.v ?? 0);

export function getOverview(today: string, db: Db = getDb()): Overview {
  const monthStart = today.slice(0, 7) + '-01';
  const weekEnd = addDays(today, 6);
  const horizon = addDays(today, 60);

  const paidOn = db.prepare('select coalesce(sum(p.amount),0) as v from payments p join bookings b on b.id = p.booking_id join units u on u.id = b.unit_id where u.slug = ? and p.paid_on = ?');
  const paidBetween = db.prepare('select coalesce(sum(p.amount),0) as v from payments p join bookings b on b.id = p.booking_id join units u on u.id = b.unit_id where u.slug = ? and p.paid_on between ? and ?');
  const cafeOn = db.prepare('select coalesce(sum(sales),0) as v, coalesce(sum(transactions),0) as tx from cafe_daily where date = ?');
  const cafeBetween = db.prepare('select coalesce(sum(sales),0) as v from cafe_daily where date between ? and ?');
  const parkOn = db.prepare('select coalesce(sum(revenue),0) as v, coalesce(sum(vehicles),0) as vehicles from parking_logs where date = ?');
  const parkBetween = db.prepare('select coalesce(sum(revenue),0) as v from parking_logs where date between ? and ?');
  const courtOn = db.prepare('select coalesce(sum(fee),0) as v, count(*) as hours from court_bookings where date = ?');
  const courtBetween = db.prepare('select coalesce(sum(fee),0) as v from court_bookings where date between ? and ?');

  const eventsToday = n(db.prepare("select count(*) as v from bookings b join units u on u.id = b.unit_id where u.slug = 'events' and b.date = ? and b.status in ('confirmed','done')").get(today));
  const cateringJobsToday = n(db.prepare("select count(*) as v from job_sheets js join bookings b on b.id = js.booking_id where b.date = ? and b.status in ('confirmed','done')").get(today));
  const runsToday = n(db.prepare('select count(*) as v from production_runs where date = ?').get(today));
  const cafe = cafeOn.get(today) as any;
  const park = parkOn.get(today) as any;
  const court = courtOn.get(today) as any;

  // Alerts
  const upcoming = db
    .prepare("select id, date, start_time as startTime, end_time as endTime, venue_area as venueArea, pax, status from bookings where date between ? and ? and status in ('confirmed','inquiry')")
    .all(today, horizon) as any[];
  const parkingCapacity = n(db.prepare("select capacity as v from units where slug = 'parking'").get());
  const conflicts = findConflicts(upcoming, parkingCapacity);
  const venueConflict = conflicts.find((c) => c.kind === 'venue');
  const overdue = db.prepare("select count(*) as v from invoices i join bookings b on b.id = i.booking_id where b.status = 'confirmed' and i.due_date < ? and i.amount > (select coalesce(sum(amount),0) from payments p where p.booking_id = b.id) ").get(today);
  const openShifts = n(db.prepare('select count(*) as v from shifts where staff_id is null and date between ? and ?').get(today, weekEnd));
  const lowStock = db
    .prepare('select i.name, i.uom, s.on_hand from ingredients i join (select ingredient_id, sum(qty) as on_hand from stock_movements group by ingredient_id) s on s.ingredient_id = i.id where s.on_hand < i.par_level order by s.on_hand / i.par_level limit 1')
    .get() as any;
  const parkingConflict = conflicts.find((c) => c.kind === 'parking');

  const alerts: Record<string, string | null> = {
    events: venueConflict ? venueConflict.message : n(overdue) > 0 ? `${n(overdue)} overdue invoice${n(overdue) > 1 ? 's' : ''}` : null,
    catering: openShifts > 0 ? `${openShifts} open shift${openShifts > 1 ? 's' : ''} in the next 7 days` : null,
    cafe: null,
    commissary: lowStock ? `Low stock: ${lowStock.name} ${lowStock.on_hand} ${lowStock.uom}` : null,
    parking: parkingConflict ? parkingConflict.message : null,
    pickleball: null,
  };

  const unitRows = db.prepare('select slug, name from units').all() as { slug: string; name: string }[];
  const units: UnitCard[] = UNIT_ORDER.map((slug) => {
    const u = unitRows.find((r) => r.slug === slug)!;
    switch (slug) {
      case 'events':
        return { slug, name: u.name, revenueToday: n(paidOn.get('events', today)), activityLabel: 'events today', activityCount: eventsToday, alert: alerts.events };
      case 'catering':
        return { slug, name: u.name, revenueToday: n(paidOn.get('catering', today)), activityLabel: 'jobs today', activityCount: cateringJobsToday, alert: alerts.catering };
      case 'cafe':
        return { slug, name: u.name, revenueToday: n(cafe), activityLabel: 'transactions', activityCount: Number(cafe.tx), alert: alerts.cafe };
      case 'commissary':
        return { slug, name: u.name, revenueToday: 0, activityLabel: 'production runs today', activityCount: runsToday, alert: alerts.commissary };
      case 'parking':
        return { slug, name: u.name, revenueToday: n(park), activityLabel: 'vehicles', activityCount: Number(park.vehicles), alert: alerts.parking };
      default:
        return { slug, name: u.name, revenueToday: n(court), activityLabel: 'court hours', activityCount: Number(court.hours), alert: alerts.pickleball };
    }
  });

  const revenueToday = units.reduce((s, u) => s + u.revenueToday, 0);
  const collectedMtd = n(paidBetween.get('events', monthStart, today)) + n(paidBetween.get('catering', monthStart, today));
  const revenueMtd = collectedMtd + n(cafeBetween.get(monthStart, today)) + n(parkBetween.get(monthStart, today)) + n(courtBetween.get(monthStart, today));
  const dueMtd = n(db.prepare("select coalesce(sum(i.amount),0) as v from invoices i join bookings b on b.id = i.booking_id where b.status = 'confirmed' and i.due_date between ? and ?").get(monthStart, today.slice(0, 7) + '-31'));
  const bookingsThisWeek = n(db.prepare("select count(*) as v from bookings where date between ? and ? and status in ('confirmed','done')").get(today, weekEnd));
  const staffOnShift = n(db.prepare('select count(distinct staff_id) as v from shifts where date = ? and staff_id is not null').get(today));

  const approvals = (
    db.prepare("select a.id, a.kind, u.name as unitName, a.requested_by as requestedBy, a.amount, a.status from approvals a join units u on u.id = a.unit_id where a.status = 'pending' order by a.id").all() as Approval[]
  );

  return { totals: { revenueToday, revenueMtd, bookingsThisWeek, staffOnShift, collectedMtd, dueMtd }, units, approvals };
}

const BOOKING_ROW_SQL = `
  select b.id, b.date, b.start_time as startTime, b.end_time as endTime, c.name as customer, b.pax,
         p.name as packageName, b.venue_area as venueArea, b.status,
         b.pax * p.price_per_pax as total,
         (select coalesce(sum(amount),0) from payments where booking_id = b.id) as collected
  from bookings b join customers c on c.id = b.customer_id join packages p on p.id = b.package_id`;

function withBalance<T extends { total: number; collected: number }>(r: T): T & { balanceDue: number } {
  return { ...r, balanceDue: Math.max(0, r.total - r.collected) };
}

export function listBookings(month: string, db: Db = getDb()): BookingRow[] {
  const days = monthDays(month);
  if (!days.length) return [];
  const rows = db.prepare(`${BOOKING_ROW_SQL} where b.date between ? and ? order by b.date, b.start_time`).all(days[0], days[days.length - 1]) as any[];
  return rows.map(withBalance);
}

export function getBooking(id: number, db: Db = getDb()): BookingDetail | null {
  const b = db.prepare(`${BOOKING_ROW_SQL} where b.id = ?`).get(id) as any;
  if (!b) return null;
  const extra = db.prepare('select notes, customer_id as customerId, package_id as packageId from bookings where id = ?').get(id) as any;
  const pkg = loadPackage(db, extra.packageId)!;
  const js = db.prepare('select id, service_style as serviceStyle, in_site as inSite, pax from job_sheets where booking_id = ?').get(id) as any;
  const jobSheet = js
    ? {
        serviceStyle: js.serviceStyle,
        inSite: !!js.inSite,
        pax: js.pax,
        lines: db.prepare('select mi.name, jl.qty from job_lines jl join menu_items mi on mi.id = jl.menu_item_id where jl.job_sheet_id = ? order by jl.id').all(js.id) as any[],
      }
    : null;
  // Production lines for this booking: recompute its own share from its job lines
  // (production_lines are aggregated across bookings per day).
  const productionLines = js
    ? (db
        .prepare(`select case when i.fresh = 1 then b.date else date(b.date, '-1 day') end as productionDate, i.name as ingredient, i.uom,
                         round(sum(jl.qty * rl.qty_per_portion), 3) as qty
                  from job_lines jl join recipe_lines rl on rl.menu_item_id = jl.menu_item_id
                  join ingredients i on i.id = rl.ingredient_id join bookings b on b.id = ?
                  where jl.job_sheet_id = ? group by productionDate, i.id order by productionDate, i.name`)
        .all(id, js.id) as any[])
    : [];
  const shifts = db.prepare('select s.id, s.role, s.start_time as startTime, s.end_time as endTime, st.name as staff from shifts s left join staff st on st.id = s.staff_id where s.booking_id = ? order by s.role, s.id').all(id) as any[];
  const invoices = db.prepare('select id, label, amount, due_date as dueDate from invoices where booking_id = ? order by id').all(id) as any[];
  const payments = db.prepare('select id, amount, paid_on as paidOn, method from payments where booking_id = ? order by paid_on, id').all(id) as any[];
  return { ...withBalance(b), notes: extra.notes, customerId: extra.customerId, package: pkg, jobSheet, productionLines, shifts, invoices, payments };
}

export function listCustomers(db: Db = getDb()): { id: number; name: string }[] {
  return db.prepare('select id, name from customers order by name').all() as any[];
}

export function listPackages(db: Db = getDb()): PackageDef[] {
  const ids = db.prepare('select id from packages order by id').all() as { id: number }[];
  return ids.map((r) => loadPackage(db, r.id)!);
}

/** Venue and parking conflicts among active bookings in a date range (inclusive). */
export function getConflicts(from: string, to: string, db: Db = getDb()): Conflict[] {
  if (from > to) return [];
  const rows = db
    .prepare("select id, date, start_time as startTime, end_time as endTime, venue_area as venueArea, pax, status from bookings where date between ? and ? and status in ('confirmed','inquiry','done')")
    .all(from, to) as ConflictBooking[];
  const capacity = n(db.prepare("select capacity as v from units where slug = 'parking'").get());
  return findConflicts(rows, capacity);
}

export function getScheduleItems(from: string, to: string, db: Db = getDb()): ScheduleItem[] {
  if (from > to) return [];
  const items: ScheduleItem[] = [];
  const bookings = db
    .prepare(`select b.id, b.date, b.start_time, b.end_time, b.pax, b.venue_area, c.name as customer, u.slug from bookings b join customers c on c.id = b.customer_id join units u on u.id = b.unit_id where b.date between ? and ? and b.status in ('confirmed','done','inquiry')`)
    .all(from, to) as any[];
  for (const b of bookings) {
    const offsite = b.venue_area === 'Off-site';
    items.push({
      kind: offsite ? 'catering' : 'event',
      date: b.date,
      startTime: b.start_time,
      endTime: b.end_time,
      title: `${b.customer} · ${b.pax} pax`,
      unitSlug: offsite ? 'catering' : 'events',
      href: `/events/${b.id}`,
      pax: b.pax,
      venueArea: b.venue_area,
    });
  }
  const courts = db.prepare('select date, court, min(hour) as h0, max(hour) as h1, count(*) as hours from court_bookings where date between ? and ? group by date, court').all(from, to) as any[];
  for (const c of courts) {
    items.push({ kind: 'court', date: c.date, startTime: `${String(c.h0).padStart(2, '0')}:00`, endTime: `${String(c.h1 + 1).padStart(2, '0')}:00`, title: `Court ${c.court} · ${c.hours} h booked`, unitSlug: 'pickleball' });
  }
  const runs = db.prepare('select pr.date, count(pl.id) as lines from production_runs pr join production_lines pl on pl.run_id = pr.id where pr.date between ? and ? group by pr.date').all(from, to) as any[];
  for (const r of runs) items.push({ kind: 'production', date: r.date, startTime: '05:00', endTime: '12:00', title: `Production · ${r.lines} ingredient lines`, unitSlug: 'commissary', href: '/schedule' });
  const shifts = db.prepare('select s.date, s.start_time, s.end_time, s.role, count(*) as heads, sum(case when s.staff_id is null then 1 else 0 end) as open from shifts s where s.date between ? and ? group by s.date, s.start_time, s.end_time, s.role').all(from, to) as any[];
  for (const s of shifts) items.push({ kind: 'shift', date: s.date, startTime: s.start_time, endTime: s.end_time, title: `${s.heads} ${s.role}${s.open ? ` (${s.open} open)` : ''}`, unitSlug: 'catering' });
  return items.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}
