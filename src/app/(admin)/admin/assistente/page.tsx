import type { Metadata } from 'next';
import { asc, desc, eq, isNull, and } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  assistantPlaybooks,
  assistantJobs,
  assistantPublicationItems,
  learningLessons,
} from '@/server/db/schema';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { requireAdmin } from '@/features/admin/server/access';
import { panelCard } from '@/features/member/components/area-shell';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileField } from '@/components/ui/file-field';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { STRATEGIES, STRATEGY_LABELS, starterPlaybooks } from '@/features/assistant/model';
import {
  saveAssistantPlaybook,
  prepareStarterPlaybooks,
} from '@/features/assistant/server/actions';
import {
  finishAssistantVariations,
  importSupplierCatalog,
  retryAssistantJob,
  reconcileAssistantPublication,
} from '@/features/assistant/server/admin-actions';
import { getParam, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = { title: 'Planos e operação · Administração' };
const statuses: Record<string, string> = {
  pending: 'Na fila',
  running: 'Em execução',
  completed: 'Concluída',
  blocked: 'Precisa de atenção',
  unknown: 'Resultado a conferir',
};
export default async function AssistantAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin('/admin/assistente');
  const [books, jobs, uncertain, lessons, params] = await Promise.all([
    db.select().from(assistantPlaybooks).orderBy(desc(assistantPlaybooks.revision)),
    db.select().from(assistantJobs).orderBy(desc(assistantJobs.createdAt)).limit(50),
    db
      .select()
      .from(assistantPublicationItems)
      .where(eq(assistantPublicationItems.status, 'unknown'))
      .limit(50),
    db
      .select({ id: learningLessons.id, title: learningLessons.title })
      .from(learningLessons)
      .where(and(eq(learningLessons.status, 'published'), isNull(learningLessons.archivedAt)))
      .orderBy(asc(learningLessons.title)),
    searchParams,
  ]);
  const result = getParam(params.resultado);
  const messages: Record<string, string> = {
    saved: 'Alteração salva.',
    outdated:
      'Dados anteriores ou conflitantes foram ignorados. As informações mais recentes foram preservadas.',
    invalid: 'Confira os dados e tente novamente.',
    'lesson-unavailable': 'Uma das aulas escolhidas ainda não está publicada.',
    'confirmation-required': 'Confira a conta e as informações de publicação antes de importar. ',
    matched: 'O anúncio foi encontrado. A publicação não foi repetida.',
    'not-found': 'Nenhum anúncio ativo com esse SKU foi encontrado. A publicação não foi repetida.',
    ambiguous: 'Há mais de um anúncio com esse SKU. Confira os anúncios na Shopee.',
    unavailable: 'Não foi possível concluir a consulta. A publicação não foi repetida.',
  };
  return (
    <AdminPage title="Planos e operação">
      {result ? (
        <output className="mb-6 text-body">{messages[result] ?? 'Confira o resultado.'}</output>
      ) : null}
      <section className={panelCard} aria-labelledby="methodology-books">
        <h2 id="methodology-books" className="text-title font-semibold">
          Roteiros de sete dias
        </h2>
        <p className="text-body text-muted-foreground">
          Revise os textos e escolha as aulas que ensinam cada ação. Salvar rascunho preserva a
          versão das alunas. Publicar libera uma nova versão; quem já começou mantém o plano salvo.
        </p>
        {!books.length ? (
          <form action={prepareStarterPlaybooks}>
            <Button variant="soft">Preparar sugestões dos três roteiros</Button>
          </form>
        ) : null}
        {STRATEGIES.map((strategy) => {
          const current = books.find((book) => book.strategy === strategy);
          const initial = starterPlaybooks().find((book) => book.strategy === strategy)!;
          const actions = current?.actions ?? initial.actions;
          return (
            <details key={strategy} className="mt-4 rounded-2xl border border-border p-4">
              <summary className="min-h-11 cursor-pointer text-body font-semibold">
                {STRATEGY_LABELS[strategy]} ·{' '}
                {current?.publishedAt
                  ? 'Versão publicada'
                  : current
                    ? 'Rascunho'
                    : 'Sugestão para revisar'}
              </summary>
              <form action={saveAssistantPlaybook} className="mt-4 flex flex-col gap-5">
                <input type="hidden" name="strategy" value={strategy} />
                <FloatingLabelInput
                  id={`book-title-${strategy}`}
                  name="title"
                  label="Nome do roteiro"
                  defaultValue={current?.title ?? initial.title}
                  required
                  maxLength={160}
                />
                {actions.map((action) => (
                  <fieldset
                    key={action.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border p-4"
                  >
                    <legend className="px-2 text-body font-semibold">Dia {action.day}</legend>
                    <FloatingLabelInput
                      id={`action-title-${strategy}-${action.day}`}
                      name={`title-${action.day}`}
                      label="O que a aluna vai fazer"
                      defaultValue={action.title}
                      required
                      maxLength={160}
                    />
                    <label
                      htmlFor={`action-description-${strategy}-${action.day}`}
                      className="flex flex-col gap-2 text-body"
                    >
                      Como fazer
                      <Textarea
                        id={`action-description-${strategy}-${action.day}`}
                        name={`description-${action.day}`}
                        defaultValue={action.description}
                        required
                        maxLength={3000}
                      />
                    </label>
                    <label
                      htmlFor={`action-lesson-${strategy}-${action.day}`}
                      className="flex flex-col gap-2 text-body"
                    >
                      Aula que ajuda a executar
                      <Select
                        id={`action-lesson-${strategy}-${action.day}`}
                        name={`lesson-${action.day}`}
                        defaultValue={action.lessonId ?? ''}
                      >
                        <option value="">Sem aula relacionada</option>
                        {lessons.map((lesson) => (
                          <option value={lesson.id} key={lesson.id}>
                            {lesson.title}
                          </option>
                        ))}
                      </Select>
                    </label>
                  </fieldset>
                ))}
                <div className="flex flex-wrap gap-3">
                  <Button name="mode" value="draft" variant="soft" size="inline">
                    Salvar rascunho
                  </Button>
                  <Button name="mode" value="publish" size="inline">
                    Publicar roteiro
                  </Button>
                </div>
              </form>
            </details>
          );
        })}
      </section>
      <section className={`${panelCard} mt-6`} aria-labelledby="supplier-import">
        <h2 id="supplier-import" className="text-title font-semibold">
          Catálogo do fornecedor
        </h2>
        <p className="text-body text-muted-foreground">
          Importe o arquivo de integração do fornecedor. A data original do preço e estoque é
          preservada. Se o arquivo também prepara publicações, informe a conta cuja loja foi
          conferida.
        </p>
        <form action={importSupplierCatalog} className="flex flex-col gap-4">
          <FileField
            id="supplier-file"
            name="catalog"
            label="Arquivo do catálogo"
            accept="application/json,.json"
            required
          />
          <FloatingLabelInput
            id="supplier-account"
            name="targetUserId"
            label="Identificador da conta para publicação (opcional)"
            maxLength={200}
          />
          <label className="flex min-h-12 items-start gap-3 text-body">
            <input type="checkbox" name="confirmed" value="true" className="mt-1 size-5 shrink-0" />
            Conferi preço, estoque, imagens, categoria, atributos e logística para essa loja.
          </label>
          <Button variant="soft">Importar catálogo</Button>
        </form>
      </section>
      <section className={`${panelCard} mt-6`} aria-labelledby="uncertain-publications">
        <h2 id="uncertain-publications" className="text-title font-semibold">
          Publicações a conferir
        </h2>
        <p className="text-body text-muted-foreground">
          Uma resposta perdida pode esconder uma publicação aceita. A consulta procura o SKU na
          loja, sem enviar o anúncio novamente.
        </p>
        {uncertain.length ? (
          <ul className="space-y-4">
            {uncertain.map((item) => (
              <li className="rounded-2xl border border-border p-4" key={item.id}>
                <p className="mb-3 text-body break-all">
                  Produto {item.sku} · Loja {item.shopId}
                </p>
                <form action={reconcileAssistantPublication}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <Button variant="soft">Conferir anúncio na Shopee</Button>
                </form>
                {item.itemId && item.payload.variations ? (
                  <form action={finishAssistantVariations}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <Button variant="soft">Concluir publicação das variações confirmadas</Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-muted-foreground">
            Nenhuma publicação com resultado incerto.
          </p>
        )}
      </section>
      <section className={`${panelCard} mt-6`} aria-labelledby="operation-jobs">
        <h2 id="operation-jobs" className="text-title font-semibold">
          Rotinas recentes
        </h2>
        <p className="text-body text-muted-foreground">
          Coletas e publicações usam uma fila persistida. A rotina de processamento precisa estar
          ativa no servidor.
        </p>
        {jobs.length ? (
          <ul className="space-y-3">
            {jobs.map((job) => (
              <li key={job.id} className="rounded-2xl border border-border p-4">
                <p className="text-body font-semibold">
                  {job.kind === 'collect'
                    ? 'Coleta de dados'
                    : job.kind === 'publish'
                      ? 'Publicação'
                      : 'Análise do lote'}{' '}
                  · {statuses[job.status]}
                </p>
                {job.failure ? (
                  <p className="mt-2 text-body text-muted-foreground">
                    {job.failure === 'publication-disabled'
                      ? 'A publicação ainda não foi habilitada.'
                      : job.failure === 'catalog-stale'
                        ? 'Atualize o catálogo e confira preço e estoque.'
                        : job.failure === 'configuration'
                          ? 'A configuração da integração precisa ser concluída.'
                          : job.failure === 'connection-changed'
                            ? 'A loja conectada mudou. Confira antes de continuar.'
                            : 'Confira a conexão e os dados antes de tentar novamente.'}
                  </p>
                ) : null}
                {job.status === 'blocked' ? (
                  <form action={retryAssistantJob} className="mt-3">
                    <input type="hidden" name="jobId" value={job.id} />
                    <Button variant="soft" size="inline">
                      Tentar de novo após corrigir
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-muted-foreground">Nenhuma rotina solicitada.</p>
        )}
      </section>
    </AdminPage>
  );
}
