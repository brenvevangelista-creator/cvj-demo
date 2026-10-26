# CVJ Group demo dashboard — design

- Date: 2026-10-26
- Owner: Bren Evangelista (Growth Architect Studio, GAS)
- Status: approved in conversation 2026-10-26; this file is the written spec
- Prospect: Mike Abella and his wife, owners of CVJ Events Place (co-Rotarian of Bren). Not a client yet.

## 1. Purpose

Build a working demo of a group-wide owner dashboard for CVJ's six business units, to be shown in a first meeting with both owners. The goal of the meeting is a **signed build contract**, so the demo must be deep enough that the owners can picture their staff using it and the proposal can quote against it.

Success: the owners recognise their compound on the screen, watch one event booking ripple through catering, commissary, manpower and payments in real time, and sign the proposal.

## 2. What we know and what we assume

Known (from Bren, 2026-10-26):
- Six units in one compound: Events Place (venue), Catering (in-site and off-site), Cafe, Commissary, Parking lot, Pickleball courts.
- About 30 years in business, started as catering; both owners are hoteliers.
- Mike has been looking for a way to manage the businesses more efficiently and asked whether Bren will send a proposal.
- Bren expects problems with manpower, manual work and reporting, product development and scheduling.

Assumed (unverified — the demo must not present any of this as CVJ's facts):
- Their current tools, actual numbers, menus, staff counts and workflows are unknown. Everything in the demo is invented sample data and is labeled as such on every page.
- The proposal carries a discovery-week clause: final scope is confirmed in the first week after signing.

## 3. Shape and stack

- **New Next.js 14 app, TypeScript, Tailwind CSS**, App Router, server components plus server actions. Visual language matches the Holdco dashboard Mike saw: dark background, `card` panels, small zinc labels, large numbers, emerald/amber/sky badges.
- **Repo:** `cvj-demo` (own folder; the GAS lane in the Garrett vault holds the prospect documents plus a link to the repo).
- **Data:** one SQLite file (`data/demo.db`) through `better-sqlite3`, accessed only from server code. No ORM; plain SQL in a small data module. Schema and seed are deterministic scripts (`npm run db:reset`).
- **Sample-data banner** on every page: "Sample data prepared by Growth Architect Studio for CVJ. Names and figures are invented."
- **Reset demo** button (header) reloads the seed so the deck can be rehearsed any number of times with the same numbers.
- **Runs offline** on Bren's laptop (`npm run dev`). Vercel deploy is optional and, if used, kept behind Vercel login (deployment protection "all"), same as Holdco. SQLite on Vercel is ephemeral; the demo is designed for the laptop first.
- **Not the product.** The proposal states the production build moves to Supabase (Postgres) with roles, row-level security and logins. The demo makes no claim to be production-ready.
- **Money** is stored in integer centavos and formatted as PHP (₱) for display. Dates are Asia/Manila.

## 4. Pages and behaviour

Routes are listed by stage. Stage 1 must be demo-ready on its own.

### Stage 1 (days 1–3)

**`/` Group overview**
- Group totals: revenue today, revenue month to date, bookings this week, staff on shift today, cash collected vs balance due this month.
- Six unit cards (Events Place, Catering, Cafe, Commissary, Parking, Pickleball). Each shows revenue today, one activity count (events today, jobs today, cups/tickets, production runs, vehicles, court hours) and at most one alert line (for example "Low stock: chicken 4 kg", "Venue double-booked 14 Nov", "2 open shifts Saturday"). Card links to the unit page.
- "Needs your decision" strip: pending approvals (discount request, overtime request, purchase above limit) with Approve / Decline buttons that update the row.

**`/events` Events Place**
- Month calendar and list of bookings with status (inquiry, confirmed, done, cancelled), pax, package, venue area, balance due.
- **New booking** form: customer (pick existing or type new), date, start/end time, pax, package, venue area (Grand Hall, Garden, Poolside — invented), deposit amount, notes.
- Saving a confirmed booking **derives four linked records** in one transaction:
  1. **Catering job sheet** — package menu lines times pax, service style, in-site flag, headcount for service.
  2. **Commissary production list** — recipe ingredient quantities times pax, aggregated per ingredient onto the production day (event date minus one day; same-day for a configurable list of fresh items).
  3. **Manpower requirement** — roles and headcount from editable ratios (servers per 25 pax, cooks per 50 pax, dishwashers per 100, parking marshals per 80, one supervisor per event). Shown as open shifts on the roster until assigned.
  4. **Payment schedule** — deposit due on booking, 50 % thirty days before, balance the day before; a deposit payment recorded if the form carries a deposit amount.
- Booking detail page shows the four derived records as linked panels, each one click away.
- Editing pax or package re-derives the four records; recorded payments are kept.

**`/schedule` Compound schedule**
- One calendar (week and month views) across all units: events, off-site catering jobs, court bookings, commissary production days, staff shifts.
- Conflict warnings: same venue area overlapping in time; parking capacity exceeded (vehicles estimated at pax ÷ 3 against a capacity constant) when two events overlap.

### Stage 2 (days 4–7)

**`/customers`**
- One customer list across all units. A customer can have event bookings, catering jobs, court bookings and cafe visits; the profile shows a cross-unit timeline and lifetime value.
- **Inquiry pipeline board**: Inquiry → Site visit → Proposal sent → Booked → Done / Lost, drag or button to move stage; "Booked" creates the event booking.

**`/money`**
- Revenue by unit by day (last 30) and by month (last 6).
- Receivables: per event, deposit received vs balance due, with overdue flag.
- Payables: supplier bills by due date.
- Labor cost as a percentage of revenue, per unit, this month.
- **Daily cash close** form per unit, phone-friendly: expected (from the day's sales) vs counted, variance with required reason over a threshold.

**`/commissary`**
- Production board by day: ingredient lines aggregated from job sheets plus cafe standing orders; tick lines as prepared.
- Stock on hand with low-stock flag against a par level; receiving form adds stock.
- **Recipe costing** (product development): create a dish, add ingredients and quantities, see cost per portion, choose a target margin, get a suggested price; save to menu.

**`/people`**
- Staff list by unit and role; weekly roster grid; open shifts (from manpower requirements) assignable to staff; overtime hours; labor cost per event.

**`/catering`** — job sheet list, off-site logistics checklist (van, equipment, staff call time, load-out) per job.
**`/parking`** — daily log (vehicles in, revenue), capacity and event-day forecast.
**`/pickleball`** — court booking grid (4 courts, hourly), membership list, utilisation.
**`/cafe`** — daily sales log, top items, standing order to the commissary.

**`/analytics`**
- Revenue mix by unit; venue occupancy (booked days ÷ available days); court utilisation; inquiry-to-booking lead time; top packages; repeat-customer rate; labor percentage. Charts follow the `dataviz` skill (one palette, light and dark safe).

## 5. Data model

All tables carry `id`, `created_at`, `updated_at`. Money columns are integer centavos. Dates are ISO strings.

| Table | Purpose |
| --- | --- |
| `units` | the six business units: slug, name, kind, capacity constants |
| `customers` | people and companies across units: name, phone, email, company, source |
| `inquiries` | pipeline rows: customer, unit, stage, pax, target date, value estimate |
| `bookings` | event bookings: customer, date, times, pax, package, venue area, status, notes |
| `packages` | event/catering packages: name, price per pax, service style, menu lines (join `package_items`) |
| `menu_items` | dishes and cafe items: name, unit, price, recipe link |
| `recipes` / `recipe_lines` | ingredient quantities per portion for a menu item |
| `ingredients` | name, unit of measure, cost per unit, par level |
| `stock` / `stock_movements` | on hand per ingredient; receipts, production deductions |
| `job_sheets` / `job_lines` | catering job per booking or standalone off-site job |
| `production_runs` / `production_lines` | per day, aggregated ingredient quantities, prepared flag |
| `staff` | name, unit, role, hourly rate |
| `shifts` | date, start, end, unit, role, staff (nullable = open), source booking, overtime flag |
| `manpower_ratios` | role → pax per head, editable |
| `invoices` / `payments` | payment schedule rows per booking; payments received |
| `expenses` | supplier bills: supplier, unit, amount, due date, paid flag |
| `court_bookings` | court, date, hour, customer, fee |
| `parking_logs` | date, vehicles, revenue |
| `cafe_daily` | date, sales, transactions, top items |
| `cash_closes` | unit, date, expected, counted, variance, reason |
| `approvals` | kind, unit, requested by, amount, status |

**Derivation rules** live in one pure module (`lib/derive.ts`) with no database access, so they are unit-testable: `deriveJobSheet(booking, package)`, `deriveProduction(jobSheet, recipes, productionDate)`, `deriveManpower(booking, ratios)`, `derivePaymentSchedule(booking)`.

**Seed** (`scripts/seed.ts`): deterministic pseudo-random generator with a fixed seed. About 90 days of history and 60 days ahead: 40–60 bookings, 150 customers, 25 staff, 6 packages, 40 menu items with recipes, daily cafe/parking/court rows, a handful of pending approvals and two deliberate conflicts (a venue double-booking and a low-stock ingredient) so the alert strip is never empty. Filipino names and PHP amounts in plausible ranges. No real CVJ data.

## 6. Error handling

- Every server action validates input with `zod`; validation errors return field messages rendered inline. No raw database errors reach the screen; the action returns a generic "Could not save, try again" and logs the detail server-side.
- Derivation runs in one SQLite transaction; any failure rolls back the booking and its derived rows.
- Reset demo deletes and recreates `data/demo.db`; if the seed fails, the previous file is restored from `data/demo.db.bak`.
- Pages that find no rows render an explicit empty state, never a blank panel.

## 7. Testing

- **Unit tests** (`vitest`) on `lib/derive.ts`: pax to job lines, ingredient aggregation across two bookings on one production day, manpower rounding, payment schedule dates and totals, re-derivation keeps payments.
- **Seed integrity test**: schema loads, seed completes, row counts and invariants hold (every booking has a job sheet, production run, shifts and invoices; totals reconcile).
- **Playwright smoke test**: start app, create a booking, assert it appears on `/events`, `/schedule`, the job sheet, the production list and the roster; then Reset and assert the seed numbers are back.
- Typecheck and lint clean before each commit.

## 8. Deliverables beyond the code

1. **Discovery question list** for the meeting (one page): current tools per unit, who does reporting and how often, how an event is booked today, how the commissary learns pax, how shifts are planned, what decisions wait on the owners, biggest monthly pain per unit.
2. **Proposal draft**: scope by unit, phased delivery (Phase 1 group dashboard + events flow; Phase 2 unit modules; Phase 3 logins, phone forms, automated owner report), discovery-week clause, hosting and data ownership, and a price block left blank for Bren. The draft lays out two pricing structures for Bren to choose from: a GAS build tier (Framework ₱129,997 or Skyline ₱299,997, from the GAS price list of 3 Oct 2026) plus a monthly retainer, or a build fee plus per-unit monthly fee modeled on RestOS pricing. No quote is invented.
3. **Filing**: documents go to the GAS lane, `businesses/active/growth-architect-studio/`, named `2026-MM-DD_gas_cvj-<topic>_v1.ext`, until Bren approves a CVJ client folder. Each file handed to Bren names its lane and file name.

## 9. Out of scope for the demo

Logins and roles, real payments or payment gateways, BIR receipts, accounting export, integrations with existing tools, mobile app, email/SMS sending, multi-tenant separation. Each is named in the proposal as part of the build.

## 10. Risks and decisions

- **Guessing their workflows.** Mitigated by the sample-data banner, the discovery question list and the discovery-week clause.
- **Using the CVJ name.** The demo is a sales artifact prepared for the prospect and says so on every page. No CVJ logo is used unless Mike provides one.
- **SQLite vs production.** Chosen for an offline, zero-cost, reset-able demo. Stated plainly in the proposal.
- **Hosting cost.** None for the laptop demo. Vercel for a shareable link is optional; the RestOS decision log records that a paid Vercel plan may be needed for commercial use (unconfirmed), which does not apply to a private demo.
- **Time.** Stage 1 is the minimum meeting-ready build; Stage 2 pages are added in the order Customers, Money, Commissary, People, Analytics, then the four small unit pages (Catering, Parking, Pickleball, Cafe), so an early meeting date still finds a coherent demo.
