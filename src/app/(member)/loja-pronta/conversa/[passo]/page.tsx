import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { ConversationLayout } from '@/features/loja-pronta/components/conversation-layout';
import { QuestionStep } from '@/features/loja-pronta/components/question-step';
import { ReviewStep } from '@/features/loja-pronta/components/review-step';
import { WhatsappStep } from '@/features/loja-pronta/components/whatsapp-step';
import { requireConversation } from '@/features/loja-pronta/server/conversation';
import {
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
import { getParam, type SearchParams } from '@/lib/search-params';

type PageProps = { params: Promise<{ passo: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { passo } = await params;
  return { title: isStep(passo) ? `${stepTitle(passo)}, conversa inicial` : 'Conversa inicial' };
}

/**
 * Uma etapa da conversa inicial: uma pergunta, a revisão das respostas ou o WhatsApp. Ela pode
 * voltar pras perguntas já respondidas, mas não pular as que faltam.
 */
export default async function ConversationStepPage({ params, searchParams }: PageProps) {
  const [{ passo }, query] = await Promise.all([params, searchParams]);
  if (!isStep(passo)) notFound();

  const { onboarding } = await requireConversation(stepPath(passo));
  const { answers } = onboarding;
  if (!canOpen(passo, answers)) redirect(stepPath(resumeStep(answers)));

  const question = findQuestion(passo);
  // Editar só existe nas perguntas (vindo da revisão, salvar volta pra ela).
  const editing = Boolean(question) && getParam(query.editar) === '1';

  return (
    <ConversationLayout
      header={stepHeader(passo, Object.keys(answers).length > 0)}
      savedLabel="Respostas salvas"
      backHref={previousPath(passo, { editing })}
    >
      {passo === REVIEW_STEP ? <ReviewStep answers={answers} /> : null}
      {passo === WHATSAPP_STEP ? <WhatsappStep /> : null}
      {question ? (
        <QuestionStep question={question} saved={answers[question.id]} editing={editing} />
      ) : null}
    </ConversationLayout>
  );
}
