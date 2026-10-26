// Approval decisions. Pure database logic; the server action in app/actions wraps it.
import type { Db } from '@/lib/db';

export type Decision = 'approved' | 'declined';
export type ActionResult = { ok: true } | { ok: false; error: string };

export function setApprovalStatus(db: Db, id: number, status: Decision): ActionResult {
  if (status !== 'approved' && status !== 'declined') return { ok: false, error: 'Invalid status' };
  const row = db.prepare('select status from approvals where id = ?').get(id) as { status: string } | undefined;
  if (!row) return { ok: false, error: 'Not found' };
  if (row.status !== 'pending') return { ok: false, error: 'Already decided' };
  db.prepare("update approvals set status = ?, updated_at = datetime('now') where id = ?").run(status, id);
  return { ok: true };
}
