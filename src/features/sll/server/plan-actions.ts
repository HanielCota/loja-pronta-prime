'use server';

import { runAsStudent } from '@/features/support/server/impersonation';
import { refresh } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { requireProductAction } from '@/features/products/server/access';
import { db } from '@/server/db';
import { sllPlanIntake } from '@/server/db/schema';
import { isSllPlanStoreAge } from '../plan-intake';

export type SllPlanIntakeActionResult = { saved: boolean; message: string };

/** Salva a entrada do plano com acesso conferido no servidor, inclusive em envio adulterado. */
export async function saveSllPlanIntake(
  _previous: SllPlanIntakeActionResult,
  formData: FormData,
): Promise<SllPlanIntakeActionResult> {
  return runAsStudent('saveSllPlanIntake', async () => {
    const storeAge = formData.get('storeAge');
    if (!isSllPlanStoreAge(storeAge)) {
      return { saved: false, message: 'Escolha uma opção para continuar.' };
    }

    try {
      const { userId } = await requireProductAction('sll');
      const now = new Date();
      await db
        .insert(sllPlanIntake)
        .values({ userId, storeAge, answeredAt: now, updatedAt: now })
        .onConflictDoNothing();
      // Só a tela de quem respondeu: revalidatePath expiraria o conteúdo de todas as alunas.
      refresh();
      return { saved: true, message: 'Resposta salva. Seu plano está pronto para começar.' };
    } catch (error) {
      unstable_rethrow(error);
      return { saved: false, message: 'Não foi possível salvar sua resposta. Tente novamente.' };
    }
  });
}
