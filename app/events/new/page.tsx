import { listCustomers, listPackages } from '@/lib/data';
import { addDays, todayManila } from '@/lib/dates';
import { VENUE_AREAS } from '@/lib/seed/catalog';
import { createBookingAction } from '@/app/actions/bookings';
import { BookingForm } from '@/app/events/booking-form';

export const dynamic = 'force-dynamic';

export default function NewBookingPage() {
  const packages = listPackages();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New booking</h1>
      <BookingForm
        action={createBookingAction}
        customers={listCustomers()}
        packages={packages}
        venueAreas={VENUE_AREAS}
        initial={{ date: addDays(todayManila(), 30), startTime: '11:00', endTime: '15:00', pax: 100, packageId: packages[0]?.id ?? 1, venueArea: VENUE_AREAS[0], depositPesos: 20000 }}
        submitLabel="Save booking"
      />
    </div>
  );
}
