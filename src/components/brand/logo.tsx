import { cn } from '@/lib/utils';
import { Mascot, type Expression } from './mascot';

type LogoProps = {
  className?: string;
  /** Expressão de repouso do mascote (ex.: preocupado numa página de erro). */
  expression?: Expression;
};

/** Mascote da marca (que acompanha o que a pessoa faz), centralizado. */
export function Logo({ className, expression }: LogoProps) {
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <Mascot className="size-33 shrink-0" expression={expression} />
      {/* Sem o nome na tela; leitores de tela ainda anunciam a marca. */}
      <span className="sr-only">Loja Pronta Prime</span>
    </div>
  );
}
