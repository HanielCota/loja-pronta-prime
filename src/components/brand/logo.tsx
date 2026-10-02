import { cn } from '@/lib/utils';
import { Mascot, type Expression } from './mascot';

type LogoProps = {
  className?: string;
  /** Expressão de repouso do mascote (ex.: preocupado numa página de erro). */
  expression?: Expression;
  /** Mascote menor, pras telas de dentro (o conteúdo é o destaque, não a marca). */
  compact?: boolean;
};

/** Mascote da marca (que acompanha o que a pessoa faz), centralizado. */
export function Logo({ className, expression, compact }: LogoProps) {
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <Mascot
        className={cn('shrink-0', compact ? 'size-20 short:size-16' : 'size-33 short:size-20')}
        displaySize={compact ? 80 : undefined}
        expression={expression}
      />
      {/* Sem o nome na tela; leitores de tela ainda anunciam a marca. */}
      <span className="sr-only">Loja Pronta Prime</span>
    </div>
  );
}
