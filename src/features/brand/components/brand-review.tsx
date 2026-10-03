import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { FocusOnArrival } from '@/features/loja-pronta/components/focus-on-arrival';
import { MascotBubble } from '@/features/loja-pronta/components/mascot-bubble';
import { StickyAction } from '@/features/loja-pronta/components/sticky-action';
import { panelCard, sectionTitleClass } from '@/features/member/components/area-shell';
import { cn } from '@/lib/utils';
import { finishBrand } from '../server/actions';
import { brandStepPath, LOGO_EDITOR_PATH } from '../steps';
import { BrandForm } from './brand-form';
import { FinishButton } from './finish-button';

const TITLE_ID = 'revisao-marca-titulo';

/**
 * Passo 5: a marca inteira junta, cada parte com "Mudar", e a confirmação. `revising`: a marca já
 * foi confirmada e ela voltou pra rever; cada mudança já fica salva, e o botão só leva de volta.
 */
export function BrandReview({
  name,
  logoSrc,
  freeEdited = false,
  description,
  revising = false,
}: {
  name: string;
  /** A imagem do logo salvo (savedLogoSrc). */
  logoSrc: string;
  /** Montado no editor livre: "Mudar" volta pra ele, não pro estúdio guiado. */
  freeEdited?: boolean;
  description: string;
  revising?: boolean;
}) {
  return (
    <>
      <MascotBubble
        title={revising ? 'Sua marca' : 'Confira sua marca'}
        help={
          revising
            ? 'Toque em Mudar pra trocar alguma parte. O que você muda já fica salvo.'
            : 'Se quiser mudar alguma coisa, toque em Mudar.'
        }
        titleId={TITLE_ID}
      />
      <FocusOnArrival targetId={TITLE_ID} />
      <section aria-labelledby="sua-marca" className={cn(panelCard, 'gap-1')}>
        <h2 id="sua-marca" className={sectionTitleClass}>
          Sua marca
        </h2>
        <dl className="divide-y divide-border">
          <Row
            label="Logo"
            href={`${freeEdited ? LOGO_EDITOR_PATH : brandStepPath('ajustar')}?editar=1`}
            what="o logo"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt={`Logo da loja ${name}`}
              width={160}
              height={160}
              className="mt-1 size-36 rounded-2xl border border-border"
            />
          </Row>
          <Row label="Nome da loja" href={`${brandStepPath('nome')}?editar=1`} what="o nome">
            {name}
          </Row>
          <Row label="Texto da loja" href={`${brandStepPath('descricao')}?editar=1`} what="o texto">
            <span className="font-normal">{description}</span>
          </Row>
        </dl>
      </section>
      {revising ? (
        <StickyAction>
          <Button asChild>
            <Link href="/loja-pronta">Voltar pra Loja Pronta</Link>
          </Button>
        </StickyAction>
      ) : (
        <BrandForm action={finishBrand}>
          <StickyAction>
            <FinishButton />
          </StickyAction>
        </BrandForm>
      )}
    </>
  );
}

function Row({
  label,
  href,
  what,
  children,
}: {
  label: string;
  href: string;
  what: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-0.5 py-3">
      <dt className="col-start-1 text-sm text-muted-foreground">{label}</dt>
      <dd className="col-start-1 text-body font-semibold text-pretty wrap-anywhere">{children}</dd>
      <dd className="col-start-2 row-span-2 row-start-1">
        <Link
          href={href}
          className="inline-flex min-h-11 items-center rounded-full px-2 font-semibold text-link outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
        >
          Mudar<span className="sr-only"> {what}</span>
        </Link>
      </dd>
    </div>
  );
}
