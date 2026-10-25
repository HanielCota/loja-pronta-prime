import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { storeBrand, storeOnboarding, stores } from '@/server/db/schema';
import { getShopeeConfiguration } from '@/features/shopee/server/client';
import { hasShopeeConnection } from '@/features/shopee/server/connection';
import { canUseShopee } from '@/features/shopee/authorization';
import {
  buildSllStoreOverview,
  failedSllStoreOverview,
  type SllStoreSummary,
} from '../store-overview';

/** Lê somente os registros da própria aluna usados para separar montagem e conexão. */
export async function getSllStoreOverview(userId: string, canAccessLojaPronta: boolean) {
  if (!canAccessLojaPronta) {
    return buildSllStoreOverview(
      {
        storeExists: false,
        onboardingExists: false,
        onboardingCompleted: false,
        brandExists: false,
        brandName: null,
        phase: 1,
      },
      false,
    );
  }

  try {
    const [store, onboarding, brand] = await Promise.all([
      db.select({ phase: stores.phase }).from(stores).where(eq(stores.userId, userId)),
      db
        .select({ completedAt: storeOnboarding.completedAt })
        .from(storeOnboarding)
        .where(eq(storeOnboarding.userId, userId)),
      db.select({ name: storeBrand.name }).from(storeBrand).where(eq(storeBrand.userId, userId)),
    ]);

    return buildSllStoreOverview(
      {
        storeExists: Boolean(store[0]),
        onboardingExists: Boolean(onboarding[0]),
        onboardingCompleted: Boolean(onboarding[0]?.completedAt),
        brandExists: Boolean(brand[0]),
        brandName: brand[0]?.name ?? null,
        phase: store[0]?.phase ?? 1,
      },
      true,
    );
  } catch {
    // Falha de banco não pode virar "nenhuma loja": são estados diferentes para a aluna.
    return failedSllStoreOverview();
  }
}

/** Montagem e conexão numa leitura só, pro painel e pra Minhas Lojas mostrarem o mesmo estado. */
export async function getSllStoreSummary(
  user: { id: string; role?: string | null | undefined },
  canAccessLojaPronta: boolean,
): Promise<SllStoreSummary> {
  const [overview, connection] = await Promise.all([
    getSllStoreOverview(user.id, canAccessLojaPronta),
    readConnection(user),
  ]);
  return {
    assembly: overview.assembly,
    connected: connection.connected,
    failed: overview.connected.status === 'failure' || connection.failed,
  };
}

/** Falha de leitura vira "não deu pra conferir", nunca "não conectada". */
async function readConnection(user: { id: string; role?: string | null | undefined }) {
  const config = getShopeeConfiguration();
  if (!config || !canUseShopee(config, user.id, user.role)) {
    return { connected: false, failed: false };
  }
  try {
    return { connected: await hasShopeeConnection(user.id, config), failed: false };
  } catch {
    console.error('[sll] falha ao ler a conexão com a Shopee');
    return { connected: false, failed: true };
  }
}
