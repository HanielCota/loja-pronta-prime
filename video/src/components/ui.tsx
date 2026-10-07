import { ArrowRightIcon, ChevronLeftIcon, DoorOpenIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Img } from 'remotion';
import mascotStill from '@/components/brand/mascot/assets/mascote-rosto.png';
import { cn } from '@/lib/utils';

/**
 * Peças do app, redesenhadas com as mesmas classes (button.tsx, conversation-layout.tsx,
 * area-shell.tsx). Paradas: quem anima é a cena.
 */

/** O topo das áreas da aluna (site-navbar.tsx): a marca à esquerda e a inicial dela à direita. */
export function AppNavbar({ mobile }: { mobile: boolean }) {
  return (
    <header className="border-b-2 border-border bg-background">
      <div
        className={cn(
          'mx-auto flex min-h-16 w-full max-w-[1040px] items-center justify-between gap-4',
          mobile ? 'px-4' : 'px-6',
        )}
      >
        <span className="flex items-center gap-2 text-body font-semibold text-foreground">
          <Img src={mascotStill} alt="" className="size-8" />
          Loja Pronta Prime
        </span>
        <span className="grid size-10 place-items-center rounded-full bg-primary-soft text-body font-semibold text-link">
          A
        </span>
      </div>
    </header>
  );
}

/**
 * O cartão das áreas. As classes `sm:` do app não servem aqui (valem pela largura do vídeo, não
 * da tela desenhada), então o tamanho do celular vem por parâmetro.
 */
export const panelCard = (mobile: boolean) =>
  cn('flex flex-col rounded-card bg-card shadow-card', mobile ? 'p-6' : 'p-8');

export function AppButton({
  children,
  variant = 'default',
  pressed = 0,
  className,
  arrow = true,
}: {
  children: ReactNode;
  variant?: 'default' | 'soft' | 'off';
  /** 0 a 1: o "afundar" do toque (active:scale-[0.97] no app). */
  pressed?: number;
  className?: string;
  arrow?: boolean;
}) {
  return (
    <div
      className={cn(
        'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 py-2.5 text-body font-semibold',
        variant === 'default' && 'bg-primary text-primary-foreground',
        variant === 'soft' && 'bg-primary-soft text-link',
        variant === 'off' && 'bg-foreground/[0.07] text-foreground',
        className,
      )}
      style={{ transform: `scale(${1 - pressed * 0.03})` }}
    >
      {children}
      {arrow ? <ArrowRightIcon className="size-5" aria-hidden="true" /> : null}
    </div>
  );
}

/** A barra de segmentos da conversa (um por pergunta). `filled` pode ser fracionado (anima). */
export function Segments({
  total,
  filled,
  className,
}: {
  total: number;
  filled: number;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-1.5', className)}>
      {Array.from({ length: total }, (_, index) => (
        <div
          key={index}
          className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-progress-track"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-progress"
            style={{ width: `${Math.max(0, Math.min(1, filled - index)) * 100}%` }}
          />
        </div>
      ))}
    </div>
  );
}

/** O topo dos passo a passo: Voltar, "Pergunta X de Y" e Terminar depois, com a barra embaixo. */
export function StepTop({
  label,
  total,
  filled,
  mobile,
}: {
  label: string;
  total: number;
  filled: number;
  mobile: boolean;
}) {
  return (
    <div className={cn('flex w-full flex-col gap-2 pt-3', mobile ? 'px-4' : 'px-6')}>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span className="inline-flex min-h-11 items-center gap-1.5 text-body font-medium text-foreground">
          <ChevronLeftIcon className="size-5" aria-hidden="true" />
          Voltar
        </span>
        <span className="text-center text-body font-semibold">{label}</span>
        <span className="inline-flex min-h-11 items-center justify-end gap-1.5 text-body font-medium text-muted-foreground">
          <DoorOpenIcon className="size-5" aria-hidden="true" />
          {mobile ? 'Sair' : 'Terminar depois'}
        </span>
      </div>
      <Segments total={total} filled={filled} />
    </div>
  );
}
