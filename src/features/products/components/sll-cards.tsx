import { ArrowRight, BookOpen, CirclePlay, LockIcon, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { panelCard, sectionTitleClass } from '@/features/member/components/area-shell';

const PATH = [
  { title: 'Trilha de boas-vindas', detail: 'Como o curso funciona.' },
  { title: 'Método em 3 Etapas', detail: 'Cada etapa abre quando você conclui a anterior.' },
  { title: 'Minicursos', detail: 'Temas extras depois do método.' },
] as const;

/**
 * Caminho do SLL, na ordem em que o curso abre. Só vira link o que já tem aula publicada; o
 * resto aparece com cadeado, sem cara de botão.
 */
export function SllCourseCard({
  welcomeHref,
  methodHref,
  coursesHref,
}: {
  welcomeHref: string | null;
  methodHref: string | null;
  coursesHref: string | null;
}) {
  return (
    <section aria-labelledby="seu-caminho" className={cn(panelCard, 'gap-3')}>
      <h2 id="seu-caminho" className={sectionTitleClass}>
        Seu caminho no curso
      </h2>
      <ol className="flex flex-col divide-y divide-border">
        {PATH.map((step, index) => {
          const href = index === 0 ? welcomeHref : index === 1 ? methodHref : coursesHref;
          return (
            <li key={step.title} className="py-3.5">
              {href ? (
                <Link
                  className="flex min-h-14 items-center gap-3 rounded-2xl outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                  href={href}
                >
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-link"
                  >
                    <CirclePlay className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-body font-semibold text-foreground">{step.title}</span>
                    <span className="text-body text-pretty text-muted-foreground">
                      {index === 0
                        ? 'Assista à mensagem de boas-vindas.'
                        : index === 1
                          ? 'Veja as etapas do método.'
                          : 'Acesse os cursos complementares.'}
                    </span>
                  </span>
                </Link>
              ) : (
                <div className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground ring-1 ring-border"
                  >
                    <LockIcon className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5 pt-0.5">
                    <span className="text-body font-semibold text-foreground">
                      {step.title}
                      <span className="sr-only"> (bloqueado por enquanto)</span>
                    </span>
                    <span className="text-body text-pretty text-muted-foreground">
                      {step.detail}
                    </span>
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Leva às ferramentas conferidas do curso. */
export function SllToolsCard() {
  return (
    <section aria-labelledby="ferramentas" className={cn(panelCard, 'gap-3')}>
      <h2 id="ferramentas" className={sectionTitleClass}>
        Ferramentas
      </h2>
      <div className="flex items-center gap-3">
        <BookOpen aria-hidden="true" className="size-5 shrink-0 text-link" />
        <p className="flex-1 text-body text-muted-foreground">
          Calculadora, assistentes e parceiros recomendados.
        </p>
      </div>
      <Button asChild className="mt-2" variant="soft">
        <Link href="/sll/recursos">
          Acessar Recursos <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}

/** A conexão com a Shopee ainda não existe: o cartão diz "em breve", sem botão que finge. */
export function SllStoresCard() {
  return (
    <section aria-labelledby="minhas-lojas" className={cn(panelCard, 'gap-3')}>
      <h2 id="minhas-lojas" className={sectionTitleClass}>
        Minhas Lojas
      </h2>
      <div className="flex items-center gap-3">
        <Store aria-hidden="true" className="size-5 shrink-0 text-link" />
        <p className="flex-1 text-body text-muted-foreground">
          Em breve, suas lojas da Shopee aparecem aqui.
        </p>
      </div>
    </section>
  );
}
