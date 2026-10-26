// Rebuilds the demo database from the deterministic seed, relative to today (Asia/Manila).
import fs from 'node:fs';
import { getDbPath, openDb } from '../lib/db';
import { todayManila } from '../lib/dates';
import { seedDatabase } from '../lib/seed/build';

const dbPath = getDbPath();
if (dbPath !== ':memory:') for (const f of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) fs.rmSync(f, { force: true });
const db = openDb(dbPath);
const today = todayManila();
seedDatabase(db, today);
for (const t of ['units', 'customers', 'bookings', 'job_sheets', 'production_lines', 'shifts', 'invoices', 'payments', 'court_bookings', 'approvals']) {
  const n = (db.prepare(`select count(*) as n from ${t}`).get() as { n: number }).n;
  console.log(`${t.padEnd(18)} ${n}`);
}
db.close();
console.log(`Seeded ${dbPath} for ${today}`);
