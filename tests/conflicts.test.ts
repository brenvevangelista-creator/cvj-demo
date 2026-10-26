import { describe, it, expect } from 'vitest';
import { findConflicts } from '@/lib/conflicts';

const base = { date: '2026-11-07', pax: 100, status: 'confirmed' as const };

describe('findConflicts', () => {
  it('flags two bookings overlapping in the same venue area', () => {
    const out = findConflicts(
      [
        { id: 1, ...base, startTime: '10:00', endTime: '14:00', venueArea: 'Grand Hall' },
        { id: 2, ...base, startTime: '13:00', endTime: '18:00', venueArea: 'Grand Hall' },
      ],
      120,
    );
    const venue = out.filter((c) => c.kind === 'venue');
    expect(venue).toHaveLength(1);
    expect(venue[0].bookingIds.sort()).toEqual([1, 2]);
    expect(venue[0].date).toBe('2026-11-07');
  });

  it('does not flag different venue areas', () => {
    const out = findConflicts(
      [
        { id: 1, ...base, startTime: '10:00', endTime: '14:00', venueArea: 'Grand Hall' },
        { id: 2, ...base, startTime: '13:00', endTime: '18:00', venueArea: 'Garden' },
      ],
      120,
    );
    expect(out.filter((c) => c.kind === 'venue')).toHaveLength(0);
  });

  it('flags parking capacity when overlapping bookings bring too many vehicles', () => {
    const out = findConflicts(
      [
        { id: 1, ...base, pax: 200, startTime: '10:00', endTime: '14:00', venueArea: 'Grand Hall' },
        { id: 2, ...base, pax: 180, startTime: '13:00', endTime: '18:00', venueArea: 'Garden' },
      ],
      120,
    );
    const parking = out.filter((c) => c.kind === 'parking');
    expect(parking).toHaveLength(1);
    expect(parking[0].bookingIds.sort()).toEqual([1, 2]);
    expect(parking[0].message).toContain('127');
  });

  it('ignores cancelled bookings', () => {
    const out = findConflicts(
      [
        { id: 1, ...base, startTime: '10:00', endTime: '14:00', venueArea: 'Grand Hall' },
        { id: 2, ...base, status: 'cancelled', startTime: '13:00', endTime: '18:00', venueArea: 'Grand Hall' },
      ],
      120,
    );
    expect(out).toHaveLength(0);
  });

  it('returns nothing for no bookings', () => {
    expect(findConflicts([], 120)).toEqual([]);
  });

  it('does not flag bookings that only touch at the boundary', () => {
    const out = findConflicts(
      [
        { id: 1, ...base, pax: 300, startTime: '10:00', endTime: '14:00', venueArea: 'Grand Hall' },
        { id: 2, ...base, pax: 300, startTime: '14:00', endTime: '18:00', venueArea: 'Grand Hall' },
      ],
      120,
    );
    expect(out).toHaveLength(0);
  });

  it('does not flag parking exactly at capacity', () => {
    // ceil(180/3) + ceil(180/3) = 60 + 60 = 120, which fits.
    const out = findConflicts(
      [
        { id: 1, ...base, pax: 180, startTime: '10:00', endTime: '14:00', venueArea: 'Grand Hall' },
        { id: 2, ...base, pax: 180, startTime: '13:00', endTime: '18:00', venueArea: 'Garden' },
      ],
      120,
    );
    expect(out.filter((c) => c.kind === 'parking')).toHaveLength(0);
  });

  it('ignores off-site jobs for venue conflicts', () => {
    const out = findConflicts(
      [
        { id: 1, ...base, startTime: '10:00', endTime: '14:00', venueArea: 'Off-site' },
        { id: 2, ...base, startTime: '13:00', endTime: '18:00', venueArea: 'Off-site' },
      ],
      120,
    );
    expect(out.filter((c) => c.kind === 'venue')).toHaveLength(0);
  });
});
