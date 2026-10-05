import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/server/db';
import { logoStudio } from '@/server/db/schema';
import {
  EMPTY_STUDIO,
  logoPicksSchema,
  studioLogoSchema,
  type LogoPicks,
  type LogoStudio,
  type StudioLogo,
} from '../model';

/**
 * O estúdio do logo no banco: ler, guardar as escolhas, acrescentar logos e reservar o que custa.
 * Só guarda e devolve; quem decide o que muda é quem chama (as actions).
 *
 * Logos novos entram sempre no fim da lista guardada (nunca regravando a lista lida antes): duas
 * abas ao mesmo tempo, ou uma criação de 15 segundos, não apagam nada uma da outra. Cada operação
 * é uma instrução só (insere a linha se ainda não existe).
 */

const logosSchema = z.array(studioLogoSchema.nullable().catch(null)).catch([]);

type StudioRow = { picks: unknown; logos: unknown; generations: number };

const STUDIO_COLUMNS = {
  picks: logoStudio.picks,
  logos: logoStudio.logos,
  generations: logoStudio.generations,
};

function toStudio(row: StudioRow | undefined): LogoStudio {
  if (!row) return EMPTY_STUDIO;
  const picks = logoPicksSchema.safeParse(row.picks);
  return {
    picks: picks.success ? picks.data : {},
    logos: logosSchema.parse(row.logos).filter((logo) => logo !== null),
    generations: row.generations,
  };
}

export async function getLogoStudio(userId: string): Promise<LogoStudio> {
  const [row] = await db
    .select(STUDIO_COLUMNS)
    .from(logoStudio)
    .where(eq(logoStudio.userId, userId));
  return toStudio(row);
}

/** Guarda as escolhas (todas de uma vez: são só dela, e a tela manda sempre o conjunto inteiro). */
export async function saveLogoPicks(userId: string, picks: LogoPicks): Promise<LogoStudio> {
  const [row] = await db
    .insert(logoStudio)
    .values({ userId, picks })
    .onConflictDoUpdate({ target: logoStudio.userId, set: { picks } })
    .returning(STUDIO_COLUMNS);
  return toStudio(row);
}

/** Acrescenta um logo no fim da lista guardada e devolve o estúdio como ficou. */
export async function addLogo(userId: string, logo: StudioLogo): Promise<LogoStudio> {
  const [row] = await db
    .insert(logoStudio)
    .values({ userId, logos: [logo] })
    .onConflictDoUpdate({
      target: logoStudio.userId,
      set: { logos: sql`${logoStudio.logos} || ${JSON.stringify([logo])}::jsonb` },
    })
    .returning(STUDIO_COLUMNS);
  return toStudio(row);
}

/**
 * Reserva uma unidade de `column` (logos criados ou mandados) antes de gastar, numa só instrução:
 * cliques ao mesmo tempo não passam do limite. Devolve se conseguiu.
 */
async function reserve(column: 'generations' | 'uploads', userId: string, max: number) {
  const target = logoStudio[column];
  const reserved = await db
    .insert(logoStudio)
    .values({ userId, [column]: 1 })
    .onConflictDoUpdate({
      target: logoStudio.userId,
      set: { [column]: sql`${target} + 1` },
      setWhere: sql`${target} < ${max}`,
    })
    .returning({ userId: logoStudio.userId });
  return reserved.length > 0;
}

/** Um logo criado pela IA (o limite vale pra sempre). */
export function reserveGeneration(userId: string, max: number): Promise<boolean> {
  return reserve('generations', userId, max);
}

/** Um logo mandado por ela (o limite vale pra sempre). */
export function reserveUpload(userId: string, max: number): Promise<boolean> {
  return reserve('uploads', userId, max);
}

/** Devolve a vaga quando a imagem não chegou a ser guardada no bucket. */
export async function releaseUpload(userId: string) {
  await db
    .update(logoStudio)
    .set({ uploads: sql`greatest(${logoStudio.uploads} - 1, 0)` })
    .where(eq(logoStudio.userId, userId));
}

/** Devolve o logo reservado quando a IA não desenhou nada (ela não pagou por nada). */
export async function releaseGeneration(userId: string) {
  await db
    .update(logoStudio)
    .set({ generations: sql`greatest(${logoStudio.generations} - 1, 0)` })
    .where(eq(logoStudio.userId, userId));
}
