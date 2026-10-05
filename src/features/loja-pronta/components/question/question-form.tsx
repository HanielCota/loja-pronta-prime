'use client';

import { ArrowRightIcon } from 'lucide-react';
import { useActionState, useEffect, useId, useState } from 'react';
import { nodMascot, upsetMascot } from '@/components/brand/mascot';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { type AnswerValue, type OnboardingQuestion } from '@/config/onboarding';
import { submitWithoutReset } from '@/lib/forms';
import { cn } from '@/lib/utils';
import {
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
 * confere. A escolha só marca a resposta; o botão confirma. A múltipla trava as outras opções no
 * limite, e nada é enviado com a pergunta incompleta: o aviso aparece na hora. As regras de cada
 * tipo ficam em answer-rules.ts; aqui só se juntam as peças.
 */
export function QuestionForm({ question, saved, editing, titleId, helpId }: QuestionFormProps) {
  const [state, formAction, pending] = useActionState(saveAnswer, undefined);
  const [draft, setDraft] = useState(() => initialDraft(question, saved));
  const [clientError, setClientError] = useState<string>();
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
    // Enquanto salva, não inicia outro envio (por exemplo, com clique duplo no botão).
    if (pending) {
      event.preventDefault();
      return;
    }
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
    const single = question.kind === 'single' || question.kind === 'color';
    update({
      selected: single
        ? checked
          ? [value]
          : []
        : checked
          ? [...draft.selected, value]
          : draft.selected.filter((item) => item !== value),
    });
    if (!checked) return;
    nodMascot();
  }

  const note = fieldNote(question, draft);
  const describedBy =
    [helpId, note && noteId, error && errorId].filter(Boolean).join(' ') || undefined;
  const button = submitButton(question, draft, editing);

  return (
    <form
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
              'bg-foreground/[0.07] text-foreground hover:bg-foreground/10 forced-colors:border-[GrayText]',
          )}
        >
          {button.label}
          {pending ? null : <ArrowRightIcon aria-hidden="true" />}
        </Button>
      </StickyAction>
    </form>
  );
}
