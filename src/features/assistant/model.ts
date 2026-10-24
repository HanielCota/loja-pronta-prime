import { z } from 'zod';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const INITIAL_PRODUCTS = 5;
export const OBSERVATION_DAYS = 5;
export const STRATEGIES = ['organic', 'hybrid', 'paid'] as const;
export type Strategy = (typeof STRATEGIES)[number];
export const STRATEGY_LABELS: Record<Strategy, string> = {
  organic: 'Orgânico',
  hybrid: 'Híbrido',
  paid: 'Pago',
};

export const planActionSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/),
  day: z.number().int().min(1).max(7),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(3000),
  lessonId: z.uuid().nullable().default(null),
});
export const playbookSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    strategy: z.enum(STRATEGIES),
    actions: z.array(planActionSchema).min(7).max(70),
  })
  .superRefine((value, ctx) => {
    const ids = new Set<string>();
    for (const action of value.actions) {
      if (ids.has(action.id))
        ctx.addIssue({
          code: 'custom',
          path: ['actions'],
          message: 'Cada ação precisa de um identificador diferente.',
        });
      ids.add(action.id);
    }
    if (new Set(value.actions.map((action) => action.day)).size !== 7)
      ctx.addIssue({
        code: 'custom',
        path: ['actions'],
        message: 'Inclua ações para os sete dias.',
      });
  });
export type PlanAction = z.infer<typeof planActionSchema>;
export type Playbook = z.infer<typeof playbookSchema>;

export const planContextSchema = z.object({
  storeAge: z.enum(['under_7_days', 'exactly_7_days', 'over_7_days']),
  strategy: z.enum(STRATEGIES),
});

/** O sétimo dia entra no caminho com histórico; a resposta antiga continua preservada. */
export function planNeedsHistory(age: z.infer<typeof planContextSchema>['storeAge']) {
  return age !== 'under_7_days';
}

export type MetricValues = {
  views: number | null;
  impressions: number | null;
  clicks: number | null;
  sales: number | null;
};
export type MetricObservation = MetricValues & {
  itemId: number;
  categoryId: number | null;
  title: string;
  collectedAt: string;
};
export type MetricWindow = MetricValues & {
  itemId: number;
  categoryId: number | null;
  start: string;
  end: string;
};

/** Queda de um contador significa reinício/correção; não equivale a zero atividade. */
export function counterDifference(before: number | null, after: number | null) {
  if (
    before === null ||
    after === null ||
    !Number.isSafeInteger(before) ||
    !Number.isSafeInteger(after) ||
    before < 0 ||
    after < before
  )
    return null;
  return after - before;
}

export function observationWindow(
  before: MetricObservation,
  after: MetricObservation,
): MetricWindow | null {
  if (
    before.itemId !== after.itemId ||
    before.categoryId !== after.categoryId ||
    !Number.isFinite(Date.parse(before.collectedAt)) ||
    !Number.isFinite(Date.parse(after.collectedAt)) ||
    Date.parse(after.collectedAt) <= Date.parse(before.collectedAt)
  )
    return null;
  return {
    itemId: after.itemId,
    categoryId: after.categoryId,
    start: before.collectedAt,
    end: after.collectedAt,
    views: counterDifference(before.views, after.views),
    impressions: counterDifference(before.impressions, after.impressions),
    clicks: counterDifference(before.clicks, after.clicks),
    sales: counterDifference(before.sales, after.sales),
  };
}

/** Uma queda ou ausência intermediária invalida a diferença daquele contador. */
export function observationSeries(series: (MetricObservation | undefined)[]): MetricWindow | null {
  if (series.length < 2 || series.some((row) => !row)) return null;
  const rows = series as MetricObservation[];
  const window = observationWindow(rows[0]!, rows.at(-1)!);
  if (!window || rows.some((row, index) => index > 0 && !observationWindow(rows[index - 1]!, row)))
    return null;
  for (const key of ['views', 'impressions', 'clicks', 'sales'] as const) {
    if (
      rows.some(
        (row, index) => index > 0 && counterDifference(rows[index - 1]![key], row[key]) === null,
      )
    )
      window[key] = null;
  }
  return window;
}

/** CTR usa impressões do mesmo intervalo, nunca visualizações da página como substituto. */
export function clickThroughRate(values: MetricValues) {
  if (
    values.clicks === null ||
    values.impressions === null ||
    values.impressions <= 0 ||
    values.clicks < 0 ||
    values.clicks > values.impressions
  )
    return null;
  return values.clicks / values.impressions;
}

export function compareCategories(left: MetricWindow, right: MetricWindow, minViews = 100) {
  if (
    left.itemId === right.itemId ||
    !left.categoryId ||
    !right.categoryId ||
    left.categoryId === right.categoryId
  )
    return {
      status: 'invalid' as const,
      message: 'Escolha dois anúncios de categorias diferentes.',
    };
  if (
    left.start !== right.start ||
    left.end !== right.end ||
    !Number.isFinite(Date.parse(left.start)) ||
    Date.parse(left.end) <= Date.parse(left.start)
  )
    return {
      status: 'incomparable' as const,
      message: 'Os dois anúncios precisam do mesmo período de observação.',
    };
  if (!Number.isSafeInteger(minViews) || minViews < 1)
    throw new Error('Exposição mínima inválida.');
  if (
    left.views === null ||
    right.views === null ||
    left.views < minViews ||
    right.views < minViews
  )
    return {
      status: 'insufficient' as const,
      message: `A comparação precisa de pelo menos ${minViews} visualizações válidas por anúncio no período.`,
    };
  return {
    status: 'compared' as const,
    preferredItemId:
      left.views === right.views ? null : left.views > right.views ? left.itemId : right.itemId,
    message:
      left.views === right.views
        ? 'Os anúncios tiveram a mesma quantidade de visualizações.'
        : 'Um anúncio recebeu mais visualizações neste período. Isso não demonstra que a categoria, sozinha, causou o resultado.',
    leftCtr: clickThroughRate(left),
    rightCtr: clickThroughRate(right),
  };
}

export function batchObservationState(publishedAt: Date | null, now: Date = new Date()) {
  if (!Number.isFinite(now.getTime())) throw new Error('Data inválida.');
  if (!publishedAt) return { status: 'publishing' as const, readyAt: null };
  if (!Number.isFinite(publishedAt.getTime()) || publishedAt > now)
    return { status: 'invalid' as const, readyAt: null };
  const readyAt = new Date(publishedAt.getTime() + OBSERVATION_DAYS * DAY_MS);
  return { status: now >= readyAt ? ('ready' as const) : ('observing' as const), readyAt };
}

export function validateInitialSelection(keys: string[]) {
  return (
    keys.length === INITIAL_PRODUCTS &&
    new Set(keys).size === INITIAL_PRODUCTS &&
    keys.every((key) => key.length > 0)
  );
}

/**
 * Id da Shopee (anúncio, categoria, loja): inteiro positivo que o JavaScript guarda sem perder
 * dígitos. Acima de 2^53 o JSON.parse arredonda e a comparação com o id pedido erra em silêncio.
 */
export const shopeeIdSchema = z.number().int().positive().safe();

/** Anúncios simples já precisam chegar com imagens, categoria e logística reais conferidas. */
export const publicationPayloadSchema = z.object({
  item_name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(5000),
  category_id: z.number().int().positive().safe(),
  item_sku: z.string().trim().min(1).max(100),
  original_price: z.number().positive().max(1_000_000),
  normal_stock: z.number().int().min(1).max(1_000_000),
  weight: z.number().positive().max(1000),
  condition: z.literal('NEW'),
  item_status: z.literal('NORMAL'),
  image: z.object({ image_id_list: z.array(z.string().min(1).max(200)).min(1).max(9) }),
  dimension: z.object({
    package_length: z.number().positive(),
    package_width: z.number().positive(),
    package_height: z.number().positive(),
  }),
  logistic_info: z
    .array(
      z.object({
        logistic_id: z.number().int().positive().safe(),
        enabled: z.literal(true),
        is_free: z.boolean(),
      }),
    )
    .min(1)
    .max(20),
  attribute_list: z
    .array(
      z.object({
        attribute_id: z.number().int().positive().safe(),
        attribute_value_list: z
          .array(
            z.object({
              value_id: z.number().int().min(0).safe(),
              original_value_name: z.string().max(500),
            }),
          )
          .min(1),
      }),
    )
    .max(100)
    .default([]),
  brand: z.object({
    brand_id: z.number().int().min(0).safe(),
    original_brand_name: z.string().max(200),
  }),
  sourceImages: z.array(z.url()).max(9).optional(),
  variations: z
    .object({
      tier_variation: z
        .array(
          z.object({
            name: z.string().min(1).max(14),
            option_list: z
              .array(z.object({ option: z.string().min(1).max(20) }))
              .min(1)
              .max(50),
          }),
        )
        .min(1)
        .max(2),
      model: z
        .array(
          z.object({
            tier_index: z.array(z.number().int().nonnegative()).min(1).max(2),
            model_sku: z.string().min(1).max(100),
            original_price: z.number().positive().max(1_000_000),
            normal_stock: z.number().int().nonnegative().max(1_000_000),
          }),
        )
        .min(1)
        .max(100),
    })
    .optional(),
});
export type PublicationPayload = z.infer<typeof publicationPayloadSchema>;
export type BatchAnalysis = {
  status: 'insufficient' | 'ready';
  message: string;
  items: { itemId: number; views: number | null; categoryId: number | null }[];
  preferredCategoryId: number | null;
  runIds: string[];
};

/** Sugestões editoriais iniciais; só a publicação no painel as libera às alunas. */
export function starterPlaybooks(): Playbook[] {
  const common = [
    'Confira sua loja e a conexão',
    'Defina seu objetivo e os limites',
    'Prepare os produtos que vai divulgar',
  ];
  const descriptions = [
    'Abra Minhas lojas, confira o cadastro de vendedora e conecte a sua loja. Verifique se a conexão foi concluída. Complete nome, foto e descrição do perfil antes de divulgar.',
    'Defina um objetivo observável para a semana, reserve tempo diário e registre o limite de investimento. Anote as visualizações e vendas disponíveis com a data da consulta; ausência de dados não significa zero.',
    'Escolha os produtos que vai divulgar e confira estoque, preço, fotos, descrição, categoria e entrega. Na Loja Pronta, confirme somente cinco produtos no primeiro lote. Não amplie esse lote antes da observação de cinco dias.',
  ];
  const paths: Record<Strategy, [string, string][]> = {
    organic: [
      [
        'Prepare um vídeo',
        'Assista à aula de vídeos vinculada. Grave uma demonstração, destaque o benefício e mostre o uso real do produto. Use materiais autorizados e uma ferramenta gratuita; confira os fatos antes de publicar conteúdo feito com IA.',
      ],
      [
        'Publique no Shopee Vídeos',
        'Revise as regras de conteúdo e publique o vídeo vinculando o produto correto. Registre o anúncio e o horário da publicação para acompanhar os dados depois.',
      ],
      [
        'Organize o Instagram da loja',
        'Complete o perfil da loja e publique uma versão do conteúdo adequada ao Instagram. Confira o link da loja e responda às dúvidas. Registre o conteúdo publicado.',
      ],
      [
        'Revise o que aconteceu',
        'Compare somente períodos compatíveis e confira as visualizações e vendas disponíveis. Se faltarem dados, mantenha a observação. Registre uma prioridade para a próxima semana, sem tratar coincidência como causa.',
      ],
    ],
    hybrid: [
      ['Prepare conteúdo para a loja', 'Organize um vídeo para Shopee Vídeos e Instagram.'],
      [
        'Planeje uma divulgação paga',
        'Defina um limite de investimento antes de configurar a divulgação.',
      ],
      ['Execute as duas frentes', 'Publique o conteúdo e acompanhe separadamente a parte paga.'],
      ['Revise o que aconteceu', 'Compare resultados e gastos e registre o próximo ajuste.'],
    ],
    paid: [
      [
        'Prepare o criativo',
        'Defina o vídeo ou conteúdo de UGC. Confira custo e autorização de uso antes de contratar.',
      ],
      [
        'Configure o Shopee Ads',
        'Confira orçamento e produtos antes de ativar uma campanha na Shopee.',
      ],
      ['Acompanhe o investimento', 'Confira os gastos e os resultados na conta de anúncios.'],
      ['Revise o que aconteceu', 'Avalie os dados disponíveis antes de aumentar o investimento.'],
    ],
  };
  return STRATEGIES.map((strategy) => ({
    strategy,
    title: `Plano de sete dias · ${STRATEGY_LABELS[strategy]}`,
    actions: [
      ...common.map((title, index) => ({
        id: `dia-${index + 1}`,
        day: index + 1,
        title,
        description: descriptions[index]!,
        lessonId: null,
      })),
      ...paths[strategy].map(([title, description], index) => ({
        id: `dia-${index + 4}`,
        day: index + 4,
        title,
        description,
        lessonId: null,
      })),
    ],
  }));
}
