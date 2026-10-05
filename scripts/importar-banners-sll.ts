/** Importa os textos e destinos verificados dos dois banners, sem inventar as imagens ausentes. */
import { and, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  learningBanners,
  learningLessons,
  learningModules,
  learningStages,
  learningTracks,
} from '@/server/db/schema';

const mentoraUrl =
  'https://chatgpt.com/g/g-6a21eb8f921c819192b57ce24cd11c63-sll-mentora-pri-sua-pri-24-7';

if (process.env.NODE_ENV === 'production')
  throw new Error('Importação permitida apenas no desenvolvimento.');

const [track] = await db
  .select({ id: learningTracks.id })
  .from(learningTracks)
  .where(eq(learningTracks.slug, 'metodo-sll'))
  .limit(1);
if (!track) throw new Error('Importe primeiro o Método SLL.');
const [stage] = await db
  .select({ id: learningStages.id })
  .from(learningStages)
  .where(and(eq(learningStages.trackId, track.id), eq(learningStages.slug, 'etapa-1')))
  .limit(1);
const [module] = stage
  ? await db
      .select({ id: learningModules.id })
      .from(learningModules)
      .where(and(eq(learningModules.stageId, stage.id), eq(learningModules.slug, 'passo-3')))
      .limit(1)
  : [];
const [lesson] = module
  ? await db
      .select({ id: learningLessons.id })
      .from(learningLessons)
      .where(
        and(
          eq(learningLessons.moduleId, module.id),
          eq(learningLessons.slug, 'anuncios-automaticos-fotos'),
        ),
      )
      .limit(1)
  : [];
if (!lesson) throw new Error('Não foi possível localizar a aula vinculada ao banner.');

const banners = [
  {
    slug: 'nova-aula-anuncios',
    label: 'Nova aula',
    title: 'Crie seus anúncios em poucos cliques',
    description:
      'Aprenda a gerar as fotos, o título, a descrição e o preço do seu produto na Shopee.',
    buttonLabel: 'Assistir agora',
    destination: `/sll/aula/${lesson.id}`,
    position: 0,
  },
  {
    slug: 'mentora-pri-24-horas',
    label: 'Mentora 24 horas',
    title: 'Fale com a Pri a hora que quiser',
    description:
      'Ela analisa sua loja, monta seu plano da semana e indica a aula certa. Direto no ChatGPT.',
    buttonLabel: 'Acessar ferramenta',
    destination: mentoraUrl,
    position: 1,
  },
] as const;

await db.transaction(async (tx) => {
  for (const banner of banners) {
    await tx
      .insert(learningBanners)
      .values({ ...banner, status: 'draft' })
      .onConflictDoNothing();
  }
});
console.info(
  'Os dois banners foram importados como rascunho. Envie as imagens originais no painel para publicá-los.',
);
process.exit(0);
