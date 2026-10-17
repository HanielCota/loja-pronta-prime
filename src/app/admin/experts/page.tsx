import type { Metadata } from 'next';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  hotmartProductMappings,
  learningContentBlocks,
  learningLessons,
  learningVideoVariants,
} from '@/server/db/schema';
import { EXPERT_IDS, EXPERT_LABELS } from '@/config/experts';
import { AdminShell } from '@/features/admin/components/admin-shell';
import { requireAdmin } from '@/features/admin/server/access';
import { panelCard } from '@/features/member/components/area-shell';
import { SllLessonVideo } from '@/features/sll/components/sll-lesson-video';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import {
  saveExpertOffer,
  saveVideoVariant,
  assignManualExpert,
} from '@/features/sll/server/experience-actions';
import { getParam, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = { title: 'Experts e vídeos · Administração' };

export default async function ExpertsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireAdmin('/admin/experts');
  const [offers, videos, variants] = await Promise.all([
    db.select().from(hotmartProductMappings).orderBy(asc(hotmartProductMappings.productUcode)),
    db
      .select({ id: learningContentBlocks.id, title: learningLessons.title })
      .from(learningContentBlocks)
      .innerJoin(learningLessons, eq(learningContentBlocks.lessonId, learningLessons.id))
      .where(eq(learningContentBlocks.kind, 'video'))
      .orderBy(asc(learningLessons.title)),
    db.select().from(learningVideoVariants),
  ]);
  const result = getParam((await searchParams).resultado);
  return (
    <AdminShell account={session.user} current="experts" title="Experts e vídeos">
      {result ? (
        <output className="text-body">
          {result === 'saved'
            ? 'Alteração salva.'
            : result === 'offer-used'
              ? 'Esse código já identifica outra experiência. Cadastre um código novo para preservar as compras.'
              : 'Confira os campos. Nada foi alterado.'}
        </output>
      ) : null}
      <section className={panelCard} aria-labelledby="expert-offers">
        <h2 id="expert-offers" className="text-title font-semibold">
          Origem das compras
        </h2>
        <p className="text-body text-muted-foreground">
          Cadastre o código real do produto Hotmart vendido por cada expert. A compra define os
          vídeos disponíveis, mantendo a mesma plataforma. Um código cadastrado não troca de
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
            <Select id="expert-access-1" name="access">
              <option value="sll">SLL</option>
              <option value="loja-pronta">Loja Pronta</option>
            </Select>
          </label>
          <label htmlFor="expert-expert-1" className="flex flex-col gap-2 text-body">
            Expert
            <Select id="expert-expert-1" name="expert">
              {EXPERT_IDS.map((expert) => (
                <option key={expert} value={expert}>
                  {EXPERT_LABELS[expert]}
                </option>
              ))}
            </Select>
          </label>
          <Button>Cadastrar origem</Button>
        </form>
      </section>
      <section className={`${panelCard} mt-6`} aria-labelledby="expert-videos">
        <h2 id="expert-videos" className="text-title font-semibold">
          Vídeos por expert
        </h2>
        <p className="text-body text-muted-foreground">
          As aulas e o progresso continuam compartilhados. A versão da Pri mantém o vídeo atual
          quando não há substituição. Para Zé, publique o vídeo correspondente em cada aula;
          enquanto isso, a aula informa que o vídeo está em preparação. Um mesmo vídeo autorizado
          pode ser publicado para ambos.
        </p>
        {videos.length ? (
          <form action={saveVideoVariant} className="flex flex-col gap-4">
            <label htmlFor="expert-blockId-1" className="flex flex-col gap-2 text-body">
              Aula
              <Select id="expert-blockId-1" name="blockId">
                {videos.map((video) => (
                  <option value={video.id} key={video.id}>
                    {video.title} · {video.id.slice(0, 8)}
                  </option>
                ))}
              </Select>
            </label>
            <label htmlFor="expert-expert-2" className="flex flex-col gap-2 text-body">
              Expert
              <Select id="expert-expert-2" name="expert">
                {EXPERT_IDS.map((expert) => (
                  <option key={expert} value={expert}>
                    {EXPERT_LABELS[expert]}
                  </option>
                ))}
              </Select>
            </label>
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
                    title="Prévia do expert"
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
            Expert
            <Select id="expert-expert-3" name="expert">
              {EXPERT_IDS.map((expert) => (
                <option key={expert} value={expert}>
                  {EXPERT_LABELS[expert]}
                </option>
              ))}
            </Select>
          </label>
          <Button variant="soft">Salvar experiência</Button>
        </form>
      </section>
    </AdminShell>
  );
}
