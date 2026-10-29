# Proposal draft: CVJ Group website and operating dashboard

- Vault lane: `businesses/active/growth-architect-studio/`
- File name: `2026-10-26_gas_cvj-proposal-draft_v3.md` (v3 adds public-listing facts marked to confirm; v2 added the website; earlier versions kept for the record)
- Status: DRAFT for Bren. Price block is blank on purpose. Replace every bracketed item before sending. Nothing in this draft states a fact about CVJ's current operations; those come from the discovery meeting.

---

**Prepared by:** Growth Architect Studio (GAS)
**Prepared for:** Mike Abella and [wife's name], CVJ Events Place
**Date:** [date]

## 1. Who this is for

CVJ runs six businesses in one compound: an events place, in-site and off-site catering, a cafe, a commissary, a parking lot and pickleball courts. [From public listings, to confirm with the owners before sending: the family business dates from 1995; the venue is listed as CVJ Clubhouse Events Place at 50 Eagle Street, New Marikina Subdivision, Barangay Sta. Elena, Marikina City, described as a three-storey function hall with one event space per floor; the courts are listed as CVJ Pickleball Park at 42 Eagle Street.] The owners want to run the group more efficiently and with less manual work and reporting. This proposal is for two things built as one package: a public website for the compound, and one operating dashboard behind it that shows every business, its customers, money, schedule and analytics, and that turns one event booking into the catering, commissary, staffing and payment records that today are handled by hand. The website is the front door; the dashboard is the back office; the inquiry a guest sends on the site is the same record the owners see in their pipeline.

## 2. What we showed in the demo

- One overview of all six businesses, with the decisions waiting on the owners.
- An events calendar where saving a booking creates the catering job sheet, the commissary production list for the day before, the staff requirement by role, and the payment schedule.
- A compound schedule across events, catering jobs, courts, production and staff, which flagged a double-booked hall and a parking overflow on its own.

The demo ran on invented sample data on a laptop. The real system runs on CVJ's own cloud database with logins for owners, managers and staff.

## 3. Scope by business

| Business | What the system does |
| --- | --- |
| Events Place | Inquiry pipeline, bookings calendar, packages, deposits and balances, conflict warnings |
| Catering | Job sheets from bookings, off-site logistics checklist, standalone catering jobs |
| Commissary | Production board by day, stock on hand with low-stock alerts, recipe costing for new dishes |
| Manpower (all units) | Staff list, weekly roster, open shifts from event requirements, overtime, labor cost per event |
| Cafe | Daily sales log, top items, standing order to the commissary |
| Parking | Daily log, event-day forecast, capacity warnings |
| Pickleball | Court booking grid, memberships, utilisation |
| Owners | Group overview, customers across all units, money (receivables, payables, cash close), analytics, approvals |

## 3a. The website

One site in CVJ's brand for the whole compound, built by Growth Architect Studio and connected to the operating dashboard.

| Section | What it does | Connects to |
| --- | --- | --- |
| Events Place | Venue areas, galleries, packages with starting prices, an inquiry form with date and guest count | Inquiry pipeline |
| Catering | In-site and off-site menus, sample packages, an inquiry form | Inquiry pipeline |
| Cafe | Menu and hours | Menu table (same items the commissary costs) |
| Pickleball | Court rates, membership, online court booking | Court bookings on the schedule |
| Parking | Rates and event-day information | — |
| About and contact | The family's story, map, phone, Viber and Messenger links | — |

Also included: mobile-first design, Google Business Profile setup, basic search engine foundations, and analytics. Not included: paid advertising, ongoing content writing, photography (a photo day can be quoted).

Tier: this is a full site around a live system, which under the GAS price list is the Skyline tier (about six weeks). A brochure site with one inquiry form and no online booking would be the Framework tier instead. [Bren to choose.]

## 4. Phases

**Phase 0, in parallel with Phase 1: the website.** Design, content gathering, build, inquiry and court-booking forms wired to the dashboard, launch on CVJ's domain.
**Phase 1: Group dashboard and the events flow.** Overview, approvals, events calendar and booking form, derived job sheet, production list, manpower and payment schedule, compound schedule with conflicts. Owner logins.
**Phase 2: A working module for each business.** Customers and inquiry pipeline, money, commissary with stock and recipe costing, people and roster, catering, parking, pickleball, cafe, analytics. Manager logins per business.
**Phase 3: Staff tools and automation.** Phone forms for daily cash close, receiving and shift confirmation. Automated morning report to the owners. Staff logins.

[Timeline per phase: for Bren to fill after discovery.]

## 5. Discovery week

The first week after signing is a discovery week on site. We map how each business works today, confirm the rules the demo assumed (manpower ratios, payment schedule, production lead times, packages), and agree the final Phase 1 scope in writing. Changes found in discovery are absorbed within the phase plan; anything beyond it is quoted separately before work starts.

## 6. Hosting and data ownership

- The system runs on a cloud Postgres database (Supabase) in CVJ's own account. CVJ owns the data and can export it at any time.
- The website is hosted by GAS under the monthly fee; the domain name is registered in CVJ's name and stays theirs.
- GAS builds, hosts the application and maintains it under the retainer.
- Logins and roles for owners, managers and staff; each person sees only what their role allows.
- No CVJ data is used in GAS marketing without written consent.

## 7. Not included

Logins were shown as a description, not in the demo. The following are not in this proposal unless added by a separate quote: paid advertising, ongoing content writing, photography, payment gateways, BIR receipts and accounting export, integrations with existing POS or accounting tools, a mobile app store release, email or SMS sending, and multi-company separation for other owners.

## 8. Investment

[For Bren to choose one structure and fill the figures. Both are laid out so you can see the shape. No quote is proposed here.]

**Structure A: GAS build tiers plus retainer**

| Item | Figure |
| --- | --- |
| Website, GAS tier [Skyline ₱299,997 or Framework ₱129,997, per the GAS price list of 3 Oct 2026] | ₱[ ] |
| Operating dashboard build (Phase 1 to 3) | ₱[ ] |
| Package price for both, if bundled | ₱[ ] |
| Architect on Retainer (hosting, maintenance, changes), from ₱25,000/month per the same list | ₱[ ]/month |
| Discovery week | [included or ₱ ] |

**Structure B: build fees plus one monthly platform fee**

| Item | Figure |
| --- | --- |
| Website build | ₱[ ] |
| Operating dashboard build (Phase 1 to 3) | ₱[ ] |
| Package price for both, if bundled | ₱[ ] |
| Monthly platform fee for the group, covering hosting, support and updates for the site and the dashboard | ₱[ ]/month (about ₱[ ] per business unit) |
| Discovery week | [included or ₱ ] |

Payment terms: [e.g. deposit on signing, balance per phase on acceptance]. Figures are VAT-[inclusive/exclusive].

## 9. Next steps

1. Sign this proposal.
2. Discovery week on site at the compound.
3. Phase 1 build starts; weekly check-in with the owners.

**Accepted for CVJ Events Place**

Name: ____________________  Signature: ____________________  Date: ________

**For Growth Architect Studio**

Name: Bren Evangelista  Signature: ____________________  Date: ________
