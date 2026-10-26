import { describe, it, expect } from 'vitest';
import { addDays, overlaps, monthDays, todayManila, fmtDate, safeMonth } from '@/lib/dates';

describe('dates', () => {
  it('addDays crosses a month boundary forward', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  });
  it('addDays crosses a month boundary backward', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('overlaps when ranges intersect', () => {
    expect(overlaps('10:00', '14:00', '13:00', '18:00')).toBe(true);
  });
  it('does not overlap when one ends as the other starts', () => {
    expect(overlaps('10:00', '14:00', '14:00', '18:00')).toBe(false);
  });
  it('monthDays lists every day of the month', () => {
    const days = monthDays('2026-02');
    expect(days.length).toBe(28);
    expect(days[0]).toBe('2026-02-01');
    expect(days[27]).toBe('2026-02-28');
  });
  it('todayManila is an ISO date', () => {
    expect(todayManila()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('safeMonth keeps a valid month and falls back for anything else', () => {
    expect(safeMonth('2026-12', '2026-10')).toBe('2026-12');
    expect(safeMonth('2026-01', '2026-10')).toBe('2026-01');
    expect(safeMonth('2026-13', '2026-10')).toBe('2026-10');
    expect(safeMonth('2026-00', '2026-10')).toBe('2026-10');
    expect(safeMonth('abc', '2026-10')).toBe('2026-10');
    expect(safeMonth(undefined, '2026-10')).toBe('2026-10');
    expect(safeMonth('', '2026-10')).toBe('2026-10');
  });
  it('fmtDate reads as day month year', () => {
    expect(fmtDate('2026-11-14')).toBe('14 Nov 2026');
  });
});
