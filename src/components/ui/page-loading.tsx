import { cn } from '@/lib/utils';

const bar =
  'rounded-full motion-safe:animate-pulse forced-colors:border forced-colors:border-[CanvasText]';

/**
 * O conteúdo de uma página enquanto ela carrega (pelo `NavigationPending` das áreas). A moldura (menu
 * lateral, barra do topo) fica parada; aqui, só um esboço calmo do título e de dois cartões, pra
 * ela ver na hora que o toque funcionou. Só aparece se a espera passar de um instante (troca
 * rápida não pisca), só pulsa sem "Reduzir animações", e o leitor de tela ouve "Carregando…".
 */
export function PageLoading({ className }: { className?: string | undefined }) {
  return (
    <div className={cn('flex animate-loading-appear flex-col gap-8', className)}>
      <output className="sr-only">Carregando…</output>
      <div aria-hidden="true" className="flex flex-col gap-3">
        <div className={cn(bar, 'h-9 w-2/3 max-w-md bg-border/50 sm:h-11')} />
        <div className={cn(bar, 'h-6 w-full max-w-[40ch] bg-border/50')} />
      </div>
      <div aria-hidden="true" className="grid items-start gap-6 lg:grid-cols-2">
        {[0, 1].map((card) => (
          <div
            key={card}
            className="flex flex-col gap-4 rounded-card bg-card p-6 shadow-card sm:p-8 forced-colors:border forced-colors:border-[CanvasText]"
          >
            <div className={cn(bar, 'h-6 w-1/2 bg-muted')} />
            <div className={cn(bar, 'h-5 w-full bg-muted')} />
            <div className={cn(bar, 'h-5 w-5/6 bg-muted')} />
            <div className={cn(bar, 'mt-2 h-11 w-40 bg-muted')} />
          </div>
        ))}
      </div>
    </div>
  );
}
