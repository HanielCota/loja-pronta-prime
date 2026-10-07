export type SllExpectedMaterial = {
  sourceNumber: number;
  fileName: string;
  title: string;
  formatLabel: string;
};

/**
 * Materiais citados no inventário da área antiga. A lista só explica uma ausência:
 * não cria link, bloco de conteúdo ou arquivo substituto sem uma fonte válida.
 */
export const SLL_EXPECTED_MATERIALS: readonly SllExpectedMaterial[] = [
  {
    sourceNumber: 20,
    fileName: 'pontos-coleta-shopee-express.pdf',
    title: 'Pontos de coleta Shopee Express — como achar',
    formatLabel: 'PDF',
  },
  {
    sourceNumber: 30,
    fileName: 'calendario-shopee-br-2026.pdf',
    title: 'Calendário Shopee BR 2026',
    formatLabel: 'PDF',
  },
  {
    sourceNumber: 33,
    fileName: 'template-video-3-atos.zip',
    title: 'Roteiro de vídeo em 3 atos (CapCut template)',
    formatLabel: 'ZIP',
  },
  {
    sourceNumber: 34,
    fileName: 'cartao-agradecimento-imprimir.pdf',
    title: 'Cartão de agradecimento — 3 modelos imprimíveis',
    formatLabel: 'PDF',
  },
  {
    sourceNumber: 35,
    fileName: 'scripts-chat-shopee-5-cenarios.pdf',
    title: 'Scripts de resposta — 5 cenários do chat Shopee',
    formatLabel: 'PDF',
  },
  {
    sourceNumber: 39,
    fileName: 'kpis-shopee-como-interpretar.pdf',
    title: 'KPIs Shopee — o que olhar e como interpretar',
    formatLabel: 'PDF',
  },
  {
    sourceNumber: 40,
    fileName: 'dashboard-pessoal-msl.xlsx',
    title: 'Dashboard pessoal — checklist diário, semanal e mensal',
    formatLabel: 'XLSX',
  },
  {
    sourceNumber: 42,
    fileName: 'specs-decoracao-loja-2026.pdf',
    title: 'Specs Shopee — banners internos e coleções (2026)',
    formatLabel: 'PDF',
  },
  {
    sourceNumber: 44,
    fileName: 'templates-contestacao.pdf',
    title: 'Templates de resposta a contestação — 4 cenários',
    formatLabel: 'PDF',
  },
];

export function getSllExpectedMaterial(sourceNumber: number | null | undefined) {
  return SLL_EXPECTED_MATERIALS.find((item) => item.sourceNumber === sourceNumber) ?? null;
}
