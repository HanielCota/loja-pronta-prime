import {
  CalculatorIcon,
  CheckIcon,
  GraduationCapIcon,
  LockIcon,
  MessagesSquareIcon,
  StoreIcon,
} from 'lucide-react';
import { Img, useCurrentFrame } from 'remotion';
import mascotStill from '@/components/brand/mascot/assets/mascote-rosto.png';
import { STORE_PHASES } from '@/config/store-phases';
import { storeStages } from '@/features/loja-pronta/stages';
import { cn } from '@/lib/utils';
import { useAnchors } from '../anchors';
import { DraftLogo } from '../components/draft-logo';
import { Mascot } from '../components/mascot';
import { Pointer } from '../components/pointer';
import { AppButton, panelCard } from '../components/ui';
import { lerp, pop, ramp } from '../motion';
import { Sfx } from '../sfx';
import { BAR, BEAT } from '../timeline';
import { STORE_NAME } from './nome';
import { FINAL_PICKS } from './estudio';

/**
 * As áreas de quem tem os dois produtos: a Loja Pronta (o caminho em 3 etapas, que avança quando
 * a marca fica pronta) e, pelo seletor do topo, o SLL. Textos de store-panel.tsx, stages.ts e
 * sll-area.tsx; as barras do caminho vêm de storeStages (a mesma conta do app).
 */

/** A marca fica pronta (fase 2 → 3) e, no fim, ela troca pro SLL. */
export const AREA_TIMES = { phase3: BEAT * 3, switchTap: BAR * 4, sllIn: BAR * 4 + 4 } as const;

const STAGES_BEFORE = storeStages(2);
const STAGES_AFTER = storeStages(3);

export function AreaScreen({ mobile }: { mobile: boolean }) {
  const frame = useCurrentFrame();
  const { container, mark, point } = useAnchors();
  const ready = ramp(frame, AREA_TIMES.phase3, AREA_TIMES.phase3 + 12);
  const toSll = ramp(frame, AREA_TIMES.sllIn, AREA_TIMES.sllIn + 12);
  // A página rola até o caminho (como ela faria) e volta pro topo antes da troca de área.
  const scroll =
    (ramp(frame, BEAT * 7, BEAT * 10) - ramp(frame, BEAT * 13, BEAT * 15)) * (mobile ? 420 : 150);

  const navbar = (
    <header className="border-b-2 border-border bg-background">
      <div
        className={cn(
          'mx-auto flex min-h-16 w-full max-w-[1040px] items-center justify-between gap-4',
          mobile ? 'px-4' : 'px-6',
        )}
      >
        <span className="flex items-center gap-2 text-body font-semibold text-foreground">
          <Img src={mascotStill} className="size-8" />
          Loja Pronta Prime
        </span>
        <span className="grid size-10 place-items-center rounded-full bg-primary-soft text-body font-semibold text-link">
          A
        </span>
      </div>
    </header>
  );

  const switcher = (
    <ul className="inline-flex max-w-full gap-1 self-start rounded-full bg-segment p-1">
      {[
        { id: 'loja', label: 'Loja Pronta', Icon: StoreIcon },
        { id: 'sll', label: 'SLL', Icon: GraduationCapIcon },
      ].map(({ id, label, Icon }) => {
        const on = id === 'loja' ? frame < AREA_TIMES.switchTap : frame >= AREA_TIMES.switchTap;
        return (
          <li
            key={id}
            ref={mark(`area:${id}`)}
            className={cn(
              'flex min-h-11 items-center gap-2 rounded-full px-4 text-body font-semibold whitespace-nowrap',
              on ? 'bg-segment-thumb text-foreground shadow-sm' : 'text-muted-foreground',
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </li>
        );
      })}
    </ul>
  );

  const logoSize = mobile ? 112 : 144;
  const loja = (
    <>
      <div className="flex flex-col gap-2">
        {switcher}
        <h1 className={cn('font-semibold text-balance', mobile ? 'text-title' : 'text-title-lg')}>
          {ready < 0.5 ? 'Vamos montar sua loja?' : STORE_NAME}
        </h1>
        {ready >= 0.5 ? (
          <p className="text-body text-muted-foreground">Sua loja na Shopee</p>
        ) : null}
      </div>

      <section className={cn(panelCard(mobile), mobile ? 'gap-6' : 'flex-row items-center gap-8')}>
        <div
          className="relative flex shrink-0 justify-center"
          style={{ width: mobile ? undefined : logoSize, height: logoSize }}
        >
          <div
            style={{ opacity: 1 - ready, transform: `scale(${1 - ready * 0.3})` }}
            className="absolute"
          >
            <Mascot
              size={logoSize}
              expressions={[{ at: 0, value: 'happy' }]}
              blinks={[25]}
              gaze={[{ at: 0, value: { x: 0.3, y: 0.2 } }]}
            />
          </div>
          <div
            className="absolute"
            style={{
              opacity: ready,
              transform: `scale(${lerp(0.6, 1, pop(frame, AREA_TIMES.phase3, { bounce: true }))})`,
            }}
          >
            <DraftLogo
              picks={FINAL_PICKS}
              storeName={STORE_NAME}
              className={cn('rounded-3xl border border-border', mobile ? 'size-28' : 'size-36')}
            />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold tracking-wide text-progress-text uppercase">
            {ready < 0.5 ? 'Etapa 2 de 3' : 'Etapa 3 de 3'}
          </span>
          <h2
            className={cn(
              'font-semibold tracking-tight text-balance',
              mobile ? 'text-2xl' : 'text-3xl',
            )}
          >
            {ready < 0.5 ? 'Crie a marca da sua loja' : STORE_PHASES[2]!.title}
          </h2>
          <p className="max-w-[60ch] text-body text-pretty text-foreground/80">
            {ready < 0.5
              ? 'Escolha o nome, crie o logo escolhendo vendo (a nossa IA desenha) e defina o texto da loja.'
              : 'É lá que a sua loja vai ficar. A conta é sua, no seu nome, e leva uns 15 minutos.'}
          </p>
          <AppButton className={cn(!mobile && 'w-auto self-start px-8')}>
            {ready < 0.5 ? 'Continuar minha marca' : 'Abrir minha conta na Shopee'}
          </AppButton>
        </div>
      </section>

      <section className={cn(panelCard(mobile), 'gap-5')}>
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Seu caminho
        </h2>
        <ol className={cn(mobile ? 'flex flex-col gap-6' : 'grid grid-cols-3 gap-6')}>
          {STAGES_AFTER.map((after, index) => {
            const before = STAGES_BEFORE[index]!;
            const stage = ready >= 0.5 ? after : before;
            const fill = lerp(
              before.fill,
              after.fill,
              ramp(frame, AREA_TIMES.phase3, AREA_TIMES.phase3 + 20),
            );
            return (
              <li key={after.title} className="flex flex-col gap-1">
                <div className="relative mb-2 h-2.5 overflow-hidden rounded-full border border-input bg-progress-track">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-progress"
                    style={{ width: `${fill * 100}%` }}
                  />
                </div>
                <span
                  className={cn(
                    'inline-flex items-start gap-1.5 text-body font-semibold',
                    stage.status === 'current' && 'text-progress-text',
                    stage.status === 'next' && 'text-muted-foreground',
                  )}
                >
                  {stage.status === 'done' ? (
                    <CheckIcon
                      className="mt-1 size-4 text-progress"
                      aria-hidden="true"
                      style={
                        index === 1
                          ? {
                              transform: `scale(${pop(frame, AREA_TIMES.phase3 + 8, { bounce: true })})`,
                            }
                          : undefined
                      }
                    />
                  ) : null}
                  {stage.title}
                </span>
                <span className="text-body text-muted-foreground">{stage.detail}</span>
                {stage.step ? (
                  <span className="text-sm font-semibold text-progress-text">{stage.step}</span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );

  const courseRows = [
    { title: 'Trilha de boas-vindas', detail: 'Como o curso funciona.', open: true },
    {
      title: 'Método em 3 Etapas',
      detail: 'Cada etapa abre quando você conclui a anterior.',
      open: false,
    },
    { title: 'Minicursos', detail: 'Temas extras depois do método.', open: false },
  ];
  const sll = (
    <>
      <div className="flex flex-col gap-2">
        {switcher}
        <h1 className={cn('font-semibold text-balance', mobile ? 'text-title' : 'text-title-lg')}>
          As aulas abrem em breve
        </h1>
        <p className="max-w-[60ch] text-body text-muted-foreground">
          O curso começa pela trilha de boas-vindas. Você recebe um aviso quando ela abrir.
        </p>
      </div>
      <div
        className={cn(
          'grid items-start gap-6',
          !mobile && 'grid-cols-[minmax(0,3fr)_minmax(0,2fr)]',
        )}
      >
        <section className={cn(panelCard(mobile), 'gap-3')}>
          <h2 className="text-body font-semibold text-foreground">Seu caminho no curso</h2>
          <ol className="flex flex-col divide-y divide-border">
            {courseRows.map((row, index) => {
              const t = pop(frame, AREA_TIMES.sllIn + 8 + index * 5);
              return (
                <li
                  key={row.title}
                  className="flex gap-3 py-3.5"
                  style={{ opacity: t, transform: `translateY(${(1 - t) * 14}px)` }}
                >
                  <span
                    className={cn(
                      'grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold',
                      row.open
                        ? 'bg-primary-soft text-link'
                        : 'bg-muted text-muted-foreground ring-1 ring-border',
                    )}
                  >
                    {row.open ? '1' : <LockIcon className="size-4" aria-hidden="true" />}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-body font-semibold">{row.title}</span>
                    <span className="text-body text-muted-foreground">{row.detail}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
        <section className={cn(panelCard(mobile), 'gap-3')}>
          <h2 className="text-body font-semibold text-foreground">Ferramentas</h2>
          <ul className="flex flex-col divide-y divide-border">
            {[
              { label: 'Calculadora de preço da Shopee', Icon: CalculatorIcon },
              { label: 'Assistentes de IA', Icon: MessagesSquareIcon },
            ].map(({ label, Icon }) => (
              <li key={label} className="flex items-center gap-3 py-3.5">
                <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="flex-1 text-body">{label}</span>
                <span className="text-sm text-muted-foreground">Em breve</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );

  const main = cn(
    'mx-auto flex w-full max-w-[1040px] flex-col',
    mobile ? 'gap-6 px-4 pt-6 pb-12' : 'gap-7 px-6 pt-7 pb-12',
  );
  return (
    <div ref={container} className="relative size-full">
      <div style={{ transform: `translateY(${-scroll}px)` }}>
        {navbar}
        <div className="relative">
          <main className={main} style={{ opacity: 1 - toSll }}>
            {loja}
          </main>
          {toSll > 0 ? (
            <main className={cn(main, 'absolute inset-x-0 top-0')} style={{ opacity: toSll }}>
              {sll}
            </main>
          ) : null}
        </div>
      </div>
      <Pointer
        path={[
          { at: AREA_TIMES.switchTap - BEAT * 3, x: mobile ? 300 : 700, y: mobile ? 500 : 420 },
          { at: AREA_TIMES.switchTap - 10, ...point('area:sll', 0.5, 0.55) },
          { at: AREA_TIMES.sllIn + BEAT * 3, x: mobile ? 340 : 1060, y: mobile ? 680 : 640 },
        ]}
        taps={[AREA_TIMES.switchTap]}
      />
      <Sfx name="check-2" at={AREA_TIMES.phase3 + 6} volume={0.4} />
      <Sfx name="success" at={AREA_TIMES.phase3 + 2} volume={0.32} />
      <Sfx name="tap-3" at={AREA_TIMES.switchTap} volume={0.5} />
      <Sfx name="swipe-1" at={AREA_TIMES.sllIn} volume={0.2} />
    </div>
  );
}
