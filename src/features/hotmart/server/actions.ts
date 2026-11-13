'use server';

import { eq, desc, ilike, or, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { hotmartEvents, hotmartProductMappings, hotmartSettings } from '@/server/db/schema';
import { requireAdmin } from '@/features/admin/server/access';
import { encryptHottok } from './secret';
import { parseHotmartSettings } from '../settings-input';
import { replayPendingHotmartEvents } from './pending-events';
import { revalidateAdminOverview } from '@/features/admin/server/overview-cache';

export type SettingsResult = { message: string; saved: boolean; secondaryConfigured?: boolean };

export async function saveHotmartSettings(
  _previous: SettingsResult,
  form: FormData,
): Promise<SettingsResult> {
  const session = await requireAdmin('/admin/hotmart');
  const parsed = parseHotmartSettings(form);
  if (!parsed.ok) {
    return { message: parsed.message, saved: false };
  }

  const { token, secondaryToken, sllCode: sll, storeCode: store } = parsed.value;
  const outcome = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('hotmart-product-mappings'))`);
    const previous = await tx.query.hotmartSettings.findFirst({
      where: eq(hotmartSettings.id, 'main'),
    });
    if (!previous && !token) {
      return { message: 'Informe o token principal da Hotmart.', saved: false };
    }

    const currentMappings = await tx.query.hotmartProductMappings.findMany();
    if (
      currentMappings.some(
        (item) => !item.primary && (item.productUcode === sll || item.productUcode === store),
      )
    ) {
      return {
        saved: false,
        message:
          'Esse código já está cadastrado em Especialistas e vídeos. Preserve a origem e use os códigos principais deste formulário.',
      };
    }

    const primaryMappings = currentMappings.filter((item) => item.primary);
    const changedMappings = primaryMappings.some(
      (item) => (item.access === 'sll' ? sll : store) !== item.productUcode,
    );
    if (
      changedMappings &&
      (await tx.query.hotmartPurchases.findFirst({ columns: { transaction: true } }))
    ) {
      return {
        saved: false,
        message:
          'Já chegaram compras com esses códigos, então eles não podem mudar: isso mexeria no acesso de quem já comprou. Volte aos códigos de antes e salve de novo.',
      };
    }

    if (token || secondaryToken) {
      const encryptedSettings = {
        encryptedHottok: token ? encryptHottok(token) : previous!.encryptedHottok,
        encryptedSecondaryHottok: secondaryToken
          ? encryptHottok(secondaryToken)
          : (previous?.encryptedSecondaryHottok ?? null),
        updatedBy: session.user.id,
        updatedAt: new Date(),
      };

      await tx
        .insert(hotmartSettings)
        .values({ id: 'main', ...encryptedSettings })
        .onConflictDoUpdate({
          target: hotmartSettings.id,
          set: encryptedSettings,
        });
    }
    if (changedMappings || primaryMappings.length !== 2) {
      await tx.delete(hotmartProductMappings).where(eq(hotmartProductMappings.primary, true));
      await tx
        .insert(hotmartProductMappings)
        .values([
          { productUcode: sll, access: 'sll' },
          { productUcode: store, access: 'loja-pronta' },
        ])
        .onConflictDoNothing();
    }

    return {
      message: 'Configuração salva. Novos avisos já podem ser recebidos.',
      saved: true,
      secondaryConfigured: Boolean(secondaryToken || previous?.encryptedSecondaryHottok),
    };
  });
  if (outcome.saved) {
    await replayPendingHotmartEvents(sll);
    await replayPendingHotmartEvents(store);
    revalidateAdminOverview();
    revalidatePath('/admin/hotmart');
  }
  return outcome;
}

export async function retryHotmartPendingEvents(): Promise<void> {
  await requireAdmin('/admin/hotmart');
  const result = await replayPendingHotmartEvents();
  revalidateAdminOverview();
  revalidatePath('/', 'layout');
  redirect(`/admin/hotmart?resultado=${result.failed ? 'retry-failed' : 'retried'}`);
}

export async function getHotmartAdminState(query = '') {
  await requireAdmin('/admin/hotmart');
  const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
  const numericId = /^\d+$/.test(query) ? Number(query) : NaN;
  const [[settings], mappings, events] = await Promise.all([
    db
      .select({
        secondaryConfigured: sql<boolean>`${hotmartSettings.encryptedSecondaryHottok} is not null`,
      })
      .from(hotmartSettings)
      .where(eq(hotmartSettings.id, 'main')),
    db.query.hotmartProductMappings.findMany(),
    db.query.hotmartEvents.findMany({
      where: query
        ? or(
            eq(hotmartEvents.transaction, query),
            eq(hotmartEvents.productUcode, query),
            Number.isSafeInteger(numericId) ? eq(hotmartEvents.productId, numericId) : undefined,
            ilike(hotmartEvents.productName, pattern),
          )
        : undefined,
      orderBy: [desc(hotmartEvents.receivedAt), desc(hotmartEvents.id)],
      limit: 20,
    }),
  ]);
  return {
    configured: Boolean(settings),
    secondaryConfigured: settings?.secondaryConfigured ?? false,
    mappings,
    events,
  };
}
