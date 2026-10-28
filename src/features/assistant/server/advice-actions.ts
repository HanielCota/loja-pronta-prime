'use server';

import { runAsStudent } from '@/features/support/server/impersonation';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireProductAction } from '@/features/products/server/access';
import { generateAssistantAdvice } from './advice';

export async function requestAssistantAdvice(): Promise<void> {
  return runAsStudent('requestAssistantAdvice', async () => {
    const { userId } = await requireProductAction('sll');
    let result = 'unavailable';
    try {
      result = await generateAssistantAdvice(userId);
    } catch {
      /* Não expõe erros da conta ou da API. */
    }
    revalidatePath('/sll/plano');
    redirect(`/sll/plano?resultado=advice-${result}`);
  });
}
