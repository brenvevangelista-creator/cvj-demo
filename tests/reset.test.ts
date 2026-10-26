import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed/build';
import { resetDemo } from '@/lib/reset';

const TODAY = '2026-10-26';
let dir: string;
let dbPath: string;

const bookings = (p: string) => {
  const db = openDb(p);
  const n = (db.prepare('select count(*) as n from bookings').get() as any).n as number;
  db.close();
  return n;
};

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cvj-reset-'));
  dbPath = path.join(dir, 'demo.db');
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('resetDemo', () => {
  it('creates and seeds the database when none exists', () => {
    expect(fs.existsSync(dbPath)).toBe(false);
    expect(resetDemo(dbPath, TODAY)).toEqual({ ok: true });
    const fresh = openDb(':memory:');
    seedDatabase(fresh, TODAY);
    expect(bookings(dbPath)).toBe((fresh.prepare('select count(*) as n from bookings').get() as any).n);
  });

  it('restores the seed over a modified database', () => {
    resetDemo(dbPath, TODAY);
    const db = openDb(dbPath);
    db.prepare("delete from bookings where id = (select min(id) from bookings)").run();
    const fewer = (db.prepare('select count(*) as n from bookings').get() as any).n;
    db.close();
    expect(resetDemo(dbPath, TODAY)).toEqual({ ok: true });
    expect(bookings(dbPath)).toBe(fewer + 1);
  });

  it('restores backup on failure', () => {
    resetDemo(dbPath, TODAY);
    const db = openDb(dbPath);
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();
    const before = fs.readFileSync(dbPath);
    const boom = () => {
      throw new Error('seed exploded');
    };
    const r = resetDemo(dbPath, TODAY, boom);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toContain('seed exploded');
    expect(fs.readFileSync(dbPath).equals(before)).toBe(true);
    expect(bookings(dbPath)).toBeGreaterThan(0);
  });

  it('seeds over an empty database that has the schema but no rows', () => {
    openDb(dbPath).close();
    expect(bookings(dbPath)).toBe(0);
    expect(resetDemo(dbPath, TODAY)).toEqual({ ok: true });
    expect(bookings(dbPath)).toBeGreaterThan(0);
  });

  it('rejects a malformed today and leaves the file untouched', () => {
    resetDemo(dbPath, TODAY);
    const before = bookings(dbPath);
    const r = resetDemo(dbPath, 'not-a-date');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/today/i);
    expect(bookings(dbPath)).toBe(before);
  });

  it('cleans up a stale backup left by an earlier run', () => {
    resetDemo(dbPath, TODAY);
    fs.writeFileSync(`${dbPath}.bak`, 'garbage');
    expect(resetDemo(dbPath, TODAY)).toEqual({ ok: true });
    expect(fs.existsSync(`${dbPath}.bak`)).toBe(false);
    expect(bookings(dbPath)).toBeGreaterThan(0);
  });

  it('reports failure without a backup when seeding a brand-new file fails', () => {
    const boom = () => {
      throw new Error('first seed failed');
    };
    const r = resetDemo(dbPath, TODAY, boom);
    expect(r.ok).toBe(false);
    expect(fs.existsSync(dbPath)).toBe(false);
  });
});
