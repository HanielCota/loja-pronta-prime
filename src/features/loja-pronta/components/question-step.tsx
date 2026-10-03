import type { AnswerValue, OnboardingQuestion } from '@/config/onboarding';
import { FocusOnArrival } from './focus-on-arrival';
import { MascotBubble } from './mascot-bubble';
import { QuestionForm } from './question/question-form';

const TITLE_ID = 'pergunta';
const HELP_ID = 'pergunta-ajuda';

type QuestionStepProps = {
  question: OnboardingQuestion;
  saved: AnswerValue | undefined;
  editing: boolean;
};

/** Uma pergunta: o mascote fazendo a pergunta e o formulário da resposta. */
export function QuestionStep({ question, saved, editing }: QuestionStepProps) {
  const helpId = question.help ? HELP_ID : undefined;
  return (
    <>
      <MascotBubble title={question.ask} help={question.help} titleId={TITLE_ID} helpId={helpId} />
      <FocusOnArrival targetId={TITLE_ID} />
      {/* `key`: ao trocar de pergunta, o formulário começa do zero (sem a escolha da anterior). */}
      <QuestionForm
        key={question.id}
        question={question}
        saved={saved}
        editing={editing}
        titleId={TITLE_ID}
        helpId={helpId}
      />
    </>
  );
}
