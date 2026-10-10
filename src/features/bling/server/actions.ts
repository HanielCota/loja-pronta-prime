'use server';

import { redirect } from 'next/navigation';
import { requireAdmin } from '@/features/admin/server/access';
import { consumeAttempt } from '@/server/auth/rate-limit';
import { BLING_PATH } from '../model';
import { getBlingConfiguration } from './client';
import { beginBlingAuthorization, removeBlingConnection } from './connection';

export async function connectBling() {
  const session = await requireAdmin(BLING_PATH);
  const config = getBlingConfiguration();
  if (!config) redirect(`${BLING_PATH}?resultado=unavailable`);
  if (!(await consumeAttempt('blingPerUser', session.user.id)))
    redirect(`${BLING_PATH}?resultado=limited`);
  const url = await beginBlingAuthorization(session.user.id, session.session.id, config);
  redirect(url);
}

export async function disconnectBling() {
  await requireAdmin(BLING_PATH);
  await removeBlingConnection();
  redirect(`${BLING_PATH}?resultado=disconnected`);
}

export async function previewBling() {
  await requireAdmin(BLING_PATH);
  redirect(`${BLING_PATH}?consultar=1`);
}
