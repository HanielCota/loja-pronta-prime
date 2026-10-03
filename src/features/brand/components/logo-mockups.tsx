import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const TITLE_ID = 'logo-por-ai';

/**
 * "Como fica por aí": o logo dela onde a cliente vai ver (o perfil na Shopee, a caixa que chega,
 * o cartão de agradecimento). O logo ocupa a maior parte de cada quadro, pra dar pra ler. Só
 * desenho: o logo em si já está descrito na prévia grande, então as imagens aqui ficam com texto
 * alternativo vazio e cada uma diz em palavras onde está.
 */
export function LogoMockups({
  src,
  storeName,
  hideTitle = false,
}: {
  src: string;
  storeName: string;
  /** Sem o título visível (quando quem abre já diz o que é, como o "Ver como fica por aí"). */
  hideTitle?: boolean;
}) {
  return (
    <section aria-labelledby={TITLE_ID} className="flex flex-col gap-3">
      <h2 id={TITLE_ID} className={hideTitle ? 'sr-only' : 'text-body font-semibold'}>
        Como fica por aí
      </h2>
      <ul className="grid grid-cols-3 gap-2 sm:gap-3">
        <Mockup caption="Na Shopee" detail={storeName}>
          {/* O perfil: a capa colorida em cima e o logo redondo sobre ela. */}
          <div className="flex size-full flex-col items-center bg-card">
            <span
              aria-hidden="true"
              className="h-[30%] w-full shrink-0 bg-[#ee4d2d] forced-colors:bg-[Canvas]"
            />
            <Logo
              src={src}
              className="-mt-[22%] size-[62%] rounded-full border-2 border-card shadow-sm"
            />
          </div>
        </Mockup>
        <Mockup caption="Na caixa">
          {/* Papelão, com a fita por cima e a etiqueta dela no meio. */}
          <div className="relative flex size-full items-center justify-center bg-[#d8b98f] forced-colors:bg-[Canvas]">
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-3 bg-[#c9a676] forced-colors:bg-[Canvas]"
            />
            <Logo src={src} className="size-[72%] rounded-md shadow-sm" />
          </div>
        </Mockup>
        <Mockup caption="No cartão">
          <div className="flex size-full flex-col items-center justify-center gap-0.5 bg-card p-1.5">
            <Logo src={src} className="size-[70%]" />
            <span className="text-center text-sm leading-tight text-muted-foreground">
              Obrigada!
            </span>
          </div>
        </Mockup>
      </ul>
    </section>
  );
}

/** `detail`: só pro leitor de tela (na Shopee, o nome da loja, que o desenho não repete). */
function Mockup({
  caption,
  detail,
  children,
}: {
  caption: string;
  detail?: string;
  children: ReactNode;
}) {
  return (
    <li className="flex min-w-0 flex-col gap-1.5">
      <div className="aspect-square overflow-hidden rounded-2xl border border-border">
        {children}
      </div>
      <span className="text-center text-sm text-muted-foreground">
        {caption}
        {detail ? <span className="sr-only">, {detail}</span> : null}
      </span>
    </li>
  );
}

function Logo({ src, className }: { src: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={160} height={160} className={cn('bg-card', className)} />
  );
}
