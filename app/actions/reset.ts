'use server';

import { revalidatePath } from 'next/cache';
import { getDbPath } from '@/lib/db';
import { todayManila } from '@/lib/dates';
import { resetDemo, type ResetResult } from '@/lib/reset';

export async function resetDemoAction(): Promise<ResetResult> {
  const r = resetDemo(getDbPath(), todayManila());
  revalidatePath('/', 'layout');
  return r.ok ? r : { ok: false, error: 'Reset failed; the previous data was kept.' };
}
