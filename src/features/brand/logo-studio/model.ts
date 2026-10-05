import { z } from 'zod';
import {
  LOGO_BACKGROUND_IDS,
  LOGO_KIND_IDS,
  LOGO_LETTERING_IDS,
  LOGO_LOOK_IDS,
  LOGO_PALETTE_IDS,
  LOGO_SYMBOL_IDS,
} from './options';

/**
 * O estúdio do logo: os tipos e os limites. As escolhas e os logos ficam guardados (ela sai e
 * volta de onde parou); os limites seguram o custo.
 */

/** Logos que ela pode gerar (cada um custa): o bastante pra escolher, sem gasto sem fim. */
export const MAX_GENERATIONS = 4;
/** Logos que ela pode mandar (não custam IA, mas ocupam espaço): segura abuso. */
export const MAX_UPLOADS = 10;
/** O logo que ela manda: até 5 MB (a tela já reduz pra 1024px antes de mandar). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** O que ela escreve "do seu jeito" (um desenho, as cores, a letra). */
export const MAX_OWN_TEXT = 120;

/** Texto curto que vai pra imagem: sem quebra de linha, sem aspas, sem espaço sobrando. */
const short = (max: number) =>
  z
    .string()
    .transform((value) =>
      value
        .replace(/[\r\n"“”`<>]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max),
    )
    .pipe(z.string().min(1));

/**
 * O resumo do logo, montado com as escolhas dela: o que vai pra imagem. Em português.
 * `look`: ilustração (o padrão, lê bem pequeno) ou realista (com volume, 3D).
 */
export const logoBriefSchema = z.object({
  symbol: short(MAX_OWN_TEXT),
  colors: short(MAX_OWN_TEXT),
  lettering: short(MAX_OWN_TEXT),
  mood: short(120),
  background: short(160),
  look: z.enum(['ilustracao', 'realista']).catch('ilustracao'),
  extras: short(200).optional().catch(undefined),
  /** Ajustes de um toque que continuam valendo (ver tweaks.ts). Só o sistema põe. */
  tweaks: z
    .array(z.enum(['mais-colorido', 'letra-maior', 'mais-simples']))
    .max(3)
    .optional()
    .catch(undefined),
});
export type LogoBrief = z.infer<typeof logoBriefSchema>;

const enumOf = <T extends string>(ids: readonly T[]) => z.enum(ids as [T, ...T[]]);

/** Uma escolha da lista (`id`) ou o que ela escreveu (`text`). */
const choice = <T extends string>(ids: readonly T[]) =>
  z.union([z.object({ id: enumOf(ids) }), z.object({ text: short(MAX_OWN_TEXT) })]);

/**
 * As escolhas dela, uma por tela. Cada uma pode faltar (ainda não escolheu); uma escolha que não
 * vale mais (um desenho que saiu da lista) volta a faltar, em vez de travar a tela.
 */
export const logoPicksSchema = z.object({
  kind: enumOf(LOGO_KIND_IDS).optional().catch(undefined),
  symbol: choice(LOGO_SYMBOL_IDS).optional().catch(undefined),
  colors: choice(LOGO_PALETTE_IDS).optional().catch(undefined),
  lettering: choice(LOGO_LETTERING_IDS).optional().catch(undefined),
  background: enumOf(LOGO_BACKGROUND_IDS).optional().catch(undefined),
  look: enumOf(LOGO_LOOK_IDS).optional().catch(undefined),
});
export type LogoPicks = z.infer<typeof logoPicksSchema>;

/**
 * Um logo guardado: a chave da imagem; `uploaded`, se foi ela que mandou; `brief`, o resumo com
 * que a IA desenhou (os ajustes de um toque partem dele).
 */
export const studioLogoSchema = z.object({
  key: z.string().min(1).max(200),
  uploaded: z.literal(true).optional(),
  brief: logoBriefSchema.optional().catch(undefined),
});
export type StudioLogo = z.infer<typeof studioLogoSchema>;

/** O estúdio de uma aluna, como fica no banco. */
export type LogoStudio = {
  picks: LogoPicks;
  logos: StudioLogo[];
  /** Quantos logos ela já gerou (nunca volta: segura o custo). */
  generations: number;
};

export const EMPTY_STUDIO: LogoStudio = { picks: {}, logos: [], generations: 0 };
