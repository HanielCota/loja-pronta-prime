import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { ConversationLayout } from '@/features/loja-pronta/components/conversation-layout';
import { BrandIntroStep } from '@/features/loja-pronta/components/brand-intro-step';
import { QuestionStep } from '@/features/loja-pronta/components/question-step';
import { ReviewStep } from '@/features/loja-pronta/components/review-step';
import { WhatsappStep } from '@/features/loja-pronta/components/whatsapp-step';
import { requireConversation } from '@/features/loja-pronta/server/conversation';
import {
  BRAND_INTRO_STEP,
  canOpen,
  findQuestion,
  isStep,
  previousPath,
  resumeStep,
  REVIEW_STEP,
  stepPath,
  stepHeader,
  stepTitle,
  WHATSAPP_STEP,
} from '@/features/loja-pronta/steps';
import { getVideo } from '@/features/videos/server/videos';
import { getParam, type SearchParams } from '@/lib/search-params';

type PageProps = { params: Promise<{ passo: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { passo } = await params;
  return { title: isStep(passo) ? `${stepTitle(passo)}, conversa inicial` : 'Conversa inicial' };
}

/**
 * Uma etapa da conversa inicial: uma pergunta, a passagem pra marca, a revisão das respostas ou o
 * WhatsApp. Ela pode
 * voltar pras perguntas já respondidas, mas não pular as que faltam. Revendo a conversa já
 * enviada, toda pergunta (e o WhatsApp, pra corrigir o número) volta pra revisão ao salvar.
 */
export default async function ConversationStepPage({ params, searchParams }: PageProps) {
  const [{ passo }, query] = await Promise.all([params, searchParams]);
  if (!isStep(passo)) notFound();

  const { student, onboarding, revising } = await requireConversation(stepPath(passo));
  const { answers } = onboarding;
  if (!canOpen(passo, answers)) redirect(stepPath(resumeStep(answers)));

  const question = findQuestion(passo);
  // Editar só existe nas perguntas (vindo da revisão, salvar volta pra ela).
  const editing = Boolean(question) && (revising || getParam(query.editar) === '1');

  return (
    <ConversationLayout
      account={student.session.user}
      header={stepHeader(passo)}
      backHref={
        revising && passo === REVIEW_STEP ? '/loja-pronta' : previousPath(passo, { editing })
      }
    >
      {passo === REVIEW_STEP ? (
        <ReviewStep answers={answers} whatsapp={onboarding.whatsapp} revising={revising} />
      ) : null}
      {passo === BRAND_INTRO_STEP ? (
        <BrandIntroStep withVideo={Boolean(await getVideo('orientacao'))} />
      ) : null}
      {passo === WHATSAPP_STEP ? (
        <WhatsappStep saved={onboarding.whatsapp} revising={revising} />
      ) : null}
      {question ? (
        <QuestionStep question={question} saved={answers[question.id]} editing={editing} />
      ) : null}
    </ConversationLayout>
  );
}
