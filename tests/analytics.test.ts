import { describe, it, expect } from 'vitest';
import {
  dailySeries,
  revenueMix,
  occupancy,
  utilisationGrid,
  pipelineFunnel,
  laborShare,
  repeatRate,
  repeatByMonth,
  niceMax,
  compactPesos,
  UNIT_SLUGS,
} from '@/lib/analytics';

describe('dailySeries', () => {
  it('fills every day in the range with zeros for missing days and units', () => {
    const s = dailySeries(
      [
        { date: '2026-10-01', unitSlug: 'cafe', amount: 500 },
        { date: '2026-10-03', unitSlug: 'cafe', amount: 700 },
        { date: '2026-10-03', unitSlug: 'events', amount: 200 },
      ],
      '2026-10-01',
      '2026-10-03',
    );
    expect(s.dates).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
    expect(s.series.cafe).toEqual([500, 0, 700]);
    expect(s.series.events).toEqual([0, 0, 200]);
    expect(s.series.parking).toEqual([0, 0, 0]);
    expect(s.totals).toEqual([500, 0, 900]);
    expect(s.max).toBe(900);
  });

  it('sums several rows on the same day and unit and ignores rows outside the range', () => {
    const s = dailySeries(
      [
        { date: '2026-10-02', unitSlug: 'parking', amount: 100 },
        { date: '2026-10-02', unitSlug: 'parking', amount: 150 },
        { date: '2026-09-30', unitSlug: 'parking', amount: 999 },
      ],
      '2026-10-01',
      '2026-10-02',
    );
    expect(s.series.parking).toEqual([0, 250]);
  });

  it('returns an empty frame for an inverted range', () => {
    const s = dailySeries([], '2026-10-05', '2026-10-01');
    expect(s.dates).toEqual([]);
    expect(s.max).toBe(0);
  });
});

describe('revenueMix', () => {
  it('orders by amount and computes shares that sum to one', () => {
    const mix = revenueMix({ events: 300, cafe: 100, parking: 0, catering: 0, commissary: 0, pickleball: 0 });
    expect(mix.map((m) => m.slug)).toEqual(['events', 'cafe', 'catering', 'commissary', 'parking', 'pickleball']);
    expect(mix[0].share).toBeCloseTo(0.75);
    expect(mix[1].share).toBeCloseTo(0.25);
    expect(mix.reduce((s, m) => s + m.share, 0)).toBeCloseTo(1);
  });

  it('gives zero shares when there is no revenue', () => {
    const mix = revenueMix({ events: 0 });
    expect(mix[0].share).toBe(0);
  });
});

describe('occupancy', () => {
  it('counts distinct booked days over the days in range', () => {
    const o = occupancy(['2026-10-02', '2026-10-02', '2026-10-05', '2026-09-01'], '2026-10-01', '2026-10-10');
    expect(o).toEqual({ booked: 2, available: 10, rate: 0.2 });
  });

  it('is zero for an inverted range', () => {
    expect(occupancy(['2026-10-02'], '2026-10-10', '2026-10-01')).toEqual({ booked: 0, available: 0, rate: 0 });
  });
});

describe('utilisationGrid', () => {
  it('returns a court by hour grid of booking rates over the number of days', () => {
    const g = utilisationGrid(
      [
        { court: 1, hour: 6 },
        { court: 1, hour: 6 },
        { court: 2, hour: 7 },
      ],
      2,
      [6, 7],
      2,
    );
    expect(g).toEqual([
      [1, 0],
      [0, 0.5],
    ]);
  });

  it('ignores courts and hours outside the grid and handles zero days', () => {
    expect(utilisationGrid([{ court: 9, hour: 6 }, { court: 1, hour: 23 }], 1, [6], 0)).toEqual([[0]]);
  });
});

describe('pipelineFunnel', () => {
  it('counts inquiries that reached each stage, with lost ones only at inquiry', () => {
    const f = pipelineFunnel([
      { stage: 'inquiry' },
      { stage: 'site_visit' },
      { stage: 'proposal_sent' },
      { stage: 'booked' },
      { stage: 'done' },
      { stage: 'lost' },
    ]);
    expect(f.map((x) => x.stage)).toEqual(['inquiry', 'site_visit', 'proposal_sent', 'booked']);
    expect(f.map((x) => x.count)).toEqual([6, 4, 3, 2]);
    expect(f[0].conversion).toBeNull();
    expect(f[1].conversion).toBeCloseTo(4 / 6);
    expect(f[3].conversion).toBeCloseTo(2 / 3);
  });

  it('handles an empty pipeline', () => {
    const f = pipelineFunnel([]);
    expect(f.map((x) => x.count)).toEqual([0, 0, 0, 0]);
    expect(f[1].conversion).toBeNull();
  });
});

describe('laborShare', () => {
  it('divides labor by revenue per unit and leaves null where there is no revenue', () => {
    const s = laborShare({ events: 30, cafe: 10 }, { events: 100, cafe: 0 });
    expect(s.find((x) => x.slug === 'events')!.share).toBeCloseTo(0.3);
    expect(s.find((x) => x.slug === 'cafe')!.share).toBeNull();
    expect(s.find((x) => x.slug === 'parking')!.share).toBeNull();
  });
});

describe('repeatRate', () => {
  it('reports the share of bookings from customers with more than one booking', () => {
    const r = repeatRate([{ customerId: 1 }, { customerId: 1 }, { customerId: 2 }, { customerId: 3 }]);
    expect(r).toEqual({ repeatCustomers: 1, totalCustomers: 3, repeatShare: 0.5 });
  });

  it('is zero with no bookings', () => {
    expect(repeatRate([])).toEqual({ repeatCustomers: 0, totalCustomers: 0, repeatShare: 0 });
  });
});

describe('repeatByMonth', () => {
  it('gives, per month, the share of bookings whose customer had booked before', () => {
    const r = repeatByMonth(
      [
        { customerId: 1, date: '2026-08-10' },
        { customerId: 2, date: '2026-09-05' },
        { customerId: 1, date: '2026-09-20' },
        { customerId: 1, date: '2026-10-01' },
        { customerId: 3, date: '2026-10-02' },
      ],
      ['2026-08', '2026-09', '2026-10'],
    );
    expect(r).toEqual([0, 0.5, 0.5]);
  });

  it('returns zero for months without bookings', () => {
    expect(repeatByMonth([], ['2026-08'])).toEqual([0]);
  });
});

describe('scales and formatting', () => {
  it('niceMax rounds a maximum up to a clean tick ceiling', () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(7)).toBe(8);
    expect(niceMax(93)).toBe(100);
    expect(niceMax(1_234_567)).toBe(1_500_000);
    expect(niceMax(4_400_000)).toBe(5_000_000);
  });

  it('compactPesos shortens large peso amounts given in centavos', () => {
    expect(compactPesos(0)).toBe('₱0');
    expect(compactPesos(95_000)).toBe('₱950');
    expect(compactPesos(1_250_000)).toBe('₱12.5K');
    expect(compactPesos(165_743_592)).toBe('₱1.66M');
  });

  it('exposes the six unit slugs in fixed palette order', () => {
    expect(UNIT_SLUGS).toEqual(['events', 'catering', 'cafe', 'commissary', 'parking', 'pickleball']);
  });
});
