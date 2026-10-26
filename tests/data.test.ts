import { describe, it, expect, beforeAll } from 'vitest';
import { openDb, type Db } from '@/lib/db';
import { seedDatabase } from '@/lib/seed/build';
import { getOverview, listBookings, getBooking, listCustomers, listPackages, getScheduleItems, getConflicts, getAnalytics } from '@/lib/data';
import { addDays } from '@/lib/dates';

const TODAY = '2026-10-26';
const DOUBLE_BOOKING_DATE = addDays(TODAY, 12); // planted by the seed

let db: Db;
beforeAll(() => {
  db = openDb(':memory:');
  seedDatabase(db, TODAY);
});

describe('getOverview', () => {
  it('returns the six units in fixed order with at least one alert', () => {
    const o = getOverview(TODAY, db);
    expect(o.units.map((u) => u.name)).toEqual(['Events Place', 'Catering', 'Cafe', 'Commissary', 'Parking', 'Pickleball']);
    expect(o.units.some((u) => u.alert !== null)).toBe(true);
    expect(o.approvals.length).toBeGreaterThanOrEqual(1);
    expect(o.approvals.every((a) => a.status === 'pending')).toBe(true);
    expect(o.totals.revenueMtd).toBeGreaterThan(0);
  });

  it('flags the planted double-booking on the Events Place card', () => {
    const o = getOverview(TODAY, db);
    expect(o.units[0].alert).toMatch(/double-booked/);
  });
});

describe('listBookings', () => {
  it('returns both planted bookings for their month', () => {
    const rows = listBookings(DOUBLE_BOOKING_DATE.slice(0, 7), db);
    const planted = rows.filter((r) => r.date === DOUBLE_BOOKING_DATE && r.venueArea === 'Grand Hall');
    expect(planted.length).toBeGreaterThanOrEqual(2);
    for (const r of planted) expect(r.balanceDue).toBeGreaterThan(0);
  });

  it('returns an empty list for a month with no bookings', () => {
    expect(listBookings('2031-01', db)).toEqual([]);
  });
});

describe('getBooking', () => {
  it('returns the job sheet, production, shifts, invoices and payments of a confirmed booking', () => {
    const id = (db.prepare("select id from bookings where status = 'confirmed' and venue_area != 'Off-site' order by date limit 1").get() as any).id;
    const d = getBooking(id, db)!;
    expect(d).not.toBeNull();
    expect(d.invoices).toHaveLength(3);
    expect(d.jobSheet?.lines.length).toBeGreaterThan(0);
    expect(d.productionLines.length).toBeGreaterThan(0);
    expect(d.shifts.length).toBeGreaterThanOrEqual(5);
    expect(d.payments.length).toBeGreaterThanOrEqual(1);
    expect(d.total).toBe(d.pax * d.package.pricePerPax);
  });

  it('returns null for an unknown id', () => {
    expect(getBooking(999_999, db)).toBeNull();
  });
});

describe('lists', () => {
  it('lists customers and packages', () => {
    expect(listCustomers(db).length).toBeGreaterThanOrEqual(150);
    const pkgs = listPackages(db);
    expect(pkgs).toHaveLength(6);
    expect(pkgs[0].items.length).toBeGreaterThan(0);
  });
});

describe('getScheduleItems', () => {
  it('includes two event items on the double-booking date', () => {
    const items = getScheduleItems(DOUBLE_BOOKING_DATE, DOUBLE_BOOKING_DATE, db);
    expect(items.filter((i) => i.kind === 'event').length).toBeGreaterThanOrEqual(2);
    expect(items.some((i) => i.kind === 'production')).toBe(true);
    expect(items.some((i) => i.kind === 'court')).toBe(true);
  });

  it('returns nothing when from is after to', () => {
    expect(getScheduleItems('2026-11-10', '2026-11-01', db)).toEqual([]);
  });

  it('treats both ends of the range as inclusive', () => {
    const dayBefore = addDays(DOUBLE_BOOKING_DATE, -1);
    const dayAfter = addDays(DOUBLE_BOOKING_DATE, 1);
    const inRange = getScheduleItems(dayBefore, DOUBLE_BOOKING_DATE, db);
    expect(inRange.some((i) => i.kind === 'production' && i.date === dayBefore)).toBe(true);
    expect(inRange.filter((i) => i.kind === 'event' && i.date === DOUBLE_BOOKING_DATE).length).toBeGreaterThanOrEqual(2);
    const after = getScheduleItems(dayAfter, dayAfter, db);
    expect(after.every((i) => i.date === dayAfter)).toBe(true);
  });
});

describe('getConflicts', () => {
  it('reports the planted venue conflict inside the range', () => {
    const out = getConflicts(DOUBLE_BOOKING_DATE, DOUBLE_BOOKING_DATE, db);
    const venue = out.filter((c) => c.kind === 'venue');
    expect(venue.length).toBeGreaterThanOrEqual(1);
    expect(venue[0].bookingIds).toHaveLength(2);
    expect(venue[0].date).toBe(DOUBLE_BOOKING_DATE);
  });

  it('reports nothing outside the range or for an inverted range', () => {
    expect(getConflicts('2031-01-01', '2031-01-07', db)).toEqual([]);
    expect(getConflicts('2026-11-10', '2026-11-01', db)).toEqual([]);
  });
});

describe('getAnalytics', () => {
  const from = addDays(TODAY, -29);

  it('returns a 30-day daily revenue frame with all six units and non-zero totals', () => {
    const a = getAnalytics(from, TODAY, db);
    expect(a.daily.dates).toHaveLength(30);
    expect(Object.keys(a.daily.series).sort()).toEqual(['cafe', 'catering', 'commissary', 'events', 'parking', 'pickleball']);
    expect(a.daily.max).toBeGreaterThan(0);
    expect(a.daily.series.cafe.some((v) => v > 0)).toBe(true);
    expect(a.daily.series.pickleball.some((v) => v > 0)).toBe(true);
  });

  it('mix shares sum to one and match the daily totals', () => {
    const a = getAnalytics(from, TODAY, db);
    const sumDaily = a.daily.totals.reduce((s, v) => s + v, 0);
    const sumMix = a.mix.reduce((s, m) => s + m.amount, 0);
    expect(sumMix).toBe(sumDaily);
    expect(a.mix.reduce((s, m) => s + m.share, 0)).toBeCloseTo(1);
  });

  it('reports occupancy, court utilisation, funnel, packages, labor, repeat and payments', () => {
    const a = getAnalytics(from, TODAY, db);
    expect(a.occupancy.available).toBe(30);
    expect(a.occupancy.booked).toBeGreaterThan(0);
    expect(a.occupancy.booked).toBeLessThanOrEqual(30);
    expect(a.courts.grid).toHaveLength(4);
    expect(a.courts.hours).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
    expect(a.courts.grid.flat().some((v) => v > 0)).toBe(true);
    expect(a.courts.grid.flat().every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(a.funnel.map((f) => f.stage)).toEqual(['inquiry', 'site_visit', 'proposal_sent', 'booked']);
    expect(a.funnel[0].count).toBeGreaterThan(0);
    expect(a.topPackages.length).toBeGreaterThan(0);
    expect(a.topPackages.length).toBeLessThanOrEqual(6);
    expect(a.topPackages[0].revenue).toBeGreaterThanOrEqual(a.topPackages[a.topPackages.length - 1].revenue);
    expect(a.labor.find((l) => l.slug === 'events')!.revenue).toBeGreaterThan(0);
    expect(a.repeat.totalCustomers).toBeGreaterThan(0);
    expect(a.repeatTrend.months).toHaveLength(6);
    expect(a.repeatTrend.values).toHaveLength(6);
    expect(a.payments.due).toBeGreaterThanOrEqual(0);
    expect(a.payments.collected).toBeGreaterThanOrEqual(0);
  });

  it('returns an empty frame for an inverted range without throwing', () => {
    const a = getAnalytics('2026-11-10', '2026-11-01', db);
    expect(a.daily.dates).toEqual([]);
    expect(a.occupancy).toEqual({ booked: 0, available: 0, rate: 0 });
    expect(a.courts.grid.flat().every((v) => v === 0)).toBe(true);
  });
});

describe('listBookings month edges', () => {
  it('includes bookings on the first and last day of the month and nothing outside', () => {
    const fresh = openDb(':memory:');
    seedDatabase(fresh, TODAY);
    const customer = (fresh.prepare('select id from customers limit 1').get() as any).id;
    const unit = (fresh.prepare("select id from units where slug = 'events'").get() as any).id;
    const pkg = (fresh.prepare('select id from packages limit 1').get() as any).id;
    const ins = fresh.prepare("insert into bookings (customer_id, unit_id, date, start_time, end_time, pax, package_id, venue_area, status) values (?, ?, ?, '10:00', '14:00', 50, ?, 'Garden', 'confirmed')");
    ins.run(customer, unit, '2031-03-01', pkg);
    ins.run(customer, unit, '2031-03-31', pkg);
    ins.run(customer, unit, '2031-04-01', pkg);
    const dates = listBookings('2031-03', fresh).map((b) => b.date).sort();
    expect(dates).toEqual(['2031-03-01', '2031-03-31']);
  });
});
