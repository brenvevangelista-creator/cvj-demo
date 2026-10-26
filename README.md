# CVJ Group demo dashboard

A sales demo built by Growth Architect Studio for the owners of CVJ Events Place: one owner dashboard across six business units (Events Place, Catering, Cafe, Commissary, Parking, Pickleball), where saving an event booking derives the catering job sheet, the commissary production list, the manpower roster and the payment schedule.

**Every page carries the banner:** "Sample data prepared by Growth Architect Studio for CVJ. Names and figures are invented." Nothing here is CVJ's real data.

**Not production.** The demo runs on one SQLite file so it works offline and resets in a click. The production build moves to Supabase with logins and roles. See `docs/superpowers/specs/2026-10-26-cvj-demo-design.md`.

## Run it

```bash
npm install
npm run db:reset   # builds data/demo.db from the deterministic seed, relative to today
npm run dev        # http://localhost:3000
```

## Check it

```bash
npm run typecheck
npm test           # vitest: derivation rules, seed integrity, data layer
```

The `DEMO_DB` environment variable overrides the database path (tests use `:memory:`).
