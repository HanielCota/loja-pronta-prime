/** Numeração exibida nas páginas antigas da Biblioteca de Conhecimento. */
export const SLL_LIBRARY_SOURCE_NUMBERS: Record<string, number> = {
  'o-que-e-um-marketplace': 18,
  'por-que-a-shopee': 19,
  'como-gerar-etiqueta': 20,
  desconto: 27,
  'oferta-relampago-da-loja': 28,
  cupons: 29,
  'campanha-ofertas-oficiais': 30,
  'duplicando-anuncios-do-jeito-certo': 31,
  'teste-de-categoria': 32,
  'videos-shopee-videos': 33,
  'primeiras-avaliacoes': 34,
  'chat-de-ouro-avaliacoes-reputacao': 35,
  'minha-renda': 36,
  'saldo-da-carteira': 38,
  'informacoes-gerenciais': 39,
  'desempenho-da-conta': 40,
  'decoracao-da-loja': 42,
  'configuracoes-da-loja': 43,
  'gestao-de-contestacao': 44,
};

export function sllLibrarySourceNumber(slug: string): number | null {
  return SLL_LIBRARY_SOURCE_NUMBERS[slug] ?? null;
}
