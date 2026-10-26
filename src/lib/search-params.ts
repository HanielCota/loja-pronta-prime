export type SearchParams = Record<string, string | string[] | undefined>;

export function getParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Última página aceita em qualquer lista. Com 50 itens por página são 5 milhões de linhas: bem
 * acima do que existe, e o deslocamento (página × tamanho) fica longe do limite do Postgres.
 */
export const MAX_PAGE = 100_000;

/**
 * A página pedida na URL, sempre um inteiro entre 1 e MAX_PAGE. Texto, zero, negativo ou fração
 * viram a primeira página; um número gigante para na última aceita. Sem isso, "pagina=1e20"
 * passava um deslocamento fora da faixa do bigint e a consulta quebrava a tela.
 */
export function parsePageNumber(value: string | string[] | undefined): number {
  const raw = getParam(value)?.trim() ?? '';
  if (!/^\d+$/.test(raw)) return 1;
  const page = Number(raw);
  if (page < 1) return 1;
  return Math.min(page, MAX_PAGE);
}
