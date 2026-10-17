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

export const metadata: Metadata = { title: 'Student stage · Administration' };

export default async function AdminStoreJourneyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getAccountStoreJourney(id);
  if (!data) notFound();
  const { session, account, overview, onboarding, brand, images, hasAccess } = data;
  const step = currentStoreStep({ phase: overview.phase, answers: onboarding.answers, brand });
  const accountPath = `/admin/contas/${encodeURIComponent(account.id)}`;
  const started = overview.conversation !== 'nao-comecou' || overview.phase > 1;
  const showingQuestion =
    overview.phase === 1 &&
    ONBOARDING_QUESTIONS.some((question) => !isAnswered(onboarding.answers, question.id));

  return (
    <AdminShell
      account={session.user}
      current="accounts"
      backLink={{ href: accountPath, label: 'Back to account' }}
      title={`${account.name} · Current stage`}
      intro={account.email}
    >
      <div lang="en" className="flex flex-col gap-6">
        <p className="flex items-start gap-3 rounded-2xl bg-primary-soft px-5 py-4 text-body text-foreground forced-colors:border forced-colors:border-[CanvasText]">
          <Eye aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          Read-only view. You are signed in as an administrator. Viewing this page does not change
          the student's progress.
        </p>
        {!hasAccess || account.banned ? (
          <p className="rounded-2xl bg-muted px-5 py-4 text-body text-muted-foreground">
            {account.banned
              ? 'This account is blocked. The saved journey is shown below.'
              : 'This account does not currently have Loja Pronta access. The saved journey is shown below.'}
          </p>
        ) : null}
        <StudentStoreAppearance
          name={brand.name}
          description={brand.description}
          logoSrc={brand.logoImage ? `${accountPath}/journey/logo` : null}
          images={images}
        />
        <section aria-labelledby="current-stage" className={`${panelCard} gap-4`}>
          <p className="text-sm font-semibold text-progress-text">
            Stage {stageNumber(overview.phase)} of 3 · Phase {overview.phase} of{' '}
            {STORE_PHASE_LABELS.length}
          </p>
          <h2 id="current-stage" className="text-title font-semibold text-balance">
            {STORE_PHASE_LABELS[overview.phase - 1]}
          </h2>
          {!started ? (
            <p className="text-body text-muted-foreground">
              The student has not started the conversation.
            </p>
          ) : null}
          <div className="rounded-2xl bg-muted p-5">
            <h3 className="text-body font-semibold">{step.title}</h3>
            <p
              className="mt-2 text-body text-pretty text-muted-foreground"
              lang={showingQuestion ? 'pt-BR' : 'en'}
            >
              {step.detail}
            </p>
          </div>
        </section>
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <section aria-labelledby="saved-answers" className={`${panelCard} gap-4`}>
            <div>
              <h2 id="saved-answers" className="text-title font-semibold">
                Saved answers
              </h2>
              <p className="mt-2 text-body text-muted-foreground">
                {onboarding.completedAt
                  ? 'Conversation submitted.'
                  : 'Conversation not submitted yet.'}
              </p>
            </div>
            <dl className="divide-y divide-border">
              {ONBOARDING_QUESTIONS.map((question) => (
                <div key={question.id} className="flex flex-col gap-1 py-3">
                  <dt lang="pt-BR" className="text-sm text-muted-foreground">
                    {question.label}
                  </dt>
                  <dd
                    className="text-body font-semibold wrap-anywhere whitespace-pre-wrap"
                    lang={isAnswered(onboarding.answers, question.id) ? 'pt-BR' : 'en'}
                  >
                    {isAnswered(onboarding.answers, question.id)
                      ? answerText(question, onboarding.answers)
                      : 'Not answered yet'}
                  </dd>
                </div>
              ))}
              <div className="flex flex-col gap-1 py-3">
                <dt className="text-sm text-muted-foreground">WhatsApp</dt>
                <dd className="text-body font-semibold">
                  {onboarding.whatsapp ? formatWhatsapp(onboarding.whatsapp) : 'Not saved yet'}
                </dd>
              </div>
            </dl>
          </section>
          <section aria-labelledby="saved-brand" className={`${panelCard} gap-4`}>
            <div>
              <h2 id="saved-brand" className="text-title font-semibold">
                Saved brand
              </h2>
              <p className="mt-2 text-body text-muted-foreground">
                {brand.completedAt ? 'Brand confirmed.' : 'Brand not confirmed yet.'}
              </p>
            </div>
            <dl className="divide-y divide-border">
              <div className="flex flex-col gap-2 py-3">
                <dt className="text-sm text-muted-foreground">Store name</dt>
                <dd className="text-body font-semibold wrap-anywhere">
                  {brand.name ?? 'Not chosen yet'}
                </dd>
              </div>
              <div className="flex flex-col gap-2 py-3">
                <dt className="text-sm text-muted-foreground">Logo</dt>
                <dd className="text-body">
                  {brand.logoImage ? (
                    // The protected admin route reads only the selected student's saved logo.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${accountPath}/journey/logo`}
                      alt={`Saved logo for ${brand.name ?? account.name}`}
                      width={256}
                      height={256}
                      className="aspect-square w-full max-w-64 rounded-2xl border border-border object-contain"
                    />
                  ) : (
                    'Not chosen yet'
                  )}
                </dd>
              </div>
              <div className="flex flex-col gap-2 py-3">
                <dt className="text-sm text-muted-foreground">Store description</dt>
                <dd className="text-body wrap-anywhere whitespace-pre-wrap">
                  {brand.description ?? 'Not written yet'}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
