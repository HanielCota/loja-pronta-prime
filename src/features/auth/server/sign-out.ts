'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/server/auth/auth';

/** Encerra a sessão (apaga do banco e do cookie) e volta pro login. */
export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect('/entrar');
}
