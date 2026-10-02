/**
 * Como o resto do sistema conversa com o mascote. Ele não conhece as telas: quem sabe o que
 * aconteceu (ex.: o formulário de login) avisa por aqui, e o mascote reage.
 *
 * O que é genérico de qualquer formulário (foco, digitação, campo de senha, Caps Lock), ele
 * percebe sozinho.
 */

export type MascotSignal =
  /** Deu certo: pulinho de alegria. */
  | { type: 'celebrate' }
  /**
   * Deu errado. `grumpy`: erro causado pela tentativa (fecha a cara e balança a cabeça);
   * `worried`: o resto (fica preocupado com a pessoa). `target`: pra onde ele olha.
   */
  | { type: 'upset'; mood: 'grumpy' | 'worried'; target?: Element }
  /** Desconfiado (ex.: email com cara de digitado errado) até `active` voltar a ser falso. */
  | { type: 'doubt'; active: boolean }
  /** Aceno de aprovação (ex.: o email ficou completo). */
  | { type: 'nod' };

const MASCOT_EVENT = 'mascot:signal';

function emit(signal: MascotSignal) {
  window.dispatchEvent(new CustomEvent<MascotSignal>(MASCOT_EVENT, { detail: signal }));
}

export const celebrateMascot = () => emit({ type: 'celebrate' });
export const upsetMascot = (mood: 'grumpy' | 'worried', target?: Element) =>
  emit({ type: 'upset', mood, target });
export const setMascotDoubt = (active: boolean) => emit({ type: 'doubt', active });
export const nodMascot = () => emit({ type: 'nod' });

/** Usado pelo mascote pra ouvir os avisos. Devolve a função que para de ouvir. */
export function onMascotSignal(listener: (signal: MascotSignal) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<MascotSignal>).detail);
  window.addEventListener(MASCOT_EVENT, handler);
  return () => window.removeEventListener(MASCOT_EVENT, handler);
}
