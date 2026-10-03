import Link from 'next/link';
import type { ReactNode } from 'react';
import { FocusOnArrival } from '@/features/loja-pronta/components/focus-on-arrival';
import { MascotBubble } from '@/features/loja-pronta/components/mascot-bubble';
import { StickyAction } from '@/features/loja-pronta/components/sticky-action';
import { panelCard, sectionTitleClass } from '@/features/member/components/area-shell';
import { cn } from '@/lib/utils';
import type { LogoConfig } from '../logo/config';
import { logoPreviewSrc } from '../logo-preview';
import { finishBrand } from '../server/actions';
import { brandStepPath, type BrandStep } from '../steps';
import { BrandForm } from './brand-form';
import { FinishButton } from './finish-button';

const TITLE_ID = 'revisao-marca-titulo';

/** Passo 5: a marca inteira junta, cada parte com "Mudar", e a confirmação. */
export function BrandReview({
  name,
  logo,
  description,
}: {
  name: string;
  logo: LogoConfig;
  description: string;
}) {
  return (
    <>
      <MascotBubble
        title="Confira sua marca"
        help="Se quiser mudar alguma coisa, toque em Mudar."
        titleId={TITLE_ID}
      />
      <FocusOnArrival targetId={TITLE_ID} />
      <section aria-labelledby="sua-marca" className={cn(panelCard, 'gap-1')}>
        <h2 id="sua-marca" className={sectionTitleClass}>
          Sua marca
        </h2>
        <dl className="divide-y divide-border">
          <Row label="Logo" step="ajustar" what="o logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoPreviewSrc(logo)}
              alt={`Logo da loja ${name}`}
              width={160}
              height={160}
              className="mt-1 size-36 rounded-2xl border border-border"
            />
          </Row>
          <Row label="Nome da loja" step="nome" what="o nome">
            {name}
          </Row>
          <Row label="Texto da loja" step="descricao" what="o texto">
            <span className="font-normal">{description}</span>
          </Row>
        </dl>
      </section>
      <BrandForm action={finishBrand}>
        <StickyAction>
          <FinishButton />
        </StickyAction>
      </BrandForm>
    </>
  );
}

function Row({
  label,
  step,
  what,
  children,
}: {
  label: string;
  step: BrandStep;
  what: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-0.5 py-3">
      <dt className="col-start-1 text-sm text-muted-foreground">{label}</dt>
      <dd className="col-start-1 text-body font-semibold text-pretty wrap-anywhere">{children}</dd>
      <dd className="col-start-2 row-span-2 row-start-1">
        <Link
          href={`${brandStepPath(step)}?editar=1`}
          className="inline-flex min-h-11 items-center rounded-full px-2 font-semibold text-link outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
        >
          Mudar<span className="sr-only"> {what}</span>
        </Link>
      </dd>
    </div>
  );
}
