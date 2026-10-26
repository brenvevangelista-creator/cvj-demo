import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBooking, listCustomers, listPackages } from '@/lib/data';
import { VENUE_AREAS } from '@/lib/seed/catalog';
import { updateBookingAction } from '@/app/actions/bookings';
import { BookingForm } from '@/app/events/booking-form';

export const dynamic = 'force-dynamic';

export default function EditBookingPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const d = Number.isInteger(id) ? getBooking(id) : null;
  if (!d) notFound();
  const deposit = d.invoices.find((i) => i.label === 'Deposit')?.amount ?? 0;
  const venueAreas = VENUE_AREAS.includes(d.venueArea as any) ? VENUE_AREAS : [...VENUE_AREAS, d.venueArea];
  return (
    <div className="space-y-4">
      <div className="text-xs text-zinc-500">
        <Link href={`/events/${d.id}`} className="hover:underline">Booking #{d.id}</Link> / edit
      </div>
      <h1 className="text-xl font-semibold">Edit booking · {d.customer}</h1>
      <BookingForm
        action={updateBookingAction.bind(null, d.id)}
        customers={listCustomers()}
        packages={listPackages()}
        venueAreas={venueAreas}
        initial={{ customerId: d.customerId, date: d.date, startTime: d.startTime, endTime: d.endTime, pax: d.pax, packageId: d.package.id, venueArea: d.venueArea, depositPesos: deposit / 100, notes: d.notes }}
        submitLabel="Save changes"
        depositLocked
      />
    </div>
  );
}
