'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
import { setApprovalStatus, type ActionResult } from '@/lib/approvals';

function decide(id: number, status: 'approved' | 'declined'): ActionResult {
  try {
    const result = setApprovalStatus(getDb(), id, status);
    revalidatePath('/');
    return result;
  } catch (err) {
    console.error('approval action failed', err);
    return { ok: false, error: 'Could not save, try again.' };
  }
}

export async function approve(id: number): Promise<ActionResult> {
  return decide(id, 'approved');
}

export async function decline(id: number): Promise<ActionResult> {
  return decide(id, 'declined');
}
