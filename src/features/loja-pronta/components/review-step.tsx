import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ONBOARDING_BLOCKS,
  ONBOARDING_QUESTIONS,
  type OnboardingAnswers,
} from '@/config/onboarding';
import { panelCard, sectionTitleClass } from '@/features/member/components/area-shell';
import { cn } from '@/lib/utils';
import { answerText } from '../answers';
import { stepPath, WHATSAPP_STEP } from '../steps';
import { FocusOnArrival } from './focus-on-arrival';
import { MascotBubble } from './mascot-bubble';

const TITLE_ID = 'revisao-titulo';

/** Revisão: as respostas por parte, cada uma com "Editar", e o caminho pro último passo. */
export function ReviewStep({ answers }: { answers: OnboardingAnswers }) {
  const groups = Object.entries(ONBOARDING_BLOCKS).map(([block, title]) => ({
    block,
    title,
    questions: ONBOARDING_QUESTIONS.filter((question) => question.block === block),
  }));
  return (
    <>
      <MascotBubble
        title="Confira suas respostas"
        help="A equipe cria seu logo a partir delas. Você pode mudar qualquer uma."
        titleId={TITLE_ID}
      />
      <FocusOnArrival targetId={TITLE_ID} />
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
              // dt e dd filhos diretos do div (o único agrupamento que o <dl> aceita); o grid põe
              // o "Editar" à direita das duas linhas.
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
    </>
  );
}
