import { ArrowRightIcon, CheckIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ONBOARDING_QUESTIONS } from '@/config/onboarding';
import { cn } from '@/lib/utils';
import { stepPath } from '../steps';
import { FocusOnArrival } from './focus-on-arrival';
import { MascotBubble } from './mascot-bubble';
import { StickyAction } from './sticky-action';

const TITLE_ID = 'passagem';

/** As perguntas da marca (a passagem conta quantas faltam e leva pra primeira). */
const BRAND_QUESTIONS = ONBOARDING_QUESTIONS.filter((question) => question.block === 'marca');

/**
 * A pausa entre as perguntas sobre ela e as da marca: o que já foi, o que vem agora e o que vem
 * depois, numa lista curta. Ela respira, entende pra que servem as próximas perguntas e segue.
 * `withVideo`: no fim da conversa tem o vídeo de orientação (só quando há um vídeo enviado).
 */
export function BrandIntroStep({ withVideo }: { withVideo: boolean }) {
  const items: { label: string; status: 'done' | 'now' | 'next' }[] = [
    { label: 'Te conhecemos', status: 'done' },
    { label: `A cara da sua loja: ${BRAND_QUESTIONS.length} perguntas rápidas`, status: 'now' },
    withVideo
      ? { label: 'Um vídeo curto explicando os próximos passos', status: 'next' }
      : { label: 'Uma revisão das respostas, e pronto', status: 'next' },
  ];
  return (
    <div className="flex flex-col gap-8">
      <MascotBubble
        title="Agora, a cara da sua loja"
        help="Com essas respostas, a gente prepara ideias de nome, logo e texto pra você escolher."
        titleId={TITLE_ID}
        helpId={`${TITLE_ID}-ajuda`}
      />
      <FocusOnArrival targetId={TITLE_ID} />
      <ol className="flex flex-col gap-3 rounded-card bg-card p-5 shadow-card sm:p-6 forced-colors:border forced-colors:border-[CanvasText]">
        {items.map((item, index) => (
          <li
            key={item.label}
            aria-current={item.status === 'now' ? 'step' : undefined}
            className="flex items-center gap-4"
          >
            <span
              aria-hidden="true"
              className={cn(
                'grid size-10 shrink-0 place-items-center rounded-full text-body font-bold',
                item.status === 'done' && 'bg-progress text-primary-foreground',
                item.status === 'now' && 'bg-primary text-primary-foreground',
                item.status === 'next' && 'border-[1.5px] border-input text-muted-foreground',
              )}
            >
              {item.status === 'done' ? (
                <CheckIcon className="size-5" strokeWidth={3} />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn(
                'text-body text-pretty',
                item.status === 'now' ? 'font-semibold' : 'text-muted-foreground',
              )}
            >
              {item.label}
              <span className="sr-only">
                {item.status === 'done' ? ' (feito)' : item.status === 'next' ? ' (depois)' : ''}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <StickyAction>
        <Button asChild>
          <Link href={stepPath(BRAND_QUESTIONS[0]!.id)}>
            Bora começar
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
      </StickyAction>
    </div>
  );
}
