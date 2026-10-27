import { db } from '@/server/db';
import { storage } from '@/server/storage';
import { assertAssistantAccess } from '@/features/assistant/server/metrics';
import { readShopeeAccess } from '@/features/shopee/server/connection';
import { claimRecoveredPublication } from './publication-data';
import { executeRecoveredPublication } from './publication-worker';

export const recoveredPublicationEnabled = () =>
  process.env.SHOPEE_RECOVERED_PUBLICATION_ENABLED === 'true';
export async function processRecoveredPublication() {
  if (!recoveredPublicationEnabled()) return false;
  const row = await claimRecoveredPublication(db.$client);
  if (!row) return false;
  await executeRecoveredPublication(db.$client, row, {
    enabled: recoveredPublicationEnabled,
    assertAccess: (userId) => assertAssistantAccess(userId, 'loja-pronta'),
    readAccess: readShopeeAccess,
    readImage: (key) => storage().get(key),
  });
  return true;
}
