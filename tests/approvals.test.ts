import { describe, it, expect } from 'vitest';
import { php } from '@/lib/money';
import { openDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed/build';
import { setApprovalStatus } from '@/lib/approvals';

describe('php', () => {
  it('formats centavos as pesos with two decimals and thousands separators', () => {
    expect(php(123456)).toBe('₱1,234.56');
  });
  it('formats zero', () => {
    expect(php(0)).toBe('₱0.00');
  });
  it('formats millions', () => {
    expect(php(123_456_789)).toBe('₱1,234,567.89');
  });
  it('keeps a minus sign for negative amounts', () => {
    expect(php(-5000)).toBe('-₱50.00');
  });
  it('formats a single centavo', () => {
    expect(php(1)).toBe('₱0.01');
  });
  it('rounds a fractional centavo value instead of printing decimals of a centavo', () => {
    expect(php(1234.6)).toBe('₱12.35');
  });
});

describe('setApprovalStatus', () => {
  function seeded() {
    const db = openDb(':memory:');
    seedDatabase(db, '2026-10-26');
    return db;
  }

  it('approves a pending approval', () => {
    const db = seeded();
    const id = (db.prepare("select id from approvals where status = 'pending' limit 1").get() as any).id;
    expect(setApprovalStatus(db, id, 'approved')).toEqual({ ok: true });
    expect((db.prepare('select status from approvals where id = ?').get(id) as any).status).toBe('approved');
  });

  it('declines a pending approval', () => {
    const db = seeded();
    const id = (db.prepare("select id from approvals where status = 'pending' limit 1").get() as any).id;
    expect(setApprovalStatus(db, id, 'declined')).toEqual({ ok: true });
    expect((db.prepare('select status from approvals where id = ?').get(id) as any).status).toBe('declined');
  });

  it('reports a missing id', () => {
    const db = seeded();
    expect(setApprovalStatus(db, 999_999, 'approved')).toEqual({ ok: false, error: 'Not found' });
  });

  it('rejects an invalid status value', () => {
    const db = seeded();
    const id = (db.prepare("select id from approvals where status = 'pending' limit 1").get() as any).id;
    expect(setApprovalStatus(db, id, 'pending' as any)).toEqual({ ok: false, error: 'Invalid status' });
    expect(setApprovalStatus(db, id, 'whatever' as any)).toEqual({ ok: false, error: 'Invalid status' });
  });

  it('refuses to change an approval that is no longer pending', () => {
    const db = seeded();
    const id = (db.prepare("select id from approvals where status = 'approved' limit 1").get() as any).id;
    expect(setApprovalStatus(db, id, 'declined')).toEqual({ ok: false, error: 'Already decided' });
  });
});
