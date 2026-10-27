'use server';

import { runAsStudent } from '@/features/support/server/impersonation';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/server/auth/auth';

/** Encerra a sessão (apaga do banco e do cookie) e volta pro login. */
export async function signOut() {
  return runAsStudent('signOut', async () => {
    await auth.api.signOut({ headers: await headers() });
    redirect('/entrar');
  });
}
