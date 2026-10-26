// Shared domain types. Money fields are integer centavos.

export interface BookingCore {
  id: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  pax: number;
  packageId: number;
  venueArea: string;
  depositCentavos: number;
}

export interface PackageItem {
  menuItemId: number;
  name: string;
  portionsPerPax: number;
}

export interface PackageDef {
  id: number;
  name: string;
  pricePerPax: number;
  serviceStyle: string;
  items: PackageItem[];
}

export interface RecipeLine {
  menuItemId: number;
  ingredientId: number;
  qtyPerPortion: number;
  fresh: boolean;
}

export interface ManpowerRatio {
  role: string;
  paxPerHead: number | null;
  fixedCount: number | null;
}

export interface JobLine {
  menuItemId: number;
  name: string;
  qty: number;
}

export interface JobSheet {
  bookingId: number;
  serviceStyle: string;
  inSite: boolean;
  pax: number;
  lines: JobLine[];
}

export interface ProductionLine {
  productionDate: string;
  ingredientId: number;
  qty: number;
}

export interface ManpowerNeed {
  role: string;
  headcount: number;
}

export type InvoiceLabel = 'Deposit' | 'Second installment' | 'Balance';

export interface InvoiceDraft {
  label: InvoiceLabel;
  amount: number;
  dueDate: string;
}
