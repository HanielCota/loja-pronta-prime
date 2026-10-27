import type { Metadata } from 'next';
import Link from 'next/link';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  hotmartProductMappings,
  learningContentBlocks,
  learningLessons,
  learningModules,
  learningStages,
  learningTracks,
  learningVideoVariants,
} from '@/server/db/schema';
import { EXPERT_IDS, EXPERT_LABELS } from '@/config/experts';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { requireAdmin } from '@/features/admin/server/access';
import { panelCard } from '@/features/member/components/area-shell';
import { SllLessonVideo } from '@/features/sll/components/sll-lesson-video';
import { SelectMenu } from '@/components/ui/select-menu';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import {
  saveExpertOffer,
  saveVideoVariant,
  assignManualExpert,
} from '@/features/sll/server/experience-actions';
import { getParam, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = { title: 'Especialistas e vídeos · Administração' };

export default async function ExpertsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin('/admin/experts');
  const [offers, videos, variants] = await Promise.all([
    db.select().from(hotmartProductMappings).orderBy(asc(hotmartProductMappings.productUcode)),
    db
      .select({ id: learningContentBlocks.id, title: learningLessons.title })
      .from(learningContentBlocks)
      .innerJoin(learningLessons, eq(learningContentBlocks.lessonId, learningLessons.id))
      .innerJoin(learningModules, eq(learningLessons.moduleId, learningModules.id))
      .innerJoin(learningStages, eq(learningModules.stageId, learningStages.id))
      .innerJoin(learningTracks, eq(learningStages.trackId, learningTracks.id))
      .where(and(eq(learningContentBlocks.kind, 'video'), eq(learningTracks.expert, 'pri')))
      .orderBy(asc(learningLessons.title)),
    db.select().from(learningVideoVariants).where(eq(learningVideoVariants.expert, 'pri')),
  ]);
  const result = getParam((await searchParams).resultado);
  return (
    <AdminPage title="Especialistas e vídeos">
      {result ? (
        <output className="text-body">
          {result === 'saved'
            ? 'Alteração salva.'
            : result === 'offer-used'
              ? 'Esse código já identifica outra experiência. Cadastre um código novo para preservar as compras.'
              : 'Confira os campos. Nada foi alterado.'}
        </output>
      ) : null}
      <section className={panelCard} aria-labelledby="ze-course-preview">
        <h2 id="ze-course-preview" className="text-title font-semibold">
          Curso Zé Mauro
        </h2>
        <p className="text-body text-muted-foreground">
          Confira os módulos e as aulas na prévia de administrador. Para editar as aulas, abra
          Cursos no painel.
        </p>
        <Button asChild className="sm:w-fit">
          <Link href="/ze-mauro">Ver área do Zé Mauro</Link>
        </Button>
      </section>
      <section className={panelCard} aria-labelledby="expert-offers">
        <h2 id="expert-offers" className="text-title font-semibold">
          Origem das compras
        </h2>
        <p className="text-body text-muted-foreground">
          Cadastre o código real do produto Hotmart vendido por cada especialista. A compra define a
          área do curso disponível, mantendo a mesma plataforma. Um código cadastrado não troca de
          experiência.
        </p>
        <ul className="space-y-2 text-body">
          {offers.map((offer) => (
            <li key={`${offer.productUcode}:${offer.access}`}>
              {offer.productUcode} · {offer.access === 'sll' ? 'SLL' : 'Loja Pronta'} ·{' '}
              {EXPERT_LABELS[offer.expert]}
            </li>
          ))}
        </ul>
        <form action={saveExpertOffer} className="flex flex-col gap-4">
          <FloatingLabelInput
            id="expert-offer-code"
            name="code"
            label="Código do produto na Hotmart"
            required
            maxLength={150}
          />
          <label htmlFor="expert-access-1" className="flex flex-col gap-2 text-body">
            Produto
            <SelectMenu id="expert-access-1" name="access">
              <option value="sll">SLL</option>
              <option value="loja-pronta">Loja Pronta</option>
            </SelectMenu>
          </label>
          <label htmlFor="expert-expert-1" className="flex flex-col gap-2 text-body">
            Especialista
            <SelectMenu id="expert-expert-1" name="expert">
              {EXPERT_IDS.map((expert) => (
                <option key={expert} value={expert}>
                  {EXPERT_LABELS[expert]}
                </option>
              ))}
            </SelectMenu>
          </label>
          <Button>Cadastrar origem</Button>
        </form>
      </section>
      <section className={`${panelCard} mt-6`} aria-labelledby="expert-videos">
        <h2 id="expert-videos" className="text-title font-semibold">
          Vídeos alternativos da Pri
        </h2>
        <p className="text-body text-muted-foreground">
          O curso do Zé Mauro tem aulas e progresso separados, na área “Curso Zé Mauro”. Edite essas
          aulas em Conteúdo. As substituições abaixo alteram somente os vídeos da Pri.
        </p>
        {videos.length ? (
          <form action={saveVideoVariant} className="flex flex-col gap-4">
            <label htmlFor="expert-blockId-1" className="flex flex-col gap-2 text-body">
              Aula
              <SelectMenu id="expert-blockId-1" name="blockId">
                {videos.map((video) => (
                  <option value={video.id} key={video.id}>
                    {video.title} · {video.id.slice(0, 8)}
                  </option>
                ))}
              </SelectMenu>
            </label>
            <input type="hidden" name="expert" value="pri" />
            <FloatingLabelInput
              id="expert-video"
              name="videoId"
              label="Link do player Panda ou ID do vídeo"
              maxLength={2000}
            />
            <div className="flex flex-wrap gap-3">
              <Button name="mode" value="draft" size="inline" variant="soft">
                Salvar rascunho
              </Button>
              <Button name="mode" value="publish" size="inline">
                Publicar vídeo
              </Button>
              <Button name="mode" value="withdraw" size="inline" variant="soft">
                Retirar substituição publicada
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-body text-muted-foreground">
            Crie primeiro a aula e seu bloco de vídeo no editor de conteúdo.
          </p>
        )}
        <ul className="mt-4 space-y-3 text-body">
          {variants.map((variant) => (
            <li
              className="rounded-2xl border border-border p-4"
              key={`${variant.blockId}:${variant.expert}`}
            >
              <strong>
                {videos.find((video) => video.id === variant.blockId)?.title ?? 'Aula'} ·{' '}
                {EXPERT_LABELS[variant.expert]}
              </strong>
              <span className="block break-all text-muted-foreground">
                Publicado: {variant.publishedVideoId ?? 'Sem substituição publicada'}
              </span>
              <span className="block break-all text-muted-foreground">
                Rascunho: {variant.draftVideoId ?? 'Sem rascunho'}
              </span>
              {variant.draftVideoId ? (
                <details className="mt-3">
                  <summary className="min-h-11 cursor-pointer text-body font-semibold">
                    Prévia do rascunho
                  </summary>
                  <SllLessonVideo
                    title="Prévia da especialista"
                    data={{ provider: 'pandavideo', videoId: variant.draftVideoId }}
                  />
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      <section className={`${panelCard} mt-6`} aria-labelledby="expert-manual">
        <h2 id="expert-manual" className="text-title font-semibold">
          Experiência de um acesso manual
        </h2>
        <p className="text-body text-muted-foreground">
          Use o identificador mostrado na página da conta. Isso escolhe os vídeos; o acesso ao SLL
          continua sendo liberado em Contas.
        </p>
        <form action={assignManualExpert} className="flex flex-col gap-4">
          <FloatingLabelInput
            id="expert-account"
            name="userId"
            label="Identificador da conta"
            required
            maxLength={200}
          />
          <label htmlFor="expert-expert-3" className="flex flex-col gap-2 text-body">
            Especialista
            <SelectMenu id="expert-expert-3" name="expert">
              {EXPERT_IDS.map((expert) => (
                <option key={expert} value={expert}>
                  {EXPERT_LABELS[expert]}
                </option>
              ))}
            </SelectMenu>
          </label>
          <Button variant="soft">Salvar experiência</Button>
        </form>
      </section>
    </AdminPage>
  );
}
