import { and, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from '@/server/db/schema';
import { ASSISTANT_GUIDES } from '../catalog';

const RELEASE = 'sll-tools-2026-10-07';
const RESOURCES = [
  {
    slug: 'simulador-descontos',
    groupKey: 'calculadora',
    groupTitle: 'Calculadoras',
    title: 'Simulador de descontos',
    description: 'Veja quanto sobra depois de oferecer desconto e cupom.',
    buttonLabel: 'Simular desconto',
    destination: '/sll/recursos/simulador-descontos',
    position: 1,
  },
  {
    slug: 'calculadora-anuncios',
    groupKey: 'calculadora',
    groupTitle: 'Calculadoras',
    title: 'Calculadora de anúncios',
    description: 'Calcule quanto pode gastar em anúncios por venda sem perder seu lucro.',
    buttonLabel: 'Calcular anúncios',
    destination: '/sll/recursos/calculadora-anuncios',
    position: 2,
  },
  {
    slug: 'materiais-sll',
    groupKey: 'materiais',
    groupTitle: 'Guias e planilhas',
    title: 'Materiais para sua loja',
    description: 'Guias, planilhas e arquivos das aulas, reunidos em um lugar.',
    buttonLabel: 'Ver materiais',
    destination: '/sll/recursos/materiais',
    position: 0,
  },
];
const CALCULATOR_LINKS: Record<string, string[]> = {
  'calculadora-preco-shopee': ['titulos-descricao-precificacao', 'minha-renda'],
  'simulador-descontos': [
    'desconto',
    'cupons',
    'oferta-relampago-da-loja',
    'campanha-ofertas-oficiais',
  ],
  'calculadora-anuncios': [
    'encontrando-seu-roas-perfeito',
    'como-evitar-o-prejuizo',
    'metricas-dos-anuncios',
    'metricas-dos-anuncios-parte-2',
  ],
};

/** Entrega única e transacional, depois do inventário inicial. Nunca repõe ligações removidas no admin. */
export async function importSllTools(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '30s'");
    await client.query('SELECT pg_advisory_xact_lock(748310072::bigint)');
    const db = drizzle(client, { schema });
    const [release] = await db
      .insert(schema.learningContentImports)
      .values({ key: RELEASE })
      .onConflictDoNothing()
      .returning();
    if (!release) {
      await client.query('COMMIT');
      return { applied: false, resources: 0, links: 0 };
    }
    let resources = 0;
    let links = 0;
    for (const resource of RESOURCES) {
      const created = await db
        .insert(schema.learningResources)
        .values({ ...resource, status: 'published' })
        .onConflictDoNothing()
        .returning();
      resources += created.length;
    }
    const lessons = await db.query.learningLessons.findMany({
      where: and(
        eq(schema.learningLessons.status, 'published'),
        isNull(schema.learningLessons.archivedAt),
      ),
      with: { module: { with: { stage: { with: { track: true } } } } },
    });
    const published = lessons.filter((lesson) =>
      [lesson.module, lesson.module.stage, lesson.module.stage.track].every(
        (node) => node.status === 'published' && node.archivedAt === null,
      ),
    );
    const resourceSlugs = [
      'calculadora-preco-shopee',
      ...RESOURCES.map((item) => item.slug),
      ...Object.keys(ASSISTANT_GUIDES),
    ];
    for (const slug of resourceSlugs) {
      const resource = await db.query.learningResources.findFirst({
        where: and(
          eq(schema.learningResources.slug, slug),
          eq(schema.learningResources.status, 'published'),
          isNull(schema.learningResources.archivedAt),
        ),
      });
      if (!resource) continue;
      const draft = await db.query.learningNodeDrafts.findFirst({
        where: and(
          eq(schema.learningNodeDrafts.kind, 'resource'),
          eq(schema.learningNodeDrafts.nodeId, resource.id),
        ),
      });
      const history = await db.query.learningNodeHistory.findFirst({
        where: and(
          eq(schema.learningNodeHistory.kind, 'resource'),
          eq(schema.learningNodeHistory.nodeId, resource.id),
        ),
      });
      if (draft || history) continue;
      const existing = await db.query.learningResourceLessons.findMany({
        where: eq(schema.learningResourceLessons.resourceId, resource.id),
      });
      const selectedSlugs = CALCULATOR_LINKS[slug] ?? ASSISTANT_GUIDES[slug]?.lessonSlugs ?? [];
      const related =
        slug === 'mentora-pri'
          ? published
          : published.filter((lesson) => selectedSlugs.includes(lesson.slug));
      const missing = related.filter(
        (lesson) => !existing.some((link) => link.lessonId === lesson.id),
      );
      const activateCalculator =
        slug === 'calculadora-preco-shopee' && resource.destination === null;
      if (!missing.length && !activateCalculator) continue;
      // O admin pode voltar ao conteúdo anterior, inclusive às ligações anteriores à entrega.
      await db.insert(schema.learningNodeHistory).values({
        kind: 'resource',
        nodeId: resource.id,
        data: {
          groupTitle: resource.groupTitle,
          title: resource.title,
          description: resource.description,
          buttonLabel: resource.buttonLabel,
          destination: resource.destination,
          relatedLessonIds: existing.map((link) => link.lessonId),
        },
      });
      if (activateCalculator)
        await db
          .update(schema.learningResources)
          .set({ groupTitle: 'Calculadoras', destination: '/sll/recursos/calculadora-shopee' })
          .where(eq(schema.learningResources.id, resource.id));
      for (const lesson of missing) {
        await db
          .insert(schema.learningResourceLessons)
          .values({ resourceId: resource.id, lessonId: lesson.id });
        links++;
      }
    }
    await client.query('COMMIT');
    return { applied: true, resources, links };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
