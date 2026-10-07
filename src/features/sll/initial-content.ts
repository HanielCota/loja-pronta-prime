import inventory from '../../../data/sll/initial-content.json';
import pandaCatalog from '../../../data/sll/panda-videos.json';
import { lessonPublicationIssue } from '@/features/admin/publication-rules';
import { isSafeContentDestination } from '@/lib/urls';
import { pandaVideoId } from './panda-video';

export type InitialSllLesson = {
  slug: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  countsTowardProgress: boolean;
  videoId?: string;
  relatedLessonSlug?: string | undefined;
};

type InitialSllModule = {
  slug: string;
  title: string;
  description?: string;
  lessons: InitialSllLesson[];
};

type InitialSllStage = {
  slug: string;
  title: string;
  description?: string;
  modules: InitialSllModule[];
};

export type InitialSllTrack = {
  kind: 'welcome' | 'method' | 'complementary_course';
  slug: string;
  title: string;
  description: string;
  position: number;
  featured: boolean;
  stages: InitialSllStage[];
};

export type InitialSllContent = {
  tracks: InitialSllTrack[];
  resources: typeof inventory.resources;
};

const actionLinks: Record<string, string> = {
  'dia-2-titulos-e-descricoes': 'titulos-descricao-precificacao',
  'dia-3-fotos-de-capa': 'anuncios-automaticos-fotos',
  'dia-4-oferta': 'desconto',
  'dia-5-atendimento-e-pedidos': 'como-gerar-etiqueta',
  'dia-6-revisao-da-semana': 'informacoes-gerenciais',
  'cupom-de-novo-seguidor': 'cupons',
  'videos-curtos-shopee-videos': 'videos-shopee-videos',
  'oferta-relampago': 'oferta-relampago-da-loja',
  'duplicar-anuncios': 'duplicando-anuncios-do-jeito-certo',
  'gerar-etiqueta-antes-do-primeiro-pedido': 'como-gerar-etiqueta',
  'responder-chat-em-12-horas': 'chat-de-ouro-avaliacoes-reputacao',
  'primeiras-avaliacoes': 'primeiras-avaliacoes',
};

function lesson(
  slug: string,
  title: string,
  description: string | null = null,
  durationMinutes: number | null = null,
  countsTowardProgress = true,
): InitialSllLesson {
  return { slug, title, description, durationMinutes, countsTowardProgress };
}

/** O inventário conferido entra no deploy sem copiar IDs, contas ou arquivos do banco local. */
export function initialSllContent(): InitialSllContent {
  const tracks: InitialSllTrack[] = [
    {
      kind: 'welcome',
      slug: 'comece-aqui',
      title: 'Comece aqui',
      description:
        'Antes de começar as aulas, assista a esta mensagem da Pri. Ela vai te mostrar como aproveitar o SLL com clareza, no seu ritmo e com um caminho simples para começar.',
      position: 0,
      featured: false,
      stages: [
        {
          slug: 'boas-vindas',
          title: 'Trilha de boas-vindas',
          modules: [
            {
              slug: 'aulas',
              title: 'Aulas',
              lessons: inventory.welcomeLessons.map(([slug, title]) => lesson(slug!, title!)),
            },
          ],
        },
      ],
    },
    {
      kind: 'method',
      slug: 'metodo-sll',
      title: 'Método SLL',
      description: 'Sistema Loja Lucrativa — em 3 etapas sua loja no ar e vendendo.',
      position: 1,
      featured: false,
      stages: [
        {
          slug: 'etapa-1',
          title: 'Sua loja no ar em 7 dias',
          description:
            'Tudo que você precisa pra criar a sua loja e colocar ela no ar pronta pra vender em apenas 4 passos. Em 7 dias, sua loja no ar com produtos prontos e validados!',
          modules: inventory.stage1Steps.map((step) => ({
            slug: step.slug,
            title: step.title,
            lessons: step.lessons.map((item) =>
              lesson(item.slug, item.title, item.description, item.duration),
            ),
          })),
        },
        {
          slug: 'etapa-2',
          title: 'Seu plano de 7 dias',
          description: 'Saiba o que priorizar na sua loja e siga o passo a passo de cada ação.',
          modules: [
            ...inventory.stage2Priorities.map((item) => ({
              slug: item.slug,
              title: item.title,
              lessons: [
                {
                  ...lesson('acao-principal', item.lesson, item.description),
                  relatedLessonSlug: actionLinks[item.slug],
                },
              ],
            })),
            {
              slug: 'acoes-complementares',
              title: 'Ações complementares',
              description:
                'Aprofunde o que fizer sentido para sua loja. Estas ações não entram na contagem das 6 prioridades.',
              lessons: inventory.stage2OptionalActions.map(([slug, title, description]) => ({
                ...lesson(slug!, title!, description!, null, false),
                relatedLessonSlug: actionLinks[slug!],
              })),
            },
          ],
        },
        {
          slug: 'etapa-3',
          title: 'Biblioteca de Conhecimento',
          description:
            'Sua biblioteca de referência — 19 aulas cobrindo tudo dentro da Central do Vendedor. Aqui não tem ordem: use a busca ou navegue por categoria.',
          modules: inventory.stage3Categories.map((category) => ({
            slug: category.slug,
            title: category.title,
            lessons: category.lessons.map(([slug, title, description]) =>
              lesson(slug!, title!, description!),
            ),
          })),
        },
      ],
    },
    ...inventory.courses.map((course, position): InitialSllTrack => ({
      kind: 'complementary_course',
      slug: course.slug,
      title: course.title,
      description: course.description,
      position,
      featured: course.slug === 'shopee-ads-completo',
      stages: [
        {
          slug: 'curso',
          title: course.title,
          modules: [
            {
              slug: 'aulas',
              title: 'Aulas',
              lessons: course.lessons.map(([slug, title, duration]) =>
                lesson(String(slug), String(title), null, Number(duration)),
              ),
            },
          ],
        },
      ],
    })),
  ];

  const videoByPath = new Map(
    pandaCatalog.sections.flatMap((section) =>
      section.groups.flatMap((group) =>
        group.lessons.map(
          (item) =>
            [
              `${group.project.trackSlug}/${group.project.stageSlug}/${group.project.moduleSlug}/${item.projectLessonSlug}`,
              item.videoId,
            ] as const,
        ),
      ),
    ),
  );
  for (const track of tracks)
    for (const stage of track.stages)
      for (const group of stage.modules)
        for (const item of group.lessons) {
          const videoId = videoByPath.get(`${track.slug}/${stage.slug}/${group.slug}/${item.slug}`);
          if (videoId) item.videoId = videoId;
        }

  const content = { tracks, resources: structuredClone(inventory.resources) };
  validateInitialSllContent(content);
  return content;
}

/** Valida tudo antes da primeira escrita para não publicar uma trilha incompleta. */
export function validateInitialSllContent(content: InitialSllContent): void {
  let lessons = 0;
  let videos = 0;
  const paths = new Set<string>();
  for (const track of content.tracks) {
    const targets = new Set(
      track.stages.flatMap((stage) =>
        stage.modules.flatMap((module) => module.lessons.map((item) => item.slug)),
      ),
    );
    for (const stage of track.stages)
      for (const group of stage.modules)
        for (const item of group.lessons) {
          const key = `${track.slug}/${stage.slug}/${group.slug}/${item.slug}`;
          if (paths.has(key)) throw new Error(`Aula duplicada no inventário: ${key}.`);
          paths.add(key);
          const blocks = item.videoId
            ? [{ kind: 'video' as const, data: { provider: 'pandavideo', videoId: item.videoId } }]
            : [];
          const issue = lessonPublicationIssue(item.title, item.description, blocks);
          if (issue) throw new Error(`${key}: ${issue}`);
          if (item.videoId && pandaVideoId(item.videoId) !== item.videoId)
            throw new Error(`Vídeo inválido: ${key}.`);
          if (item.relatedLessonSlug && !targets.has(item.relatedLessonSlug))
            throw new Error(`Aula de referência ausente: ${key}.`);
          lessons++;
          if (item.videoId) videos++;
        }
  }
  if (content.tracks.length !== 5 || lessons !== 84 || videos !== 71)
    throw new Error('O inventário inicial precisa de 5 trilhas, 84 aulas e 71 vídeos.');
  if (content.resources.length !== 8)
    throw new Error('O inventário inicial precisa de 8 recursos.');
  for (const resource of content.resources)
    if (resource.destination && !isSafeContentDestination(resource.destination))
      throw new Error(`Destino inválido no recurso ${resource.slug}.`);
}
