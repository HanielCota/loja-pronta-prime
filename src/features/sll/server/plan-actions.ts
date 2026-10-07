'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { requireProductAction } from '@/features/products/server/access';
import { db } from '@/server/db';
import { sllPlanIntake } from '@/server/db/schema';
import type { SllPlanStoreAge } from './plan';

export type SllPlanIntakeActionResult = { saved: boolean; message: string };

const STORE_AGE_VALUES: readonly SllPlanStoreAge[] = [
  'under_7_days',
  'exactly_7_days',
  'over_7_days',
];

function isSllPlanStoreAge(value: FormDataEntryValue | null): value is SllPlanStoreAge {
  return typeof value === 'string' && STORE_AGE_VALUES.includes(value as SllPlanStoreAge);
}

/** Salva a entrada do plano com acesso conferido no servidor, inclusive em envio adulterado. */
export async function saveSllPlanIntake(
  _previous: SllPlanIntakeActionResult,
  formData: FormData,
): Promise<SllPlanIntakeActionResult> {
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
    revalidatePath('/sll/metodo');
    revalidatePath('/sll/metodo/etapa');
    return { saved: true, message: 'Resposta salva. Seu plano está pronto para começar.' };
  } catch (error) {
    unstable_rethrow(error);
    return { saved: false, message: 'Não foi possível salvar sua resposta. Tente novamente.' };
  }
}
