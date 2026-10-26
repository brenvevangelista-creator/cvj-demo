import { describe, it, expect } from 'vitest';
import {
  deriveJobSheet,
  deriveProduction,
  deriveManpower,
  derivePaymentSchedule,
} from '@/lib/derive';
import type { BookingCore, PackageDef, RecipeLine, ManpowerRatio, JobSheet } from '@/lib/types';

const CHICKEN = 1;
const LETTUCE = 2;

const pkg: PackageDef = {
  id: 1,
  name: 'Classic Buffet',
  pricePerPax: 100_000, // ₱1,000.00
  serviceStyle: 'buffet',
  items: [
    { menuItemId: 10, name: 'Chicken Inasal', portionsPerPax: 1.1 },
    { menuItemId: 11, name: 'Garden Salad', portionsPerPax: 0.5 },
  ],
};

function booking(over: Partial<BookingCore> = {}): BookingCore {
  return {
    id: 1,
    date: '2026-12-20',
    startTime: '11:00',
    endTime: '15:00',
    pax: 100,
    packageId: 1,
    venueArea: 'Grand Hall',
    depositCentavos: 2_000_000,
    ...over,
  };
}

const RATIOS: ManpowerRatio[] = [
  { role: 'servers', paxPerHead: 25, fixedCount: null },
  { role: 'cooks', paxPerHead: 50, fixedCount: null },
  { role: 'dishwashers', paxPerHead: 100, fixedCount: null },
  { role: 'parking marshals', paxPerHead: 80, fixedCount: null },
  { role: 'supervisor', paxPerHead: null, fixedCount: 1 },
];

describe('deriveJobSheet', () => {
  it('job sheet multiplies portions', () => {
    const sheet = deriveJobSheet(booking({ pax: 120 }), pkg);
    expect(sheet.pax).toBe(120);
    expect(sheet.serviceStyle).toBe('buffet');
    expect(sheet.lines).toEqual([
      { menuItemId: 10, name: 'Chicken Inasal', qty: 132 },
      { menuItemId: 11, name: 'Garden Salad', qty: 60 },
    ]);
  });
});

describe('deriveProduction', () => {
  const recipes: RecipeLine[] = [
    { menuItemId: 10, ingredientId: CHICKEN, qtyPerPortion: 0.25, fresh: false },
    { menuItemId: 11, ingredientId: LETTUCE, qtyPerPortion: 0.1, fresh: true },
  ];
  const sheetA: JobSheet = { bookingId: 1, serviceStyle: 'buffet', inSite: true, pax: 100, lines: [{ menuItemId: 10, name: 'Chicken Inasal', qty: 100 }] };
  const sheetB: JobSheet = { bookingId: 2, serviceStyle: 'buffet', inSite: true, pax: 60, lines: [{ menuItemId: 10, name: 'Chicken Inasal', qty: 60 }] };
  const eventDateOf = () => '2026-11-14';

  it('aggregates across job sheets', () => {
    const lines = deriveProduction([sheetA, sheetB], recipes, eventDateOf);
    expect(lines).toEqual([{ productionDate: '2026-11-13', ingredientId: CHICKEN, qty: 40 }]);
  });

  it('fresh ingredient produced on event date', () => {
    const salad: JobSheet = { ...sheetA, lines: [{ menuItemId: 11, name: 'Garden Salad', qty: 50 }] };
    const lines = deriveProduction([salad], recipes, eventDateOf);
    expect(lines).toEqual([{ productionDate: '2026-11-14', ingredientId: LETTUCE, qty: 5 }]);
  });
});

describe('deriveManpower', () => {
  it('manpower rounds up', () => {
    expect(deriveManpower(130, RATIOS)).toEqual([
      { role: 'servers', headcount: 6 },
      { role: 'cooks', headcount: 3 },
      { role: 'dishwashers', headcount: 2 },
      { role: 'parking marshals', headcount: 2 },
      { role: 'supervisor', headcount: 1 },
    ]);
  });
});

describe('derivePaymentSchedule', () => {
  it('payment schedule', () => {
    expect(derivePaymentSchedule(booking(), pkg, '2026-10-26')).toEqual([
      { label: 'Deposit', amount: 2_000_000, dueDate: '2026-10-26' },
      { label: 'Second installment', amount: 5_000_000, dueDate: '2026-11-20' },
      { label: 'Balance', amount: 3_000_000, dueDate: '2026-12-19' },
    ]);
  });

  it('second installment never before today', () => {
    const s = derivePaymentSchedule(booking({ date: '2026-11-10' }), pkg, '2026-10-26');
    expect(s[1].dueDate).toBe('2026-10-26');
    expect(s[2].dueDate).toBe('2026-11-09');
  });

  it('deposit above half', () => {
    const s = derivePaymentSchedule(booking({ depositCentavos: 7_000_000 }), pkg, '2026-10-26');
    expect(s.map((x) => x.amount)).toEqual([7_000_000, 3_000_000, 0]);
    for (const x of s) expect(x.amount).toBeGreaterThanOrEqual(0);
  });
});
