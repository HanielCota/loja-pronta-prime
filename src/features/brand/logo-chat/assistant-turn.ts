import { z } from 'zod';
import { logoBriefSchema, MAX_SUGGESTIONS, type AssistantTurn, type LogoBrief } from './model';

/**
 * Lê a resposta da IA (o JSON das instruções) e devolve só o que vale: a fala, as respostas
 * rápidas e o resumo. Fora do formato: `null` (quem chama decide o que fazer).
 */

/** A fala quando a IA erra o formato: um pedido pra ela repetir, sem mostrar nada estranho. */
export const FALLBACK_TURN: AssistantTurn = {
  reply: 'Desculpa, me perdi aqui. Pode me contar de novo?',
  suggestions: [],
  brief: null,
};

const turnSchema = z.object({
  reply: z.string().trim().min(1).max(1200),
  suggestions: z
    .array(z.unknown())
    .catch([])
    .transform((items) =>
      items
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.replace(/\s+/g, ' ').trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, MAX_SUGGESTIONS),
    ),
  brief: logoBriefSchema.nullable().catch(null),
});

export function parseAssistantTurn(raw: string): AssistantTurn | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = turnSchema.safeParse(data);
  if (!parsed.success) return null;
  const { reply, suggestions, brief } = parsed.data;
  return {
    reply,
    // Os ajustes de um toque são do sistema: a IA não liga nem desliga.
    brief: brief ? withoutTweaks(brief) : null,
    // "Criar meu logo" é um botão da tela: como resposta rápida, só mandaria o texto.
    suggestions: suggestions.filter((suggestion) => !CREATE_LIKE.test(suggestion)),
  };
}

function withoutTweaks({ tweaks: _tweaks, ...brief }: LogoBrief): LogoBrief {
  return brief;
}

/** Sugestões que imitam o botão de criar ("Criar meu logo", "criar o logo"...). */
const CREATE_LIKE = /\b(criar|gerar|fazer)\b.*\blogo\b/i;

/**
 * Uma fala do assistente como a IA a escreveria (o mesmo JSON das instruções). O histórico vai
 * assim: com falas em texto solto, o modelo imita o texto solto e erra o formato.
 */
export function serializeAssistantTurn(turn: AssistantTurn): string {
  return JSON.stringify({ reply: turn.reply, suggestions: turn.suggestions, brief: turn.brief });
}
