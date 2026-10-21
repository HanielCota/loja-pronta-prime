import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Eye } from 'lucide-react';
import { ONBOARDING_QUESTIONS } from '@/config/onboarding';
import { AdminShell } from '@/features/admin/components/admin-shell';
import { StudentStoreAppearance } from '@/features/admin/components/student-store-appearance';
import { getAccountStoreJourney } from '@/features/admin/server/store-journey';
import { currentStoreStep, STORE_PHASE_LABELS } from '@/features/admin/store-journey';
import { answerText, isAnswered } from '@/features/loja-pronta/answers';
import { stageNumber } from '@/features/loja-pronta/stages';
import { formatWhatsapp } from '@/features/loja-pronta/whatsapp';
import { panelCard } from '@/features/member/components/area-shell';
import {
  listLegacyStoresForUser,
  getLegacyMembershipForUser,
} from '@/features/legacy-stores/server/queries';
import { LegacyStoreHistory } from '@/features/legacy-stores/components/store-history';
import { LegacyMembershipHistory } from '@/features/legacy-stores/components/membership-history';

export const metadata: Metadata = { title: 'Etapa da aluna · Administração' };

export default async function AdminStoreJourneyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getAccountStoreJourney(id);
  if (!data) notFound();
  const [previousStores, previousMembership] = await Promise.all([
    listLegacyStoresForUser(id),
    getLegacyMembershipForUser(id),
  ]);
  const { session, account, overview, onboarding, brand, logoSrc, images, hasAccess } = data;
  const step = currentStoreStep({ phase: overview.phase, answers: onboarding.answers, brand });
  const accountPath = `/admin/contas/${encodeURIComponent(account.id)}`;
  const started = overview.conversation !== 'nao-comecou' || overview.phase > 1;

  return (
    <AdminShell
      account={session.user}
      current="accounts"
      backLink={{ href: accountPath, label: 'Voltar pra conta' }}
      title={`${account.name} · Etapa atual`}
      intro={account.email}
    >
      <div className="flex flex-col gap-6">
        <p className="flex items-start gap-3 rounded-2xl bg-primary-soft px-5 py-4 text-body text-foreground forced-colors:border forced-colors:border-[CanvasText]">
          <Eye aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          Só para ver. Você continua na sua própria conta. Abrir esta tela não muda o progresso da
          aluna.
        </p>
        {!hasAccess || account.banned ? (
          <p className="rounded-2xl bg-muted px-5 py-4 text-body text-muted-foreground">
            {account.banned
              ? 'Esta conta está bloqueada. O que a aluna salvou aparece abaixo.'
              : 'Esta conta está sem acesso à Loja Pronta agora. O que a aluna salvou aparece abaixo.'}
          </p>
        ) : null}
        <LegacyMembershipHistory membership={previousMembership} />
        <LegacyStoreHistory
          stores={previousStores}
          basePath={`/admin/contas/${encodeURIComponent(id)}/previous-stores`}
        />
        {previousStores.length ? (
          <h2 className="text-title font-semibold">Montagem atual da loja</h2>
        ) : null}
        <StudentStoreAppearance
          name={brand.name}
          description={brand.description}
          logoSrc={logoSrc}
          images={images}
        />
        <section aria-labelledby="current-stage" className={`${panelCard} gap-4`}>
          <p className="text-sm font-semibold text-progress-text">
            Etapa {stageNumber(overview.phase)} de 3 · Fase {overview.phase} de{' '}
            {STORE_PHASE_LABELS.length}
          </p>
          <h2 id="current-stage" className="text-title font-semibold text-balance">
            {STORE_PHASE_LABELS[overview.phase - 1]}
          </h2>
          {!started ? (
            <p className="text-body text-muted-foreground">A aluna ainda não começou a conversa.</p>
          ) : null}
          <div className="rounded-2xl bg-muted p-5">
            <h3 className="text-body font-semibold">{step.title}</h3>
            <p className="mt-2 text-body text-pretty text-muted-foreground">{step.detail}</p>
          </div>
        </section>
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <section aria-labelledby="saved-answers" className={`${panelCard} gap-4`}>
            <div>
              <h2 id="saved-answers" className="text-title font-semibold">
                Respostas salvas
              </h2>
              <p className="mt-2 text-body text-muted-foreground">
                {onboarding.completedAt ? 'Conversa enviada.' : 'Conversa ainda não enviada.'}
              </p>
            </div>
            <dl className="divide-y divide-border">
              {ONBOARDING_QUESTIONS.map((question) => (
                <div key={question.id} className="flex flex-col gap-1 py-3">
                  <dt className="text-sm text-muted-foreground">{question.label}</dt>
                  <dd className="text-body font-semibold wrap-anywhere whitespace-pre-wrap">
                    {isAnswered(onboarding.answers, question.id)
                      ? answerText(question, onboarding.answers)
                      : 'Ainda sem resposta'}
                  </dd>
                </div>
              ))}
              <div className="flex flex-col gap-1 py-3">
                <dt className="text-sm text-muted-foreground">WhatsApp</dt>
                <dd className="text-body font-semibold">
                  {onboarding.whatsapp ? formatWhatsapp(onboarding.whatsapp) : 'Ainda não salvo'}
                </dd>
              </div>
            </dl>
          </section>
          <section aria-labelledby="saved-brand" className={`${panelCard} gap-4`}>
            <div>
              <h2 id="saved-brand" className="text-title font-semibold">
                Marca salva
              </h2>
              <p className="mt-2 text-body text-muted-foreground">
                {brand.completedAt ? 'Marca confirmada.' : 'Marca ainda não confirmada.'}
              </p>
            </div>
            <dl className="divide-y divide-border">
              <div className="flex flex-col gap-2 py-3">
                <dt className="text-sm text-muted-foreground">Nome da loja</dt>
                <dd className="text-body font-semibold wrap-anywhere">
                  {brand.name ?? 'Ainda não escolhido'}
                </dd>
              </div>
              <div className="flex flex-col gap-2 py-3">
                <dt className="text-sm text-muted-foreground">Logo</dt>
                <dd className="text-body">
                  {logoSrc ? (
                    // A rota protegida do admin só lê o logo salvo desta aluna.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoSrc}
                      alt={`Logo salvo de ${brand.name ?? account.name}`}
                      width={256}
                      height={256}
                      className="aspect-square w-full max-w-64 rounded-2xl border border-border object-contain"
                    />
                  ) : brand.logoImage ? (
                    'O logo salvo não está disponível.'
                  ) : (
                    'Ainda não escolhido'
                  )}
                </dd>
              </div>
              <div className="flex flex-col gap-2 py-3">
                <dt className="text-sm text-muted-foreground">Texto da loja</dt>
                <dd className="text-body wrap-anywhere whitespace-pre-wrap">
                  {brand.description ?? 'Ainda não escrito'}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
