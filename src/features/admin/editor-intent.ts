/** Ações dos botões abaixo dos editores de banners, recursos e textos do SLL. */
export const EDITOR_INTENTS = ['publish', 'discard', 'restore', 'up', 'down', 'archive'] as const;
export type EditorIntent = (typeof EDITOR_INTENTS)[number];

/** O botão manda a ação no próprio `name="intent"`: assim o formulário funciona sem JavaScript. */
export function parseEditorIntent(value: unknown): EditorIntent | null {
  return EDITOR_INTENTS.find((intent) => intent === value) ?? null;
}

/**
 * Publicar, descartar e voltar à versão anterior trocam os valores salvos: o formulário precisa
 * ser recarregado com eles. Mover e arquivar não mexem nos campos (e recarregar tiraria o foco
 * do botão que a pessoa acabou de usar).
 */
export function intentReloadsForm(intent: EditorIntent | undefined): boolean {
  return intent === 'publish' || intent === 'discard' || intent === 'restore';
}
