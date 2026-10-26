import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { storeBrand, storeOnboarding, stores } from '@/server/db/schema';
import { getShopeeConfiguration } from '@/features/shopee/server/client';
import { getShopeeStatus } from '@/features/shopee/server/connection';
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
  const overview = await getSllStoreOverview(user.id, canAccessLojaPronta);
  const config = getShopeeConfiguration();
  let connected = false;
  let connectionFailed = false;
  try {
    if (config && canUseShopee(config, user.id, user.role)) {
      connected = (await getShopeeStatus(user.id, config)).connected;
    }
  } catch {
    connectionFailed = true;
  }
  return {
    assembly: overview.assembly,
    connected,
    failed: overview.connected.status === 'failure' || connectionFailed,
  };
}
