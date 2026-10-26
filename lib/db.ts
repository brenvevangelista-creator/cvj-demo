import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export type Db = Database.Database;

const SCHEMA_PATH = path.join(process.cwd(), 'db', 'schema.sql');

/** Path of the demo database; tests set DEMO_DB=':memory:'. */
export function getDbPath(): string {
  return process.env.DEMO_DB ?? path.join('data', 'demo.db');
}

/** Open a database and make sure the schema is present. */
export function openDb(dbPath: string = getDbPath()): Db {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('foreign_keys = on');
  db.pragma('journal_mode = WAL');
  const hasUnits = db
    .prepare("select 1 from sqlite_master where type='table' and name='units'")
    .get();
  if (!hasUnits) db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  return db;
}

// One connection per process, cached on globalThis so Next.js dev reloads reuse it.
const g = globalThis as unknown as { __cvjDb?: Db };

export function getDb(): Db {
  if (!g.__cvjDb) g.__cvjDb = openDb(getDbPath());
  return g.__cvjDb;
}

export function closeDb(): void {
  if (g.__cvjDb) {
    g.__cvjDb.close();
    g.__cvjDb = undefined;
  }
}

/** Run fn inside a transaction; any throw rolls everything back. */
export function withTransaction<T>(db: Db, fn: () => T): T {
  return db.transaction(fn)();
}
