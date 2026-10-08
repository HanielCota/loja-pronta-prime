import { ArrowDownIcon, ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { STORE_STAGES } from '@/config/store-phases';
import { AreaShell, panelCard } from '@/features/member/components/area-shell';
import type { NavbarAccount } from '@/features/member/components/member-navbar';
import { greetingName } from '@/features/products/names';
import { cn } from '@/lib/utils';
import { CONVERSATION_PATH } from '../steps';

/** Antes da primeira resposta, apresenta o caminho sem pedir uma decisão sobre a marca ainda. */
export function StoreWelcome({ user, hasChoice }: { user: NavbarAccount; hasChoice: boolean }) {
  const name = greetingName(user);
  const welcome = name ? `Bem-vinda, ${name}.` : 'Bem-vinda.';

  return (
    <AreaShell
      account={user}
      hasChoice={hasChoice}
      area="loja-pronta"
      crumb="Loja Pronta"
      title={welcome}
      narrow
      beforeHeader={
        <ol
          aria-label="Etapas da Loja Pronta"
          className={cn(panelCard, 'grid grid-cols-3 gap-3 p-4 sm:p-5')}
        >
          {STORE_STAGES.map((stage, index) => (
            <li
              key={stage.title}
              aria-current={index === 0 ? 'step' : undefined}
              className="flex flex-col gap-1"
            >
              <span
                className={cn(
                  'text-sm font-semibold',
                  index === 0 ? 'text-progress-text' : 'text-muted-foreground',
                )}
              >
                Etapa {index + 1}
                {index === 0 ? <span className="sr-only"> · Você está aqui</span> : null}
              </span>
              <span className="text-sm text-foreground">{stage.shortTitle}</span>
            </li>
          ))}
        </ol>
      }
      header={
        <div className="flex min-h-[calc(100svh-17rem)] flex-col justify-center gap-6 py-8 sm:min-h-[calc(100svh-15rem)] sm:py-12">
          <h1 className="text-title-lg font-semibold text-balance sm:text-title-xl">
            <span className="block">{welcome}</span>
            Vamos montar sua <span className="text-link">loja juntas.</span>
          </h1>
          <p className="max-w-[45ch] text-body text-pretty text-muted-foreground">
            Veja o caminho antes de começar. Vamos te orientar em cada passo.
          </p>
          <Button asChild className="mt-2">
            {/* Âncora de verdade: mostra o plano e leva o foco ao título também sem JavaScript. */}
            <a href="#plano-da-loja">
              Quero ver o plano
              <ArrowDownIcon aria-hidden="true" />
            </a>
          </Button>
        </div>
      }
    >
      <section aria-labelledby="plano-da-loja" className="flex flex-col gap-6 py-8 sm:py-12">
        <div className="flex flex-col gap-3">
          <h2
            id="plano-da-loja"
            tabIndex={-1}
            className="rounded-field text-title-lg font-semibold text-balance focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:text-title-xl"
          >
            Sua loja em 3 etapas
          </h2>
          <p className="text-body text-pretty text-muted-foreground">
            No seu ritmo. Uma parte de cada vez.
          </p>
        </div>
        <ol aria-label="O plano da sua loja" className="flex flex-col gap-4">
          {STORE_STAGES.map((stage, index) => (
            <li key={stage.title} className={cn(panelCard, 'flex-row items-start gap-4 sm:gap-5')}>
              <span
                aria-hidden="true"
                className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-soft text-2xl font-semibold text-link forced-colors:border forced-colors:border-[CanvasText]"
              >
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                <h3 className="text-body font-semibold text-balance">{stage.title}</h3>
                <p className="text-body text-pretty text-muted-foreground">{stage.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        <Button asChild>
          <Link href={CONVERSATION_PATH}>
            Começar agora
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
      </section>
    </AreaShell>
  );
}
