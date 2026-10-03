/** Pra onde o mascote olha: geometria da tela, sem estado. x e y vão de -1 a 1. */
export type Gaze = { x: number; y: number };
type Point = { x: number; y: number };

/** Pose original da arte: olhando pra direita. */
export const IDLE: Gaze = { x: 0.9, y: -0.3 };
/** Vira o rosto enquanto a senha está sendo digitada. */
const LOOK_AWAY: Gaze = { x: -0.95, y: -0.75 };
/** Distância (px) a partir da qual o olhar chega no limite. */
const FULL_REACH_PX = 140;
/** Campos com texto digitável: neles o olhar segue o cursor de texto. Nos demais, o centro. */
const TEXT_INPUT_TYPES = new Set(['text', 'email', 'password', 'search', 'tel', 'url']);

const measure = typeof document === 'undefined' ? null : document.createElement('canvas');

/** Olhar do rosto (`face`) na direção de um ponto da tela. */
function lookAt(face: Element, point: Point): Gaze {
  const rect = face.getBoundingClientRect();
  const dx = point.x - (rect.left + rect.width / 2);
  const dy = point.y - (rect.top + rect.height * 0.55);
  const distance = Math.hypot(dx, dy) || 1;
  const reach = Math.min(1, distance / FULL_REACH_PX);
  return { x: (dx / distance) * reach, y: (dy / distance) * reach };
}

function center(element: Element): Point {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** Ponto do texto digitado onde está o cursor (ou o fim do texto). */
function caretPoint(input: HTMLInputElement): Point {
  const rect = input.getBoundingClientRect();
  const style = getComputedStyle(input);
  let width = 0;
  const context = measure?.getContext('2d');
  if (context) {
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    let end = input.value.length;
    try {
      end = input.selectionEnd ?? end;
    } catch {
      // type="email" não expõe a seleção: usa o fim do texto.
    }
    width = context.measureText(input.value.slice(0, end)).width;
  }
  const x = Math.min(
    rect.left + parseFloat(style.paddingLeft) + width - input.scrollLeft,
    rect.right - parseFloat(style.paddingRight),
  );
  return { x, y: rect.top + rect.height * 0.62 };
}

/** Campo de senha com foco (escondida ou, com "Mostrar senha", visível). */
export function focusedPasswordField(): HTMLInputElement | undefined {
  const active = document.activeElement;
  if (!(active instanceof HTMLInputElement)) return undefined;
  return active.type === 'password' || active.autocomplete.includes('password')
    ? active
    : undefined;
}

/**
 * Olhar pelo que está acontecendo na tela, nesta ordem: algo que pediu atenção (ex.: um erro),
 * o campo com foco (o cursor de texto; a senha escondida faz ele virar o rosto), o botão ou link
 * com foco, o mouse e, sem nada disso, a pose original.
 */
export function gazeFor(
  face: Element,
  attention: Element | undefined,
  pointer: Point | null,
): Gaze {
  if (attention?.isConnected) return lookAt(face, center(attention));
  const active = document.activeElement;
  if (active instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(active.type)) {
    return active.type === 'password' ? LOOK_AWAY : lookAt(face, caretPoint(active));
  }
  // Texto livre (várias linhas): olha pro campo, como quem acompanha o que está sendo escrito.
  if (active instanceof HTMLTextAreaElement) return lookAt(face, center(active));
  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLButtonElement ||
    active instanceof HTMLAnchorElement
  ) {
    return lookAt(face, center(active));
  }
  return pointer ? lookAt(face, pointer) : IDLE;
}
