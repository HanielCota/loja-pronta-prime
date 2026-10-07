'use server';

import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { hotmartEvents, hotmartProductMappings, hotmartSettings } from '@/server/db/schema';
import { requireAdmin } from '@/features/admin/server/access';
import { encryptHottok } from './secret';
import { parseHotmartSettings } from '../settings-input';

export type SettingsResult = { message: string; saved: boolean };

export async function saveHotmartSettings(
  _previous: SettingsResult,
  form: FormData,
): Promise<SettingsResult> {
  const session = await requireAdmin('/admin/hotmart');
  const parsed = parseHotmartSettings(form);
  if (!parsed.ok) return { message: parsed.message, saved: false };
  const { token, sllCode: sll, storeCode: store } = parsed.value;
  const previous = await db.query.hotmartSettings.findFirst({
    where: eq(hotmartSettings.id, 'main'),
  });
  if (!previous && !token) return { message: 'Informe o token de verificação.', saved: false };
  const currentMappings = await db.query.hotmartProductMappings.findMany();
  const changedMappings = currentMappings.some(
    (item) => (item.access === 'sll' ? sll : store) !== item.productUcode,
  );
  if (
    changedMappings &&
    (await db.query.hotmartPurchases.findFirst({ columns: { transaction: true } }))
  ) {
    return {
      saved: false,
      message:
        'Já chegaram compras com esses códigos, então eles não podem mudar: isso mexeria no acesso de quem já comprou. Volte aos códigos de antes e salve de novo.',
    };
  }
  await db.transaction(async (tx) => {
    if (token.trim()) {
      await tx
        .insert(hotmartSettings)
        .values({
          id: 'main',
          encryptedHottok: encryptHottok(token.trim()),
          updatedBy: session.user.id,
        })
        .onConflictDoUpdate({
          target: hotmartSettings.id,
          set: {
            encryptedHottok: encryptHottok(token.trim()),
            updatedBy: session.user.id,
            updatedAt: new Date(),
          },
        });
    }
    await tx.delete(hotmartProductMappings);
    await tx
      .insert(hotmartProductMappings)
      .values([
        { productUcode: sll, access: 'sll' },
        { productUcode: store, access: 'loja-pronta' },
      ])
      .onConflictDoNothing();
  });
  revalidatePath('/admin/hotmart');
  return { message: 'Configuração salva. Novos avisos já podem ser recebidos.', saved: true };
}

export async function getHotmartAdminState() {
  await requireAdmin('/admin/hotmart');
  const [settings, mappings, events] = await Promise.all([
    db.query.hotmartSettings.findFirst({
      columns: { id: true, updatedAt: true },
      where: eq(hotmartSettings.id, 'main'),
    }),
    db.query.hotmartProductMappings.findMany(),
    db.query.hotmartEvents.findMany({ orderBy: desc(hotmartEvents.receivedAt), limit: 20 }),
  ]);
  return { configured: Boolean(settings), updatedAt: settings?.updatedAt, mappings, events };
}
