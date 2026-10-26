// Pure conflict rules for the compound schedule: the same venue area booked twice
// at once, and overlapping events bringing more vehicles than the parking lot holds.
import { overlaps } from '@/lib/dates';

export interface ConflictBooking {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  venueArea: string;
  pax: number;
  status: string;
}

export interface Conflict {
  kind: 'venue' | 'parking';
  date: string;
  bookingIds: number[];
  message: string;
}

/** Estimated vehicles for an event: one car per three guests. */
export function vehiclesFor(pax: number): number {
  return Math.ceil(pax / 3);
}

const OFF_SITE = 'Off-site';

export function findConflicts(bookings: ConflictBooking[], parkingCapacity: number): Conflict[] {
  const active = bookings.filter((b) => b.status !== 'cancelled');
  const out: Conflict[] = [];

  // Venue: any two on-site bookings in the same area whose times intersect.
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      if (a.date !== b.date || a.venueArea !== b.venueArea || a.venueArea === OFF_SITE) continue;
      if (!overlaps(a.startTime, a.endTime, b.startTime, b.endTime)) continue;
      out.push({
        kind: 'venue',
        date: a.date,
        bookingIds: [a.id, b.id],
        message: `${a.venueArea} is double-booked on ${a.date}: ${a.startTime}–${a.endTime} and ${b.startTime}–${b.endTime}.`,
      });
    }
  }

  // Parking: for each on-site booking, sum vehicles of every on-site booking
  // overlapping it that day; report each over-capacity group once.
  const seen = new Set<string>();
  const onSite = active.filter((b) => b.venueArea !== OFF_SITE);
  for (const a of onSite) {
    const group = onSite.filter(
      (b) => b.date === a.date && (b.id === a.id || overlaps(a.startTime, a.endTime, b.startTime, b.endTime)),
    );
    if (group.length < 2) continue;
    const ids = group.map((b) => b.id).sort((x, y) => x - y);
    const key = `${a.date}|${ids.join(',')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const vehicles = group.reduce((s, b) => s + vehiclesFor(b.pax), 0);
    if (vehicles > parkingCapacity) {
      out.push({
        kind: 'parking',
        date: a.date,
        bookingIds: ids,
        message: `About ${vehicles} vehicles expected on ${a.date} against ${parkingCapacity} parking slots.`,
      });
    }
  }
  return out;
}
