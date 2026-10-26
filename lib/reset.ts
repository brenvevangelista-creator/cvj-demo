// Reset the demo database to the seed, with a backup that is restored if seeding fails.
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { closeDb, openDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed/build';

export type ResetResult = { ok: true } | { ok: false; error: string };
type Seeder = (db: Database.Database, today: string) => void;

const sidecars = (p: string) => [`${p}-wal`, `${p}-shm`];

function removeDbFiles(p: string): void {
  for (const f of [p, ...sidecars(p)]) fs.rmSync(f, { force: true });
}

/** Flush the WAL into the main file so a plain file copy is a complete backup. */
function checkpoint(p: string): void {
  const db = new Database(p);
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } finally {
    db.close();
  }
}

/**
 * Order matters: the live file is only deleted once a backup exists (or there
 * was no file to begin with). Any failure before that point leaves it untouched.
 */
export function resetDemo(dbPath: string, today: string, seed: Seeder = seedDatabase): ResetResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return { ok: false, error: `Invalid today: ${today}` };
  if (dbPath === ':memory:') return { ok: false, error: 'Cannot reset an in-memory database' };
  const bak = `${dbPath}.bak`;
  const hadFile = fs.existsSync(dbPath);
  let backedUp = false;
  let liveRemoved = false;
  try {
    closeDb();
    if (hadFile) {
      fs.rmSync(bak, { force: true });
      checkpoint(dbPath);
      fs.copyFileSync(dbPath, bak);
      backedUp = true;
    }
    removeDbFiles(dbPath);
    liveRemoved = true;
    const db = openDb(dbPath);
    try {
      seed(db, today);
    } finally {
      db.close();
    }
    fs.rmSync(bak, { force: true });
    return { ok: true };
  } catch (err) {
    console.error('resetDemo failed', err);
    if (liveRemoved) {
      removeDbFiles(dbPath);
      if (backedUp) fs.renameSync(bak, dbPath);
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
