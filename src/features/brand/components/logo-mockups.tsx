import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const TITLE_ID = 'logo-por-ai';

/**
 * "Como fica por aí": o logo dela onde a cliente vai ver (o perfil na Shopee, a caixa que chega,
 * o cartão de agradecimento). Só desenho: o logo em si já está descrito na prévia grande, então
 * as imagens aqui ficam com texto alternativo vazio e cada uma diz em palavras onde está.
 */
export function LogoMockups({ src, storeName }: { src: string; storeName: string }) {
  return (
    <section aria-labelledby={TITLE_ID} className="flex flex-col gap-3">
      <h2 id={TITLE_ID} className="text-body font-semibold">
        Como fica por aí
      </h2>
      <ul className="grid grid-cols-3 gap-2 sm:gap-3">
        <Mockup caption="Na Shopee">
          <div className="flex size-full flex-col items-center justify-center gap-1.5 bg-card p-2">
            <Logo src={src} className="size-12 rounded-full border border-border" />
            <span className="line-clamp-2 w-full text-center text-sm leading-tight font-semibold wrap-anywhere">
              {storeName}
            </span>
          </div>
        </Mockup>
        <Mockup caption="Na caixa">
          {/* Papelão, com a fita por cima e a etiqueta dela no meio. */}
          <div className="relative flex size-full items-center justify-center bg-[#d8b98f] forced-colors:bg-[Canvas]">
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-3 bg-[#c9a676] forced-colors:bg-[Canvas]"
            />
            <Logo src={src} className="size-[58%] rounded-md shadow-sm" />
          </div>
        </Mockup>
        <Mockup caption="No cartão">
          <div className="flex size-full flex-col items-center justify-center gap-1 bg-card p-2">
            <Logo src={src} className="size-[52%]" />
            <span className="text-center text-sm leading-tight text-muted-foreground">
              Obrigada!
            </span>
          </div>
        </Mockup>
      </ul>
    </section>
  );
}

function Mockup({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <li className="flex min-w-0 flex-col gap-1.5">
      <div className="aspect-square overflow-hidden rounded-2xl border border-border">
        {children}
      </div>
      <span className="text-center text-sm text-muted-foreground">{caption}</span>
    </li>
  );
}

function Logo({ src, className }: { src: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={96} height={96} className={cn('bg-card', className)} />
  );
}
