import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { panelCard, statusBadge } from '@/features/member/components/area-shell';

/**
 * Lista agrupada, como nos ajustes do iPhone: a linha inteira é o link, com ícone, nome, uma frase
 * e a seta. Sem botão por item, pra nada disputar com a ação principal da tela.
 */
export function SllGroupedList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <ul className={cn(panelCard, 'gap-0 p-2 sm:p-2', className)}>{children}</ul>;
}

/** Título curto acima de uma lista agrupada ("Calculadoras", "Sua loja"). */
export function SllGroupTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="px-2 text-body font-semibold text-foreground">
      {children}
    </h2>
  );
}

const ICON_TONES = {
  brand: 'bg-primary-soft text-link',
  muted: 'bg-muted text-muted-foreground',
  // A marca da plataforma: só o quadradinho, nunca um botão.
  shopee:
    'bg-shopee text-primary-foreground forced-colors:border forced-colors:border-[CanvasText]',
} as const;

export function SllRowIcon({
  children,
  tone = 'brand',
}: {
  children: ReactNode;
  tone?: keyof typeof ICON_TONES;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-xl [&_svg]:size-5',
        ICON_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

const rowClass = 'flex min-h-16 items-center gap-4 rounded-2xl px-4 py-3';
const linkRowClass = cn(
  rowClass,
  'group outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.99] motion-safe:transition-colors motion-safe:duration-150 motion-reduce:active:scale-100',
);

// Separador com recuo: começa no texto, não embaixo do ícone.
const separatorClass =
  'relative not-first:before:absolute not-first:before:top-0 not-first:before:right-4 not-first:before:left-18 not-first:before:h-px not-first:before:bg-border';

type SllListRowProps = {
  icon: ReactNode;
  iconTone?: keyof typeof ICON_TONES;
  title: ReactNode;
  detail?: ReactNode;
  /** Endereço interno ("/sll/...") ou externo ("https://..."); sem ele, a linha não é link. */
  href?: string | null;
  /** O que fica à direita quando a linha não é link, ou além da seta ("Em breve", situação). */
  badge?: ReactNode;
};

/** Uma linha da lista: interna com seta, externa com a seta pra fora e o aviso de nova aba. */
export function SllListRow({ icon, iconTone, title, detail, href, badge }: SllListRowProps) {
  const external = Boolean(href && !href.startsWith('/'));
  const content = (
    <>
      <SllRowIcon tone={iconTone ?? (href ? 'brand' : 'muted')}>{icon}</SllRowIcon>
      {/* No celular a etiqueta desce pra baixo do texto; à direita, ela espremia a frase. */}
      <span className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body font-semibold text-balance text-foreground">{title}</span>
          {detail ? (
            <span className="text-body text-pretty text-muted-foreground">{detail}</span>
          ) : null}
        </span>
        {badge ? <span className={cn(statusBadge, 'shrink-0')}>{badge}</span> : null}
      </span>
      {href ? <RowArrow external={external} /> : null}
    </>
  );

  return (
    <li className={separatorClass}>
      {!href ? <div className={rowClass}>{content}</div> : null}
      {href && external ? (
        <a className={linkRowClass} href={href} rel="noreferrer" target="_blank">
          {content}
          <span className="sr-only"> (abre em outra aba)</span>
        </a>
      ) : null}
      {href && !external ? (
        <Link className={linkRowClass} href={href}>
          {content}
        </Link>
      ) : null}
    </li>
  );
}

function RowArrow({ external }: { external: boolean }) {
  const Icon = external ? ArrowUpRight : ChevronRight;
  return (
    <Icon
      aria-hidden="true"
      className="size-5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-150 group-hover:motion-safe:translate-x-0.5"
    />
  );
}
