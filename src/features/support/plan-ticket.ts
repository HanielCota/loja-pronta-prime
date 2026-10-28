import {
  findSituation,
  findTopic,
  OTHER_ISSUE_ID,
  visibleSituations,
  type SituationPriority,
  type SupportTicketTopic,
  type SupportTopic,
  type TicketQueue,
} from './catalog';

export const MAX_DESCRIPTION = 5000;
export const MAX_SUBJECT = 120;
const SUBJECT_EXCERPT = 60;

export type TicketDraft = {
  topicId: string;
  situationId: string | null;
  description: string;
};

export type PlannedTicket = {
  topicId: SupportTicketTopic;
  situationId: string | null;
  priority: SituationPriority;
  queue: TicketQueue;
  subject: string;
  description: string;
};

export type PlanError = { field: 'topic' | 'situation' | 'description'; message: string };

export type PlanResult = { ok: true; ticket: PlannedTicket } | { ok: false; error: PlanError };

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Corta na última palavra inteira e marca com reticências. O assunto aparece na lista da aluna, no
 * título do chamado, no assunto do e-mail e na planilha: terminar no meio da palavra ("quero o
 * dinheir") parece erro. Palavra única maior que o limite é cortada mesmo assim, pra sobrar texto.
 */
export function cutAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const kept = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${kept.replace(/[\s,;:.!?-]+$/, '')}…`;
}

function subjectFor(label: string, description: string): string {
  const excerpt = cutAtWord(oneLine(description), SUBJECT_EXCERPT);
  return cutAtWord(`${label}: ${excerpt}`.trim(), MAX_SUBJECT);
}

/**
 * Monta o chamado a partir do que a aluna escolheu, sem confiar no navegador: confere tema e
 * situação no catálogo, tira a prioridade da situação (a aluna nunca escolhe) e escreve o assunto.
 */
export function planSupportTicket(catalog: readonly SupportTopic[], draft: TicketDraft): PlanResult {
  const topic = findTopic(catalog, draft.topicId);
  if (!topic) return { ok: false, error: { field: 'topic', message: 'Escolha sobre o que é.' } };

  const hasSituations = visibleSituations(topic).length > 0;
  const situationId = hasSituations ? draft.situationId : null;
  if (hasSituations && !situationId)
    return {
      ok: false,
      error: { field: 'situation', message: 'Escolha o que está acontecendo.' },
    };
  const found = situationId ? findSituation(topic, situationId) : undefined;
  if (situationId && !found)
    return {
      ok: false,
      error: { field: 'situation', message: 'Escolha o que está acontecendo.' },
    };

  // Sem mínimo de caracteres: a pergunta e o exemplo já guiam, e uma trava só atrasava a aluna.
  const description = draft.description.trim();
  if (description.length === 0)
    return {
      ok: false,
      error: { field: 'description', message: 'Escreva o que está acontecendo.' },
    };
  if (description.length > MAX_DESCRIPTION)
    return {
      ok: false,
      error: {
        field: 'description',
        message: `Escreva até ${MAX_DESCRIPTION} caracteres. Se precisar, mande o resto numa resposta.`,
      },
    };

  const label = found && found.id !== OTHER_ISSUE_ID ? found.label : topic.label;
  return {
    ok: true,
    ticket: {
      topicId: topic.id,
      situationId: found?.id ?? null,
      priority: found?.priority ?? 'normal',
      queue: topic.queue,
      subject: subjectFor(label, description),
      description,
    },
  };
}
