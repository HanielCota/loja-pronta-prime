import { sql } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  learningBanners,
  learningContentBlocks,
  learningNodeDrafts,
  learningNodeHistory,
  learningTracks,
} from '@/server/db/schema';
import { storage } from '@/server/storage';

/**
 * Confere se alguma versão ainda usa o arquivo: a publicada, o rascunho ou a versão anterior
 * guardada para "Voltar à versão anterior". Rascunho e versão anterior são JSON livres, então a
 * busca é pelo texto da chave (que leva um UUID e não se repete por acaso).
 */
export async function isStorageKeyInUse(key: string): Promise<boolean> {
  const result = await db.execute<{ used: boolean }>(sql`
    select (
      exists (select 1 from ${learningTracks} where ${learningTracks.coverStorageKey} = ${key})
      or exists (select 1 from ${learningBanners} where ${learningBanners.imageStorageKey} = ${key})
      or exists (
        select 1 from ${learningContentBlocks} where ${learningContentBlocks.data} ->> 'storageKey' = ${key}
      )
      or exists (
        select 1 from ${learningNodeDrafts} where strpos(${learningNodeDrafts.data}::text, ${key}) > 0
      )
      or exists (
        select 1 from ${learningNodeHistory} where strpos(${learningNodeHistory.data}::text, ${key}) > 0
      )
    ) as used
  `);
  return result.rows[0]?.used !== false;
}

/**
 * Apaga do bucket um arquivo que saiu de uso. Se a versão anterior ou o rascunho ainda apontam
 * para ele, fica: apagar quebraria a imagem ou o material ao voltar à versão anterior.
 * Chame depois de gravar a mudança no banco. Falhas só vão para o log: o arquivo sobra, mas a
 * ação da administradora já deu certo.
 */
export async function removeStorageKeyIfUnused(key: string | null | undefined, context: string) {
  if (!key) return;
  try {
    if (await isStorageKeyInUse(key)) return;
    await storage().remove(key);
  } catch (error) {
    console.error(
      `[${context}] arquivo antigo não removido: ${error instanceof Error ? error.name : 'erro'}`,
    );
  }
}
