'use client';

import { ArrowRightIcon, CheckIcon } from 'lucide-react';
import { useActionState, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { nodMascot, upsetMascot } from '@/components/brand/mascot';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { PERSONAL_TOUCH_MAX, STORE_NAME_MAX, type OnboardingQuestion } from '@/config/onboarding';
import { submitWithoutReset } from '@/features/auth/enhanced-submit';
import { cn } from '@/lib/utils';
import { saveAnswer } from '../server/actions';
import { UNKNOWN_NAME } from '../steps';

type QuestionFormProps = {
  question: OnboardingQuestion;
  /** Resposta já salva (ela voltou ou veio editar). */
  saved: string | string[] | null | undefined;
  /** Veio da revisão: salvar leva de volta pra ela. */
  editing: boolean;
  /** Ids do título e da ajuda (no balão do mascote), que nomeiam e descrevem o grupo. */
  titleId: string;
  helpId?: string;
};

/** Contorno de foco e estado escolhido das opções (o `<input>` fica escondido dentro do rótulo). */
const optionFocus =
  'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-focus-visible:outline-solid';
const optionChecked =
  'has-checked:border-primary has-checked:bg-primary-soft forced-colors:has-checked:border-[Highlight]';

/**
 * Uma pergunta da conversa. Formulário de verdade: sem JavaScript, o botão envia e o servidor
 * confere. Com JavaScript:
 * - escolha única avança sozinha ao tocar ou clicar na opção (pelo teclado não: as setas trocam
 *   a opção marcada, e avançar a cada seta tiraria a pessoa da pergunta);
 * - escolha múltipla trava as outras opções quando chega no máximo e diz quantas faltam;
 * - nada é enviado com a pergunta incompleta: o aviso aparece na hora.
 */
export function QuestionForm({ question, saved, editing, titleId, helpId }: QuestionFormProps) {
  const [state, formAction, pending] = useActionState(saveAnswer, undefined);
  const [clientError, setClientError] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);
  // Última interação: toque/clique (pode avançar sozinho) ou teclado (não avança).
  const pointerRef = useRef(false);
  // Avanço automático agendado (um só: um toque novo troca o anterior) e envio em andamento
  // (o `pending` do render pode estar velho dentro do timer).
  const advanceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sendingRef = useRef(false);
  useEffect(() => {
    sendingRef.current = pending;
  }, [pending]);
  const errorId = useId();
  const hintId = useId();
  const error = clientError ?? state?.error;

  useEffect(() => {
    if (state?.error) upsetMascot('worried');
  }, [state]);

  // Saiu da pergunta (voltar, continuar depois) antes do avanço: não envia nada.
  useEffect(() => () => clearTimeout(advanceRef.current), []);

  useEffect(() => {
    const fromPointer = () => (pointerRef.current = true);
    const fromKeyboard = () => (pointerRef.current = false);
    window.addEventListener('pointerdown', fromPointer, { capture: true });
    window.addEventListener('keydown', fromKeyboard, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', fromPointer, { capture: true });
      window.removeEventListener('keydown', fromKeyboard, { capture: true });
    };
  }, []);

  const [selected, setSelected] = useState<string[]>(
    Array.isArray(saved) ? saved : typeof saved === 'string' && saved ? [saved] : [],
  );
  const [unknownName, setUnknownName] = useState(question.kind === 'name' && saved === null);
  const [text, setText] = useState(typeof saved === 'string' ? saved : '');

  function validate(event: { preventDefault: () => void }) {
    // Já salvando (Enter duas vezes, toque e clique juntos): um envio só.
    if (sendingRef.current) {
      event.preventDefault();
      return;
    }
    clearTimeout(advanceRef.current);
    const message = missingAnswer();
    if (message) {
      event.preventDefault();
      setClientError(message);
      upsetMascot('worried');
    }
  }

  function missingAnswer(): string | undefined {
    switch (question.kind) {
      case 'single':
      case 'color':
        return selected.length ? undefined : 'Escolha uma opção.';
      case 'multi':
        return selected.length ? undefined : 'Escolha pelo menos uma opção.';
      case 'name':
        return unknownName || text.trim()
          ? undefined
          : `Escreva o nome da loja ou marque "${UNKNOWN_NAME}".`;
      case 'longtext':
        return undefined;
    }
  }

  function choose(value: string, checked: boolean) {
    // Salvando: a escolha já foi enviada. Ignorar o toque (o campo controlado volta ao que
    // estava) é melhor que mostrar uma opção marcada que não seria salva.
    if (pending) return;
    setClientError(undefined);
    const single = question.kind === 'single' || question.kind === 'color';
    setSelected((current) =>
      single ? [value] : checked ? [...current, value] : current.filter((item) => item !== value),
    );
    if (!checked) return;
    nodMascot();
    // Escolha única pelo toque/clique: mostra a marcação por um instante e segue.
    if (single && pointerRef.current) {
      clearTimeout(advanceRef.current);
      advanceRef.current = setTimeout(() => {
        if (!sendingRef.current) formRef.current?.requestSubmit();
      }, 250);
    }
  }

  const max = question.kind === 'multi' ? question.max : 1;
  // Escolha única avança sozinha ao tocar (WCAG 3.2.2: avisar antes de mudar de página); o texto
  // livre mostra quanto ainda cabe. As duas notas descrevem o campo, junto com a ajuda.
  const autoAdvance = question.kind === 'single' || question.kind === 'color';
  const hasHint = autoAdvance || question.kind === 'longtext';
  const describedBy =
    [helpId, hasHint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;

  let body: ReactNode;
  switch (question.kind) {
    case 'single':
    case 'multi':
    case 'color': {
      const isMulti = question.kind === 'multi';
      const layout =
        question.kind === 'color' ? 'color' : question.kind === 'multi' ? question.layout : 'list';
      body = (
        <fieldset
          aria-labelledby={titleId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cn(
            'm-0 min-w-0 border-0 p-0',
            layout === 'list' && 'flex flex-col gap-2.5',
            layout === 'chips' && 'flex flex-wrap gap-2.5',
            layout === 'color' && 'grid grid-cols-3 gap-2',
          )}
        >
          {question.options.map((option) => {
            const checked = selected.includes(option.label);
            const locked = isMulti && !checked && selected.length >= max;
            const input = (
              <input
                type={isMulti ? 'checkbox' : 'radio'}
                name="value"
                value={option.label}
                checked={checked}
                disabled={locked}
                onChange={(event) => choose(option.label, event.target.checked)}
                className="sr-only"
              />
            );
            if (layout === 'color' && option.color) {
              return (
                <label
                  key={option.label}
                  className={cn(
                    'group/opt flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-[1.5px] border-transparent px-1 py-3 text-body font-medium',
                    optionFocus,
                    optionChecked,
                  )}
                >
                  {input}
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: option.color }}
                    className="grid size-12 place-items-center rounded-full text-white ring-1 ring-black/10 forced-colors:border forced-colors:border-[CanvasText]"
                  >
                    <CheckIcon className="hidden size-6 group-has-checked/opt:block" />
                  </span>
                  {option.label}
                </label>
              );
            }
            if (layout === 'chips' || layout === 'color') {
              return (
                <label
                  key={option.label}
                  className={cn(
                    'group/opt inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-input bg-card px-4 text-body font-medium transition-colors duration-100',
                    'has-disabled:cursor-not-allowed has-disabled:opacity-50',
                    layout === 'color' && 'col-span-3 justify-self-start',
                    optionFocus,
                    optionChecked,
                  )}
                >
                  {input}
                  <CheckIcon
                    aria-hidden="true"
                    className="hidden size-4 text-link group-has-checked/opt:block"
                  />
                  {option.label}
                </label>
              );
            }
            return (
              <label
                key={option.label}
                className={cn(
                  'group/opt flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] border-input bg-card px-4 py-3 text-body font-medium transition-[background-color,border-color,transform] duration-100 active:scale-[0.98] motion-reduce:active:scale-100',
                  'has-disabled:cursor-not-allowed has-disabled:opacity-50',
                  optionFocus,
                  optionChecked,
                )}
              >
                {input}
                <span className="flex flex-1 flex-col gap-0.5">
                  {option.label}
                  {option.description ? (
                    // Marcada, o fundo azul-claro tira contraste do cinza: o texto escurece.
                    <span className="font-normal text-muted-foreground group-has-checked/opt:text-foreground/80">
                      {option.description}
                    </span>
                  ) : null}
                </span>
                {/* O mesmo círculo pra uma ou várias opções (como nas listas da Apple): a pergunta
                    diz quantas dá pra marcar, e o leitor de tela anuncia o tipo de campo. */}
                <span
                  aria-hidden="true"
                  className="grid size-6 shrink-0 place-items-center rounded-full border-[1.5px] border-muted-foreground text-primary-foreground group-has-checked/opt:border-primary group-has-checked/opt:bg-primary"
                >
                  <CheckIcon className="hidden size-4 group-has-checked/opt:block" />
                </span>
              </label>
            );
          })}
        </fieldset>
      );
      break;
    }
    case 'name':
      body = (
        <div className="flex flex-col gap-3">
          <FloatingLabelInput
            id="nome-da-loja"
            name="value"
            label="Nome da loja"
            autoComplete="off"
            maxLength={STORE_NAME_MAX}
            value={unknownName ? '' : text}
            disabled={unknownName}
            onChange={(event) => {
              setText(event.target.value);
              setClientError(undefined);
            }}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
          />
          <label
            className={cn(
              'group/opt inline-flex min-h-11 cursor-pointer items-center gap-1.5 self-start rounded-full border-[1.5px] border-input bg-card px-4 text-body font-medium',
              optionFocus,
              optionChecked,
            )}
          >
            <input
              type="checkbox"
              name="unknown"
              value="1"
              checked={unknownName}
              onChange={(event) => {
                setUnknownName(event.target.checked);
                setClientError(undefined);
              }}
              className="sr-only"
            />
            <CheckIcon
              aria-hidden="true"
              className="hidden size-4 text-link group-has-checked/opt:block"
            />
            {UNKNOWN_NAME}
          </label>
        </div>
      );
      break;
    case 'longtext':
      body = (
        <div className="flex flex-col gap-2">
          <label htmlFor="toque-pessoal" className="text-body font-semibold">
            Seu toque pessoal <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <textarea
            id="toque-pessoal"
            name="value"
            rows={4}
            maxLength={PERSONAL_TOUCH_MAX}
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-describedby={describedBy}
            className="w-full resize-none scroll-mb-28 rounded-field border border-input bg-card px-4 py-3.5 text-body leading-relaxed outline-none focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
          />
        </div>
      );
      break;
  }

  // Com limite menor que o número de opções, avisa quando chega nele (as outras travam).
  const limited = question.kind === 'multi' && max < question.options.length;
  const counter =
    question.kind === 'multi'
      ? limited && selected.length >= max
        ? `Você escolheu ${max} de ${max}. Pra trocar, desmarque uma.`
        : question.layout === 'chips'
          ? `${selected.length} de ${max} escolhidas`
          : ''
      : '';
  // Sem resposta, o botão fica cinza, mas clicável: o toque mostra o que falta.
  const ready = question.kind === 'longtext' ? text.trim() !== '' : !missingAnswer();
  const submitLabel = editing
    ? 'Salvar e voltar'
    : question.kind === 'longtext' && !text.trim()
      ? 'Pular'
      : 'Continuar';

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(event) => submitWithoutReset(validate, formAction)(event)}
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="step" value={question.id} />
      {editing ? <input type="hidden" name="editing" value="1" /> : null}
      {body}
      {/* Sempre no código (vazio, fora do fluxo): regiões criadas junto com o texto não são
          anunciadas, e escondida com display:none ela sai da árvore de acessibilidade. */}
      {hasHint ? (
        <p id={hintId} className="-mt-2 text-sm text-muted-foreground">
          {autoAdvance
            ? editing
              ? 'Ao tocar numa opção, você volta pra revisão.'
              : 'Ao tocar numa opção, você segue pra próxima pergunta.'
            : `${text.length} de ${PERSONAL_TOUCH_MAX} caracteres`}
        </p>
      ) : null}
      <p aria-live="polite" className="text-body text-muted-foreground empty:sr-only">
        {counter}
      </p>
      <FieldError id={errorId}>{error}</FieldError>
      {/* No celular, o botão fica preso embaixo da tela: sempre à mão, mesmo com muitas opções. */}
      <div className="sticky bottom-0 -mx-4 bg-background/90 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Button
          type="submit"
          loading={pending}
          loadingText="Salvando…"
          className={cn(
            !ready &&
              'bg-black/[0.07] text-foreground hover:bg-black/10 forced-colors:border-[GrayText]',
          )}
        >
          {submitLabel}
          {pending ? null : <ArrowRightIcon aria-hidden="true" />}
        </Button>
      </div>
    </form>
  );
}
