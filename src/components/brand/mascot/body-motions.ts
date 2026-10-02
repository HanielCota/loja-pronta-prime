/** Movimentos do corpo inteiro (Web Animations). Desligados com movimento reduzido. */
type Motion = { keyframes: Keyframe[]; options: KeyframeAnimationOptions };

/** Balança a cabeça como quem diz "não" (senha errada). */
export const SHAKE: Motion = {
  keyframes: [
    { translate: '0' },
    { translate: '-5px 0' },
    { translate: '4px 0' },
    { translate: '-3px 0' },
    { translate: '2px 0' },
    { translate: '0' },
  ],
  options: { duration: 450, easing: 'ease-out' },
};

/** Pulinho de alegria: um pulo grande e um pequeno. */
export const JUMP: Motion = {
  keyframes: [
    { translate: '0 0' },
    { translate: '0 -16px', offset: 0.32 },
    { translate: '0 0', offset: 0.58 },
    { translate: '0 -6px', offset: 0.78 },
    { translate: '0 0' },
  ],
  options: { duration: 720, easing: 'ease-out' },
};

/** Aceno de "isso aí" com a cabeça. */
export const NOD: Motion = {
  keyframes: [
    { translate: '0 0' },
    { translate: '0 4px' },
    { translate: '0 0' },
    { translate: '0 3px' },
    { translate: '0 0' },
  ],
  options: { duration: 480, easing: 'ease-in-out' },
};

/** Encolhe no instante do toque (resposta imediata)... */
export const PRESS: Motion = {
  keyframes: [{ scale: '1' }, { scale: '0.92' }],
  options: { duration: 90, easing: 'ease-out', fill: 'forwards' },
};

/** ...e volta quicando ao soltar. */
export const BOUNCE: Motion = {
  keyframes: [
    { scale: '0.92' },
    { scale: '1.08', offset: 0.35 },
    { scale: '0.97', offset: 0.65 },
    { scale: '1.02', offset: 0.85 },
    { scale: '1' },
  ],
  options: { duration: 560, easing: 'ease-out' },
};

/** Piscada partindo da abertura atual do olho (ex.: semicerrado de cara fechada). */
export function blinkMotion(lid: number, twice: boolean): Motion {
  const open = (1 - Math.max(0, lid)) * 100;
  const resting = `inset(0 0 ${open.toFixed(1)}% 0)`;
  return {
    keyframes: [
      { clipPath: resting },
      { clipPath: 'inset(0 0 0% 0)', offset: 0.45 },
      { clipPath: resting },
    ],
    options: { duration: 170, easing: 'ease-in-out', iterations: twice ? 2 : 1 },
  };
}
