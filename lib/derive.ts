// Pure derivation rules: a confirmed booking produces its catering job sheet,
// commissary production lines, manpower needs and payment schedule.
// No database access here, so every rule is unit-testable.
import { addDays } from '@/lib/dates';
import type {
  BookingCore,
  InvoiceDraft,
  JobSheet,
  ManpowerNeed,
  ManpowerRatio,
  PackageDef,
  ProductionLine,
  RecipeLine,
} from '@/lib/types';

const round3 = (x: number) => Math.round(x * 1000) / 1000;

/** Package menu lines times pax, rounded up to whole portions. */
export function deriveJobSheet(b: BookingCore, pkg: PackageDef): JobSheet {
  return {
    bookingId: b.id,
    serviceStyle: pkg.serviceStyle,
    inSite: true,
    pax: b.pax,
    lines: pkg.items.map((it) => ({
      menuItemId: it.menuItemId,
      name: it.name,
      qty: Math.ceil(it.portionsPerPax * b.pax),
    })),
  };
}

/**
 * Ingredient quantities for a set of job sheets, aggregated per ingredient per
 * production day. Production day is the day before the event, except for
 * ingredients flagged fresh, which are produced on the event date itself.
 */
export function deriveProduction(
  sheets: JobSheet[],
  recipes: RecipeLine[],
  eventDateOf: (bookingId: number) => string,
): ProductionLine[] {
  const byItem = new Map<number, RecipeLine[]>();
  for (const r of recipes) {
    const arr = byItem.get(r.menuItemId) ?? [];
    arr.push(r);
    byItem.set(r.menuItemId, arr);
  }
  const acc = new Map<string, ProductionLine>();
  for (const sheet of sheets) {
    const eventDate = eventDateOf(sheet.bookingId);
    for (const line of sheet.lines) {
      for (const r of byItem.get(line.menuItemId) ?? []) {
        const productionDate = r.fresh ? eventDate : addDays(eventDate, -1);
        const key = `${productionDate}|${r.ingredientId}`;
        const cur = acc.get(key) ?? { productionDate, ingredientId: r.ingredientId, qty: 0 };
        cur.qty = round3(cur.qty + r.qtyPerPortion * line.qty);
        acc.set(key, cur);
      }
    }
  }
  return [...acc.values()].sort(
    (a, b) => a.productionDate.localeCompare(b.productionDate) || a.ingredientId - b.ingredientId,
  );
}

/** Headcount per role: ceil(pax / paxPerHead), or a fixed count. */
export function deriveManpower(pax: number, ratios: ManpowerRatio[]): ManpowerNeed[] {
  return ratios.map((r) => ({
    role: r.role,
    headcount:
      r.paxPerHead && r.paxPerHead > 0 ? Math.ceil(pax / r.paxPerHead) : (r.fixedCount ?? 0),
  }));
}

/**
 * Deposit due today, half the total due 30 days before the event (never before
 * today), the rest due the day before the event. Never produces a negative line.
 */
export function derivePaymentSchedule(
  b: BookingCore,
  pkg: PackageDef,
  today: string,
): InvoiceDraft[] {
  const total = pkg.pricePerPax * b.pax;
  const deposit = Math.min(Math.max(b.depositCentavos, 0), total);
  const installment = Math.min(Math.round(total / 2), total - deposit);
  const balance = total - deposit - installment;
  const thirtyBefore = addDays(b.date, -30);
  return [
    { label: 'Deposit', amount: deposit, dueDate: today },
    { label: 'Second installment', amount: installment, dueDate: thirtyBefore < today ? today : thirtyBefore },
    { label: 'Balance', amount: balance, dueDate: addDays(b.date, -1) },
  ];
}
