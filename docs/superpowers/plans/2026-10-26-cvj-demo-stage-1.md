# CVJ Demo Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A meeting-ready demo: group overview of six CVJ units, an events page where saving a booking derives the catering job sheet, commissary production list, manpower shifts and payment schedule, and a compound schedule with conflict warnings, all on seeded sample data with a Reset button.

**Architecture:** Next.js 14 App Router with server components and server actions over one SQLite file via `better-sqlite3`. All business rules live in pure modules (`lib/derive.ts`, `lib/conflicts.ts`) with no database access, tested with vitest; the data module (`lib/data.ts`) only runs SQL; pages only render. A deterministic seed script rebuilds the database relative to today's date so the demo always has "today" data.

**Tech Stack:** Node 22, Next.js 14.2.35, React 18.3, TypeScript 5, Tailwind 3.4, better-sqlite3 13, zod 4, vitest 5, preinstalled Playwright 1.63 (`import { chromium } from 'playwright'`).

**Spec:** `docs/superpowers/specs/2026-10-26-cvj-demo-design.md`

## Global Constraints

- Money is stored as integer centavos; display as `₱12,345.00` via `php(centavos)`.
- Dates are `YYYY-MM-DD` strings and times `HH:MM`, Asia/Manila; "today" comes from `todayManila()` in `lib/dates.ts`, never `new Date()` directly in pages.
- Every page shows the banner text exactly: "Sample data prepared by Growth Architect Studio for CVJ. Names and figures are invented."
- No CVJ logo. Unit names: Events Place, Catering, Cafe, Commissary, Parking, Pickleball. Venue areas: Grand Hall, Garden, Poolside.
- Manpower ratios (pax per head): servers 25, cooks 50, dishwashers 100, parking marshals 80; supervisor fixed 1 per event.
- Payment schedule: deposit due on booking day; 50 % of total due 30 days before the event; balance due the day before.
- Production day = event date minus 1; ingredients flagged `fresh` are produced on the event date.
- Parking estimate: vehicles = ceil(pax ÷ 3); capacity constant 120 (invented, in `units.capacity`).
- Server actions validate with zod and never return raw database errors to the page.
- Dark card UI matching Holdco: `.card` = `rounded-xl border border-white/10 bg-zinc-900 p-4`; `.h` = section heading `text-sm font-semibold text-zinc-300 mb-2`.
- Database file `data/demo.db` is gitignored; `DEMO_DB` env var overrides the path (tests use `:memory:`).

## Review Focus

1. A booking whose event date is within 30 days of today: the 50 % installment must fall due today, not in the past (Task 3 test `second installment never before today`).
2. A deposit larger than half the total: the second installment shrinks and the balance never goes negative (Task 3 test `deposit above half`).
3. Two bookings on the same production day sharing an ingredient: quantities aggregate into one line, not two (Task 3 test `aggregates across job sheets`).
4. Editing a booking's pax after a payment was recorded: derived rows are rebuilt, payments stay (Task 9 test `re-derive keeps payments`).
5. Reset demo while the seed fails midway: the previous database comes back from the backup (Task 11 test `restores backup on failure`).

---

### Task 1: Scaffold the app

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.js`, `postcss.config.js`, `vitest.config.ts`, `.gitignore`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx` (placeholder), `README.md`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `start`, `test` (vitest run), `typecheck` (tsc --noEmit), `db:reset` (Task 4), `test:smoke` (Task 12).

- [ ] **Step 1: Create `package.json`** with dependencies `next@14.2.35 react@18.3.1 react-dom@18.3.1 better-sqlite3@^13 zod@^4` and devDependencies `typescript@^5 @types/node@^22 @types/react@^18 @types/react-dom@^18 @types/better-sqlite3 tailwindcss@3.4.13 postcss autoprefixer vitest@^5 tsx`. Scripts: `dev: next dev`, `build: next build`, `start: next start`, `typecheck: tsc --noEmit`, `test: vitest run`, `db:reset: tsx scripts/seed.ts`, `test:smoke: node tests/smoke.mjs`.
- [ ] **Step 2: Run `npm install`** and confirm `node -e "require('better-sqlite3')(':memory:')"` prints nothing (native binary loads).
- [ ] **Step 3: Write config files.** `tsconfig.json` with `@/*` path alias to repo root (same as Holdco). `next.config.js` with `experimental.serverComponentsExternalPackages: ['better-sqlite3']`. Tailwind content globs `./app/**/*.{ts,tsx}`, `./lib/**/*.{ts,tsx}`. `vitest.config.ts` with `test.include: ['tests/**/*.test.ts']` and the `@` alias. `.gitignore`: `node_modules`, `.next`, `data/*.db*`, `test-results`.
- [ ] **Step 4: Write `app/globals.css`** with Tailwind directives plus `.card` and `.h` classes from Global Constraints, `body` background `bg-zinc-950 text-zinc-100`.
- [ ] **Step 5: Write `app/layout.tsx`** rendering a header with the title "CVJ Group", a nav with links Overview `/`, Events `/events`, Schedule `/schedule`, a slot for the Reset button (filled in Task 11), and the banner text from Global Constraints in an amber strip under the header. `app/page.tsx` renders "Overview" placeholder.
- [ ] **Step 6: Verify** `npm run typecheck` passes and `npm run dev` serves `/` showing the banner (curl `http://localhost:3000` contains "Sample data prepared").
- [ ] **Step 7: Write `README.md`**: what the demo is, `npm install`, `npm run db:reset`, `npm run dev`, `npm test`, the banner rule, and "not production: see spec".
- [ ] **Step 8: Commit** `chore: scaffold Next.js app with Tailwind, vitest, better-sqlite3`.

### Task 2: Schema and database module

**Files:**
- Create: `db/schema.sql`, `lib/db.ts`, `lib/dates.ts`
- Test: `tests/db.test.ts`, `tests/dates.test.ts`

**Interfaces:**
- Produces: `openDb(path?: string): Database` (applies `db/schema.sql` if `units` table is missing; enables `foreign_keys`), `getDbPath(): string` (`process.env.DEMO_DB ?? 'data/demo.db'`), `getDb(): Database` (process singleton cached on `globalThis` for Next dev reloads, opened at `getDbPath()`), `closeDb(): void` (closes and clears the singleton), `withTransaction<T>(db, fn: () => T): T`.
- Produces: `todayManila(): string`, `addDays(date: string, n: number): string`, `overlaps(aStart, aEnd, bStart, bEnd: string): boolean`, `fmtDate(date: string): string` ("14 Nov 2026"), `monthDays(yyyyMm: string): string[]`.

- [ ] **Step 1: Write failing tests** in `tests/dates.test.ts`: `addDays('2026-10-31', 1) === '2026-11-01'`, `addDays('2026-03-01', -1) === '2026-02-28'`, `overlaps('10:00','14:00','13:00','18:00') === true`, `overlaps('10:00','14:00','14:00','18:00') === false`, `monthDays('2026-02').length === 28`, `todayManila()` matches `/^\d{4}-\d{2}-\d{2}$/`.
- [ ] **Step 2: Run** `npm test -- tests/dates.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `lib/dates.ts`** using `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' })` for today and UTC date arithmetic for `addDays`.
- [ ] **Step 4: Run** the dates test. Expected: PASS.
- [ ] **Step 5: Write `db/schema.sql`** with the 21 tables from spec section 5, each with `id INTEGER PRIMARY KEY`, `created_at`, `updated_at` defaulting to `datetime('now')`. Key columns: `units(slug UNIQUE, name, kind, capacity INTEGER)`; `bookings(customer_id, unit_id, date, start_time, end_time, pax, package_id, venue_area, status CHECK IN ('inquiry','confirmed','done','cancelled'), notes)`; `packages(name, price_per_pax INTEGER, service_style)`; `package_items(package_id, menu_item_id, portions_per_pax REAL)`; `recipe_lines(menu_item_id, ingredient_id, qty_per_portion REAL)`; `ingredients(name, uom, cost_per_unit INTEGER, par_level REAL, fresh INTEGER DEFAULT 0)`; `job_sheets(booking_id UNIQUE, service_style, in_site INTEGER, pax)`; `job_lines(job_sheet_id, menu_item_id, qty REAL)`; `production_runs(date UNIQUE)`; `production_lines(run_id, ingredient_id, qty REAL, prepared INTEGER DEFAULT 0, UNIQUE(run_id, ingredient_id))`; `manpower_ratios(role UNIQUE, pax_per_head INTEGER NULL, fixed_count INTEGER NULL)`; `shifts(date, start_time, end_time, unit_id, role, staff_id NULL, booking_id NULL, overtime INTEGER DEFAULT 0)`; `invoices(booking_id, label, amount INTEGER, due_date)`; `payments(booking_id, amount INTEGER, paid_on, method)`; `approvals(kind, unit_id, requested_by, amount INTEGER, status CHECK IN ('pending','approved','declined'))`. Foreign keys on every `*_id`.
- [ ] **Step 6: Write failing test** `tests/db.test.ts`: `openDb(':memory:')` then `select name from sqlite_master where type='table'` contains all 21 table names; `withTransaction` that throws leaves `units` empty.
- [ ] **Step 7: Run** the db test. Expected: FAIL.
- [ ] **Step 8: Implement `lib/db.ts`** per Interfaces.
- [ ] **Step 9: Run** `npm test`. Expected: PASS.
- [ ] **Step 10: Commit** `feat: sqlite schema, db module and date helpers`.

### Task 3: Derivation rules (pure)

**Files:**
- Create: `lib/types.ts`, `lib/derive.ts`
- Test: `tests/derive.test.ts`

**Interfaces:**
- Produces in `lib/types.ts`: `BookingCore { id: number; date: string; startTime: string; endTime: string; pax: number; packageId: number; venueArea: string; depositCentavos: number }`, `PackageDef { id: number; name: string; pricePerPax: number; serviceStyle: string; items: { menuItemId: number; name: string; portionsPerPax: number }[] }`, `RecipeLine { menuItemId: number; ingredientId: number; qtyPerPortion: number; fresh: boolean }`, `ManpowerRatio { role: string; paxPerHead: number | null; fixedCount: number | null }`, `JobSheet { bookingId: number; serviceStyle: string; inSite: boolean; pax: number; lines: { menuItemId: number; name: string; qty: number }[] }`, `ProductionLine { productionDate: string; ingredientId: number; qty: number }`, `ManpowerNeed { role: string; headcount: number }`, `InvoiceDraft { label: 'Deposit' | 'Second installment' | 'Balance'; amount: number; dueDate: string }`.
- Produces in `lib/derive.ts`: `deriveJobSheet(b: BookingCore, pkg: PackageDef): JobSheet`, `deriveProduction(sheets: JobSheet[], recipes: RecipeLine[], eventDateOf: (bookingId: number) => string): ProductionLine[]`, `deriveManpower(pax: number, ratios: ManpowerRatio[]): ManpowerNeed[]`, `derivePaymentSchedule(b: BookingCore, pkg: PackageDef, today: string): InvoiceDraft[]`.

- [ ] **Step 1: Write failing tests** in `tests/derive.test.ts`:
  - `job sheet multiplies portions`: pax 120, item portionsPerPax 1.1 → qty 132; 0.5 → 60.
  - `aggregates across job sheets`: two sheets on event date `2026-11-14`, chicken 0.25 kg/portion, qty 100 and 60 → one line `{ productionDate: '2026-11-13', ingredientId: chicken, qty: 40 }`.
  - `fresh ingredient produced on event date`: lettuce `fresh: true` → productionDate `2026-11-14`.
  - `manpower rounds up`: pax 130 with ratios servers 25, cooks 50, dishwashers 100, marshals 80, supervisor fixed 1 → servers 6, cooks 3, dishwashers 2, marshals 2, supervisor 1.
  - `payment schedule`: total 100,000 pesos (pricePerPax 1,000.00 × 100 pax), deposit 20,000, event `2026-12-20`, today `2026-10-26` → Deposit 2,000,000 centavos due `2026-10-26`, Second installment 5,000,000 due `2026-11-20`, Balance 3,000,000 due `2026-12-19`.
  - `second installment never before today`: event `2026-11-10`, today `2026-10-26` → second due `2026-10-26`.
  - `deposit above half`: deposit 70,000 of 100,000 → second 30,000, balance 0 and no negative amounts.
- [ ] **Step 2: Run** `npm test -- tests/derive.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `lib/types.ts` and `lib/derive.ts`** per Interfaces. Rounding: `Math.ceil` for quantities and headcounts; installment = `min(round(total / 2), total - deposit)`; balance = `total - deposit - installment`.
- [ ] **Step 4: Run** the derive tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat: pure derivation rules for job sheet, production, manpower, payments`.

### Task 4: Deterministic seed

**Files:**
- Create: `scripts/seed.ts`, `lib/seed/rng.ts`, `lib/seed/catalog.ts`, `lib/seed/build.ts`
- Test: `tests/seed.test.ts`

**Interfaces:**
- Produces: `rng(seed: number): { next(): number; int(min, max): number; pick<T>(arr: T[]): T }` (mulberry32), `seedDatabase(db: Database, today: string): void` (truncates all tables then inserts), `scripts/seed.ts` deletes `data/demo.db`, calls `openDb` then `seedDatabase(db, todayManila())`, prints row counts.
- Consumes: `openDb`, `addDays`, `deriveJobSheet`, `deriveProduction`, `deriveManpower`, `derivePaymentSchedule`.

- [ ] **Step 1: Write `lib/seed/catalog.ts`** with the fixed lists: 6 units with `kind` and `capacity` (Parking 120); 3 venue areas; 6 packages (names such as "Classic Buffet", "Garden Cocktail", "Plated Signature"; price per pax between ₱850 and ₱2,500 in centavos; 6–9 menu items each); 40 menu items; 30 ingredients with uom, cost and par; 4 flagged `fresh`; 25 staff across units with roles and hourly rates; 60 Filipino first names and 40 surnames; 15 company names; manpower ratios from Global Constraints.
- [ ] **Step 2: Write failing test** `tests/seed.test.ts`: seed into `:memory:` with today `2026-10-26`; assert `customers` ≥ 150, `bookings` between 40 and 60, every confirmed or done booking has exactly one `job_sheets` row, ≥ 1 `production_lines` row, ≥ 5 `shifts` rows and 3 `invoices` rows whose amounts sum to `pax × price_per_pax`; there is at least one `approvals` row with status `pending`; two bookings share `venue_area` and `date` with overlapping times (the planted double-booking); one ingredient has on-hand stock below `par_level`; seeding twice with the same today gives identical `bookings` rows.
- [ ] **Step 3: Run** the seed test. Expected: FAIL.
- [ ] **Step 4: Implement `lib/seed/build.ts`**: `seedDatabase` with seed `20261026`; bookings spread from `today − 90` to `today + 60`, status `done` in the past, `confirmed` ahead, a few `inquiry` and `cancelled`; derived rows written through the Task 3 functions; payments recorded in full for `done`, deposit only for `confirmed`; daily `cafe_daily`, `parking_logs`, `court_bookings` for the past 90 days; 3 pending approvals; the planted double-booking and low-stock ingredient.
- [ ] **Step 5: Write `scripts/seed.ts`** per Interfaces and run `npm run db:reset`. Expected: prints counts, `data/demo.db` exists.
- [ ] **Step 6: Run** `npm test`. Expected: PASS.
- [ ] **Step 7: Commit** `feat: deterministic demo seed`.

### Task 5: Read layer

**Files:**
- Create: `lib/data.ts`
- Test: `tests/data.test.ts`

**Interfaces:**
- Produces (all `server-only`, take `db = getDb()` as last optional parameter for tests): `Approval { id: number; kind: string; unitName: string; requestedBy: string; amount: number; status: 'pending' | 'approved' | 'declined' }`, `getOverview(today): { totals: { revenueToday, revenueMtd, bookingsThisWeek, staffOnShift, collectedMtd, dueMtd }, units: { slug, name, revenueToday, activityLabel, activityCount, alert: string | null }[], approvals: Approval[] }` (approvals are the pending ones only), `listBookings(month: string): BookingRow[]`, `getBooking(id): BookingDetail | null` (booking + customer + package + jobSheet with lines + productionLines + shifts + invoices + payments), `listCustomers(): { id, name }[]`, `listPackages(): PackageDef[]`, `getScheduleItems(from, to): ScheduleItem[]` where `ScheduleItem { kind: 'event' | 'catering' | 'court' | 'production' | 'shift'; date; startTime; endTime; title; unitSlug; href?; pax?; venueArea? }`.
- Revenue per unit today: Events Place and Catering from `payments.paid_on`, Cafe from `cafe_daily`, Parking from `parking_logs`, Pickleball from `court_bookings`, Commissary 0 (internal) with activity "production runs today".

- [ ] **Step 1: Write failing tests** against a seeded `:memory:` db: `getOverview` returns 6 units in the fixed order and at least one non-null `alert`; `listBookings` for the planted double-booking month returns both rows; `getBooking` for a confirmed booking returns 3 invoices and a job sheet; `getScheduleItems` over the double-booking date includes two `event` items.
- [ ] **Step 2: Run**. Expected: FAIL.
- [ ] **Step 3: Implement `lib/data.ts`** with prepared statements; alerts chosen per unit in this priority: venue conflict (Task 6 `findConflicts` on the next 60 days) for Events Place, open shifts in the next 7 days for Catering, low stock for Commissary, overdue invoice for Events Place if no conflict, else null.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: read layer for overview, bookings and schedule`.

### Task 6: Conflict rules (pure)

**Files:**
- Create: `lib/conflicts.ts`
- Test: `tests/conflicts.test.ts`

**Interfaces:**
- Produces: `findConflicts(bookings: { id; date; startTime; endTime; venueArea; pax; status }[], parkingCapacity: number): Conflict[]` where `Conflict { kind: 'venue' | 'parking'; date; bookingIds: number[]; message: string }`. Cancelled bookings are ignored.

- [ ] **Step 1: Write failing tests**: same venue, same date, `10:00–14:00` and `13:00–18:00` → one `venue` conflict naming both ids; different areas → none; two overlapping bookings pax 200 and 180 with capacity 120 → `parking` conflict (67 + 60 = 127 > 120); cancelled booking never conflicts.
- [ ] **Step 2: Run**. Expected: FAIL.
- [ ] **Step 3: Implement** using `overlaps` from `lib/dates.ts`.
- [ ] **Step 4: Run**. Expected: PASS.
- [ ] **Step 5: Commit** `feat: venue and parking conflict rules`.

### Task 7: UI primitives and group overview page

**Files:**
- Create: `lib/ui.tsx`, `app/page.tsx` (replace placeholder), `app/actions/approvals.ts`
- Test: `tests/approvals.test.ts`

**Interfaces:**
- Produces in `lib/ui.tsx`: `php(centavos: number): string`, `Card`, `Badge({ tone: 'ok' | 'warn' | 'info' | 'muted' })`, `Empty({ text })`, `Stat({ label, value })`.
- Produces: server actions `approve(id: number)`, `decline(id: number)` in `app/actions/approvals.ts` (update status, `revalidatePath('/')`); core `setApprovalStatus(db, id, status)` exported for tests.

- [ ] **Step 1: Write failing test**: `php(123456) === '₱1,234.56'`; `setApprovalStatus` on a pending row sets `approved`; on a missing id returns `{ ok: false, error: 'Not found' }`.
- [ ] **Step 2: Run**. Expected: FAIL.
- [ ] **Step 3: Implement `lib/ui.tsx`** and `app/actions/approvals.ts`.
- [ ] **Step 4: Build `app/page.tsx`**: `export const dynamic = 'force-dynamic'`; five `Stat` tiles from `totals`; six unit cards in a 3-column grid linking to `/events` for Events Place and to `/schedule?unit=<slug>` for the rest (Stage 2 adds the unit pages); each card shows `php(revenueToday)`, `activityCount activityLabel`, and the alert in amber when present; "Needs your decision" section listing pending approvals with Approve and Decline buttons wired to the actions, `Empty` text "Nothing waiting on you." when none.
- [ ] **Step 5: Verify** `npm run typecheck` and in `npm run dev` the overview renders six cards and clicking Approve removes a row.
- [ ] **Step 6: Commit** `feat: group overview with unit cards and approvals strip`.

### Task 8: Events page and booking detail

**Files:**
- Create: `app/events/page.tsx`, `app/events/calendar.tsx`, `app/events/[id]/page.tsx`

**Interfaces:**
- Consumes: `listBookings`, `getBooking`, `monthDays`, `fmtDate`, `php`.
- Produces: `/events?month=YYYY-MM` (default current month) and `/events/[id]`.

- [ ] **Step 1: Build `app/events/calendar.tsx`** (server component): 7-column month grid from `monthDays`, bookings as small chips colored by status (confirmed emerald, inquiry sky, done muted, cancelled strikethrough), each linking to `/events/[id]`; previous and next month links.
- [ ] **Step 2: Build `app/events/page.tsx`**: calendar on top, list below with columns Date, Customer, Pax, Package, Venue, Status, Balance due (`sum(invoices) − sum(payments)`), and a "New booking" link to `/events/new` (Task 9).
- [ ] **Step 3: Build `app/events/[id]/page.tsx`**: header with customer, date, times, pax, venue, status; four linked panels in a 2×2 grid: Catering job sheet (lines with qty), Commissary production (lines grouped by production date), Manpower (role, headcount, assigned vs open), Payments (invoices with due dates and paid flags, total, collected, balance). `notFound()` for an unknown id.
- [ ] **Step 4: Verify** in dev: `/events` shows the current month with chips; the planted double-booking's detail page shows all four panels.
- [ ] **Step 5: Commit** `feat: events calendar, list and booking detail`.

### Task 9: New booking and edit with derivation

**Files:**
- Create: `lib/bookings.ts`, `app/actions/bookings.ts`, `app/events/new/page.tsx`, `app/events/[id]/edit/page.tsx`, `app/events/booking-form.tsx`
- Test: `tests/bookings.test.ts`

**Interfaces:**
- Produces in `lib/bookings.ts`: `BookingInputSchema` (zod: `customerId` number or `customerName` non-empty string, `date` `YYYY-MM-DD` not before today, `startTime` < `endTime`, `pax` integer 10–1000, `packageId`, `venueArea` in the three areas, `depositCentavos` integer ≥ 0 and ≤ total, `notes` ≤ 500 chars), `createBooking(db, input, today): { ok: true; id } | { ok: false; errors: Record<string, string> }`, `updateBooking(db, id, input, today)`, `rederive(db, bookingId, today)` (deletes job sheet, its lines, this booking's production contributions, unassigned shifts and invoices; keeps payments; recomputes through Task 3 functions inside `withTransaction`).
- Produces: server actions `createBookingAction(prev, formData)` and `updateBookingAction(id, prev, formData)` returning `{ errors }` for `useFormState`, redirecting to `/events/[id]` on success.
- Production contribution: `production_lines.qty` is recomputed for the affected dates from all remaining job sheets, so deleting one booking's share is a recompute, not a subtraction.

- [ ] **Step 1: Write failing tests**: `createBooking` with a new customer name creates the customer, 1 job sheet, production lines on `date − 1` (and on `date` for fresh), shifts whose count equals the sum of `deriveManpower` headcounts, 3 invoices, and a deposit payment when `depositCentavos > 0`; invalid pax 5 returns `errors.pax`; deposit above total returns `errors.depositCentavos`; `re-derive keeps payments`: record a payment, update pax 100 → 150, job line qty grows, payments count unchanged, invoices sum equals the new total; two bookings on one production day then update one → the shared ingredient line equals the recomputed sum.
- [ ] **Step 2: Run**. Expected: FAIL.
- [ ] **Step 3: Implement `lib/bookings.ts`** per Interfaces; wrap any thrown error as `{ ok: false, errors: { form: 'Could not save, try again.' } }` and `console.error` the detail.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Build `app/events/booking-form.tsx`** (client component with `useFormState`): customer select with "New customer" text field, date, start, end, pax, package select showing price per pax, venue area select, deposit in pesos (converted to centavos in the action), notes; inline error under each field and a form-level error line. `app/events/new/page.tsx` and `app/events/[id]/edit/page.tsx` render it with packages and customers from `lib/data.ts`.
- [ ] **Step 6: Verify** in dev: create a booking for next month with 120 pax; its detail page shows 6 servers, 3 cooks, 2 dishwashers, 2 marshals, 1 supervisor, three invoices, and the production list on the day before.
- [ ] **Step 7: Commit** `feat: create and edit bookings with derived records`.

### Task 10: Compound schedule page

**Files:**
- Create: `app/schedule/page.tsx`, `app/schedule/week.tsx`

**Interfaces:**
- Consumes: `getScheduleItems`, `findConflicts`, `listBookings`.
- Produces: `/schedule?view=week|month&from=YYYY-MM-DD&unit=<slug>`; default week starting today.

- [ ] **Step 1: Build `app/schedule/week.tsx`**: 7 day columns, items stacked by start time, color by `kind` (event emerald, catering amber, court sky, production violet, shift zinc), unit filter chips across the top, previous and next links.
- [ ] **Step 2: Build `app/schedule/page.tsx`**: week or month view (month reuses `app/events/calendar.tsx` layout with all item kinds), and a "Conflicts" panel above listing `findConflicts` results for the visible range with links to the bookings; `Empty` text "No conflicts in this range." when none.
- [ ] **Step 3: Verify** in dev: the planted double-booking week shows two overlapping event items and one venue conflict line.
- [ ] **Step 4: Commit** `feat: compound schedule with conflict warnings`.

### Task 11: Reset demo

**Files:**
- Create: `lib/reset.ts`, `app/actions/reset.ts`, `app/reset-button.tsx`
- Modify: `app/layout.tsx` (mount the button)
- Test: `tests/reset.test.ts`

**Interfaces:**
- Produces: `resetDemo(dbPath: string, today: string, seed = seedDatabase): { ok: boolean; error?: string }`: copies `dbPath` to `dbPath + '.bak'` if it exists, closes the singleton, deletes and recreates the file, seeds; on any throw restores the backup and returns `{ ok: false, error }`. Server action `resetDemoAction()` calls it with `getDbPath()` and `revalidatePath('/', 'layout')`.

- [ ] **Step 1: Write failing tests** using a temp file path: after reset, `bookings` count matches a fresh seed; `restores backup on failure`: a `seed` stub that throws leaves the original file byte-identical and returns `ok: false`.
- [ ] **Step 2: Run**. Expected: FAIL.
- [ ] **Step 3: Implement** `lib/reset.ts` and the action; `app/reset-button.tsx` is a client component with a confirm dialog "Reset all demo data to the seed?" and a pending state label "Resetting…".
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Verify** in dev: approve an approval, click Reset, the approval is pending again.
- [ ] **Step 6: Commit** `feat: reset demo with backup and restore`.

### Task 12: Smoke test and demo run sheet

**Files:**
- Create: `tests/smoke.mjs`, `docs/demo-run-sheet.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: the running app; `npm run test:smoke` starts `next dev -p 3101` with `DEMO_DB=data/smoke.db`, waits for the port, runs, and kills the server.

- [ ] **Step 1: Write `tests/smoke.mjs`** with the preinstalled `playwright`: reset via `npm run db:reset` with `DEMO_DB=data/smoke.db`; open `/`, assert the banner text and six unit cards; open `/events/new`, fill a booking (customer "Smoke Test Co", next month, pax 120, first package, Grand Hall, deposit 20000), submit, assert the detail page shows "6 servers" and three invoice rows; open `/events?month=<that month>` and `/schedule?from=<that date>` and assert "Smoke Test Co" appears on both; open the detail's production panel and assert a line dated the day before; click Reset, confirm, and assert "Smoke Test Co" is gone from `/events`.
- [ ] **Step 2: Run** `npm run test:smoke`. Expected: prints `SMOKE OK` and exits 0. Fix whatever fails.
- [ ] **Step 3: Write `docs/demo-run-sheet.md`**: the 10-minute click path for the meeting (overview → approvals → events → new booking → four panels → schedule conflict → reset), what to say at each step, and the three questions to ask the owners while on each page.
- [ ] **Step 4: Update `README.md`** with `test:smoke` and the run sheet link.
- [ ] **Step 5: Run** `npm run typecheck && npm test && npm run build`. Expected: all pass.
- [ ] **Step 6: Commit** `test: playwright smoke test and demo run sheet`.

### Task 13: Discovery question list and proposal draft

**Files:**
- Create: `docs/sales/2026-10-26_gas_cvj-discovery-questions_v1.md`, `docs/sales/2026-10-26_gas_cvj-proposal-draft_v1.md`

**Interfaces:**
- Consumes: spec section 8 (deliverables) and section 9 (out of scope). No code.
- Produces: two Markdown files Bren copies into the Garrett vault lane `businesses/active/growth-architect-studio/` under the same names.

- [ ] **Step 1: Write the discovery question list**: one page, grouped by unit plus a "group" group; the questions from spec section 8 item 1; each question has a blank line for the answer and a column "Which demo screen answers this".
- [ ] **Step 2: Write the proposal draft** with sections: Who this is for; What we saw in the demo; Scope by unit; Phases 1–3 (from spec section 8 item 2); Discovery week clause; Hosting and data ownership (Supabase, client owns the data, GAS builds and maintains); What is not included (spec section 9); Investment, with a blank price block and the two pricing structures laid out side by side with GAS tier figures (Framework ₱129,997, Skyline ₱299,997, retainer from ₱25,000/month) and the RestOS-style build fee plus per-unit monthly structure, both marked "for Bren to choose and fill"; Next steps and signature lines. No invented quote.
- [ ] **Step 3: Verify** both files name their vault lane and file name at the top and contain no CVJ figures presented as facts.
- [ ] **Step 4: Commit** `docs: discovery questions and proposal draft for CVJ`.
