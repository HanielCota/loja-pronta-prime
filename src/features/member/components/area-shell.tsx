import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Breadcrumb, type Crumb } from './breadcrumb';
import type { ProductId } from '@/config/products';
import { AreaSwitcher } from './area-switcher';
import { MemberNavbar, type NavbarAccount } from './member-navbar';

/** Cartão branco das áreas; no alto contraste, a borda desenha o que a sombra desenhava. */
export const panelCard =
  'flex flex-col rounded-card bg-card p-6 shadow-card sm:p-8 forced-colors:border forced-colors:border-[CanvasText]';
/** Título de seção dentro de um cartão ("Ferramentas", "Seu caminho no curso"). */
export const sectionTitleClass = 'text-body font-semibold text-foreground';

/**
 * Saudação das áreas, a mesma em todas: "Boas-vindas, Ana!" na primeira visita, seguida do que a
 * página mostra. Depois, só o que a página mostra: ela já foi cumprimentada na escolha de área.
 */
export function greeting(name: string, firstVisit: boolean, rest: string): string {
  if (!firstVisit) return rest;
  return `Boas-vindas${name ? `, ${name}` : ''}! ${rest}`;
}

type AreaShellProps = {
  /** Quem está logada (a barra do topo). */
  account: NavbarAccount;
  /**
   * Tem os dois produtos: nas áreas (`area`), o seletor das duas fica acima do título; fora delas
   * (o perfil), a trilha leva de volta pra escolha.
   */
  hasChoice: boolean;
  /** A área de produto em que ela está (a Loja Pronta ou o SLL). */
  area?: ProductId | undefined;
  /** Nome do produto, em cima do título (sem ele, o título fala sozinho). */
  product?: string | undefined;
  /** Nome da página na trilha ("Início › Loja Pronta"); sem ele, o produto ou o título. */
  crumb?: string | undefined;
  /** O assunto da área (o nome da loja, "As aulas abrem em breve"). */
  title: string;
  /** A saudação e o que a página mostra (opcional). */
  intro?: string | undefined;
  /** Cabeçalho próprio no lugar do título (o perfil mostra quem ela é); o título fica na trilha. */
  header?: ReactNode;
  /** Uma coluna estreita, de lista de ajustes (o perfil), em vez da largura das áreas. */
  narrow?: boolean;
  children: ReactNode;
};

const START: Crumb = { href: '/', label: 'Início' };

/**
 * Moldura das áreas dos produtos (Loja Pronta e SLL) e do perfil: a barra do topo, a trilha (ou o
 * nome do produto) acima do título, onde ela está, e o conteúdo.
 */
export function AreaShell({
  account,
  hasChoice,
  area,
  product,
  crumb,
  title,
  intro,
  header,
  narrow,
  children,
}: AreaShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <MemberNavbar account={account} />
      <main
        className={cn(
          'mx-auto flex w-full flex-col gap-8 px-4 pt-6 pb-12 sm:px-6 sm:pt-8',
          narrow ? 'max-w-[688px]' : 'max-w-[1040px]',
        )}
      >
        <div className="flex flex-col gap-2">
          {/* Com os dois produtos, o seletor (ou a trilha) já diz onde ela está: o nome não se repete. */}
          {hasChoice && area ? (
            <AreaSwitcher current={area} />
          ) : hasChoice ? (
            <Breadcrumb trail={[START]} current={crumb ?? product ?? title} />
          ) : product ? (
            <p className="text-body font-medium text-muted-foreground">{product}</p>
          ) : null}
          {header ?? (
            <>
              <h1 className="text-title font-semibold text-balance sm:text-title-lg">{title}</h1>
              {intro ? (
                <p className="max-w-[60ch] text-body text-pretty text-muted-foreground">{intro}</p>
              ) : null}
            </>
          )}
        </div>
        {children}
      </main>
    </div>
  );
}

/**
 * Telas de dentro com o conteúdo no meio (a escolha de área, o aviso de acesso não liberado): o
 * mesmo topo das áreas, e o conteúdo centralizado no espaço que sobra.
 */
export function CenteredMemberPage({
  account,
  children,
  wide,
  trail,
  current,
}: {
  account: NavbarAccount;
  children: ReactNode;
  wide?: boolean;
  /** Os passos antes desta página na trilha (sem eles, não há trilha). */
  trail?: Crumb[] | undefined;
  /** O nome desta página na trilha. */
  current?: string | undefined;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <MemberNavbar account={account} />
      {trail && current ? (
        // No topo, alinhada com a marca: o conteúdo abaixo fica no meio da tela.
        <div className="mx-auto w-full max-w-[1040px] px-4 pt-6 sm:px-6 sm:pt-8">
          <Breadcrumb trail={trail} current={current} />
        </div>
      ) : null}
      <main
        className={cn(
          'mx-auto flex w-full flex-1 flex-col justify-center gap-6 px-4 py-8 sm:px-6 sm:py-12',
          wide ? 'max-w-[1040px]' : 'max-w-[512px] lg:max-w-[688px]',
        )}
      >
        {children}
      </main>
    </div>
  );
}
