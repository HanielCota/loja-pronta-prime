import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ONBOARDING_BLOCKS, ONBOARDING_QUESTIONS } from '@/config/onboarding';
import { ConversationLayout } from '@/features/onboarding/components/conversation-layout';
import { FocusOnArrival } from '@/features/onboarding/components/focus-on-arrival';
import { MascotBubble } from '@/features/onboarding/components/mascot-bubble';
import { QuestionForm } from '@/features/onboarding/components/question-form';
import { WhatsappForm } from '@/features/onboarding/components/whatsapp-form';
import { requireConversation } from '@/features/onboarding/server/conversation';
import {
  answerText,
  canOpen,
  findQuestion,
  isStep,
  previousPath,
  QUESTION_COUNT,
  questionNumber,
  resumeStep,
  REVIEW_STEP,
  stepPath,
  stepProgress,
  WHATSAPP_STEP,
  type Step,
} from '@/features/onboarding/steps';
import { sectionTitleClass, panelCard } from '@/features/products/components/area-shell';
import { getParam, type SearchParams } from '@/lib/search-params';
import { cn } from '@/lib/utils';

type PageProps = { params: Promise<{ passo: string }>; searchParams: Promise<SearchParams> };

function stepTitle(step: Step): string {
  if (step === REVIEW_STEP) return 'Revisão';
  if (step === WHATSAPP_STEP) return 'Último passo';
  return `Pergunta ${questionNumber(step)} de ${QUESTION_COUNT}`;
}

/** No topo, curto (cabe no celular ao lado da parte): "1 de 10". */
function stepLabel(step: Step): string {
  return findQuestion(step) ? `${questionNumber(step)} de ${QUESTION_COUNT}` : stepTitle(step);
}

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

  const editing =
    getParam(query.editar) === '1' && passo !== REVIEW_STEP && passo !== WHATSAPP_STEP;
  const backHref = previousPath(passo, { editing });
  const titleId = 'pergunta';
  const helpId = 'pergunta-ajuda';

  if (passo === REVIEW_STEP) {
    const groups = Object.entries(ONBOARDING_BLOCKS).map(([block, title]) => ({
      block,
      title,
      questions: ONBOARDING_QUESTIONS.filter((question) => question.block === block),
    }));
    return (
      <ConversationLayout {...stepProgress(passo)} stepLabel={stepLabel(passo)} backHref={backHref}>
        <MascotBubble
          title="Confira suas respostas"
          help="A equipe cria seu logo a partir delas. Você pode mudar qualquer uma."
          titleId={titleId}
        />
        <FocusOnArrival targetId={titleId} />
        {groups.map((group) => (
          <section
            key={group.block}
            aria-labelledby={`grupo-${group.block}`}
            className={cn(panelCard, 'gap-1')}
          >
            <h2 id={`grupo-${group.block}`} className={sectionTitleClass}>
              {group.title}
            </h2>
            <dl className="divide-y divide-border">
              {group.questions.map((question) => (
                // dt e dd filhos diretos do div (o único agrupamento que o <dl> aceita); o grid
                // põe o "Editar" à direita das duas linhas.
                <div
                  key={question.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 py-3"
                >
                  <dt className="col-start-1 text-sm text-muted-foreground">{question.label}</dt>
                  <dd className="col-start-1 text-body font-semibold wrap-anywhere">
                    {answerText(question, answers)}
                  </dd>
                  <dd className="col-start-2 row-span-2 row-start-1">
                    <Link
                      href={stepPath(question.id, { editing: true })}
                      className="inline-flex min-h-11 items-center rounded-full px-2 font-semibold text-link outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
                    >
                      Editar<span className="sr-only"> {question.label.toLowerCase()}</span>
                    </Link>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <Button asChild>
          <Link href={stepPath(WHATSAPP_STEP)}>Está tudo certo</Link>
        </Button>
      </ConversationLayout>
    );
  }

  if (passo === WHATSAPP_STEP) {
    return (
      <ConversationLayout {...stepProgress(passo)} stepLabel={stepLabel(passo)} backHref={backHref}>
        <MascotBubble
          title="Em qual WhatsApp a equipe fala com você?"
          help="É por lá que você recebe os avisos de cada fase da loja."
          titleId={titleId}
          helpId={helpId}
        />
        <FocusOnArrival targetId={titleId} />
        <WhatsappForm helpId={helpId} />
      </ConversationLayout>
    );
  }

  const question = findQuestion(passo);
  if (!question) notFound();
  return (
    <ConversationLayout {...stepProgress(passo)} stepLabel={stepLabel(passo)} backHref={backHref}>
      <MascotBubble
        title={question.ask}
        help={question.help}
        titleId={titleId}
        helpId={question.help ? helpId : undefined}
      />
      <FocusOnArrival targetId={titleId} />
      {/* `key`: ao trocar de pergunta, o formulário começa do zero (sem a escolha da anterior). */}
      <QuestionForm
        key={question.id}
        question={question}
        saved={answers[passo as keyof typeof answers]}
        editing={editing}
        titleId={titleId}
        helpId={question.help ? helpId : undefined}
      />
    </ConversationLayout>
  );
}
