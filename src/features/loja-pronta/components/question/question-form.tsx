'use client';

import { ArrowRightIcon } from 'lucide-react';
import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { nodMascot, upsetMascot } from '@/components/brand/mascot';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import type { AnswerValue, OnboardingQuestion } from '@/config/onboarding';
import { submitWithoutReset } from '@/lib/forms';
import { cn } from '@/lib/utils';
import {
  advancesOnTap,
  choiceCounter,
  fieldNote,
  maxChoices,
  missingAnswer,
  submitButton,
  type Draft,
} from '../../answer-rules';
import { saveAnswer } from '../../server/actions';
import { StickyAction } from '../sticky-action';
import { OptionField } from './option-field';
import { LongTextField, NameField } from './text-fields';
import { useAutoAdvance } from './use-auto-advance';

type QuestionFormProps = {
  question: OnboardingQuestion;
  /** Resposta já salva (ela voltou ou veio editar). */
  saved: AnswerValue | undefined;
  /** Veio da revisão: salvar leva de volta pra ela. */
  editing: boolean;
  /** Ids do título e da ajuda (no balão do mascote), que nomeiam e descrevem o campo. */
  titleId: string;
  helpId?: string | undefined;
};

function initialDraft(question: OnboardingQuestion, saved: QuestionFormProps['saved']): Draft {
  return {
    selected: Array.isArray(saved) ? saved : typeof saved === 'string' && saved ? [saved] : [],
    unknownName: question.kind === 'name' && saved === null,
    text: typeof saved === 'string' ? saved : '',
  };
}

/**
 * Uma pergunta da conversa. Formulário de verdade: sem JavaScript, o botão envia e o servidor
 * confere. Com JavaScript, a escolha única avança sozinha ao tocar (useAutoAdvance), a múltipla
 * trava as outras opções no limite, e nada é enviado com a pergunta incompleta: o aviso aparece
 * na hora. As regras de cada tipo ficam em answer-rules.ts; aqui só se juntam as peças.
 */
export function QuestionForm({ question, saved, editing, titleId, helpId }: QuestionFormProps) {
  const [state, formAction, pending] = useActionState(saveAnswer, undefined);
  const [draft, setDraft] = useState(() => initialDraft(question, saved));
  const [clientError, setClientError] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);
  const autoAdvance = useAutoAdvance(formRef, pending);
  const errorId = useId();
  const noteId = useId();
  const error = clientError ?? state?.error;

  useEffect(() => {
    if (state?.error) upsetMascot('worried');
  }, [state]);

  function update(change: Partial<Draft>) {
    setClientError(undefined);
    setDraft((current) => ({ ...current, ...change }));
  }

  function validate(event: { preventDefault: () => void }) {
    // Já salvando (Enter duas vezes, toque e clique juntos): um envio só.
    if (autoAdvance.isSending()) {
      event.preventDefault();
      return;
    }
    autoAdvance.cancel();
    const message = missingAnswer(question, draft);
    if (message) {
      event.preventDefault();
      setClientError(message);
      upsetMascot('worried');
    }
  }

  function choose(value: string, checked: boolean) {
    // Salvando: a escolha já foi enviada. Ignorar o toque (o campo controlado volta ao que
    // estava) é melhor que mostrar uma opção marcada que não seria salva.
    if (pending) return;
    const single = advancesOnTap(question);
    update({
      selected: single
        ? [value]
        : checked
          ? [...draft.selected, value]
          : draft.selected.filter((item) => item !== value),
    });
    if (!checked) return;
    nodMascot();
    if (single) autoAdvance.afterChoice();
  }

  const note = fieldNote(question, draft, editing);
  const describedBy =
    [helpId, note && noteId, error && errorId].filter(Boolean).join(' ') || undefined;
  const button = submitButton(question, draft, editing);

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(event) => submitWithoutReset(validate, formAction)(event)}
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="step" value={question.id} />
      {editing ? <input type="hidden" name="editing" value="1" /> : null}

      {question.kind === 'name' ? (
        <NameField
          text={draft.text}
          unknown={draft.unknownName}
          describedBy={describedBy}
          invalid={Boolean(error)}
          onText={(text) => update({ text })}
          onUnknown={(unknownName) => update({ unknownName })}
        />
      ) : question.kind === 'longtext' ? (
        <LongTextField
          text={draft.text}
          describedBy={describedBy}
          onText={(text) => update({ text })}
        />
      ) : (
        <OptionField
          question={question}
          selected={draft.selected}
          max={maxChoices(question)}
          labelledBy={titleId}
          describedBy={describedBy}
          invalid={Boolean(error)}
          onChoose={choose}
        />
      )}

      {note ? (
        <p id={noteId} className="-mt-2 text-sm text-muted-foreground">
          {note}
        </p>
      ) : null}
      {/* Sempre no código (vazio, fora do fluxo): regiões criadas junto com o texto não são
          anunciadas, e escondida com display:none ela sai da árvore de acessibilidade. */}
      <p aria-live="polite" className="text-body text-muted-foreground empty:sr-only">
        {choiceCounter(question, draft.selected.length)}
      </p>
      <FieldError id={errorId}>{error}</FieldError>

      <StickyAction>
        <Button
          type="submit"
          loading={pending}
          loadingText="Salvando…"
          className={cn(
            !button.ready &&
              'bg-black/[0.07] text-foreground hover:bg-black/10 forced-colors:border-[GrayText]',
          )}
        >
          {button.label}
          {pending ? null : <ArrowRightIcon aria-hidden="true" />}
        </Button>
      </StickyAction>
    </form>
  );
}
