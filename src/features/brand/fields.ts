import { BRAND_DESCRIPTION_MAX, BRAND_NAME_MAX } from '@/config/brand';

type Parsed = { ok: true; value: string } | { ok: false; error: string };

/** Letras (com acento), números, espaço e a pontuação comum de nome de loja. */
const NAME_CHARACTERS = /^[\p{L}\p{N} &'’.\-!]+$/u;

/** Nome da loja: sem espaços sobrando, dentro do limite da Shopee e só com o que o logo desenha. */
export function parseBrandName(input: unknown): Parsed {
  const value = String(input ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!value) return { ok: false, error: 'Escreva o nome da loja.' };
  if (value.length > BRAND_NAME_MAX) {
    return {
      ok: false,
      error: `Use até ${BRAND_NAME_MAX} letras. Esse nome tem ${value.length}.`,
    };
  }
  if (!NAME_CHARACTERS.test(value)) {
    return { ok: false, error: 'Use só letras, números e espaço (pode usar & e hífen).' };
  }
  return { ok: true, value };
}

/** Descrição: texto livre, sem espaços sobrando nas pontas, dentro do limite da Shopee. */
export function parseBrandDescription(input: unknown): Parsed {
  const value = String(input ?? '').trim();
  if (!value) return { ok: false, error: 'Escolha um dos textos ou escreva o seu.' };
  if (value.length > BRAND_DESCRIPTION_MAX) {
    return {
      ok: false,
      error: `Use até ${BRAND_DESCRIPTION_MAX} letras. Esse texto tem ${value.length}.`,
    };
  }
  return { ok: true, value };
}
