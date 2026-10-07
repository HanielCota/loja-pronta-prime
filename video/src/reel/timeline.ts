import { bars } from '../timeline';

/**
 * O vídeo curto (30 segundos, vertical): o app no celular, sem narração. Quem conta a história
 * é o título de cada cena, os toques e o som. Mesmo andamento do vídeo longo (120 batidas por
 * minuto, um compasso = 2 segundos), então as telas reaproveitadas tocam no mesmo tempo.
 *
 * Cada cena dura o bastante pros toques dela (CONVERSA_TAPS, NOME_TAPS...) e corta logo depois
 * do último: 15 compassos, 30 segundos.
 */

export const REEL_SCENES = [
  { id: 'abertura', bars: 1.25, title: 'Monte a sua loja na Shopee pelo celular.' },
  { id: 'conversa', bars: 3.75, title: 'Responda umas perguntas rápidas.' },
  { id: 'nome', bars: 2.5, title: 'Escolha o nome da sua loja.' },
  { id: 'estudio', bars: 3.5, title: 'Crie o seu logo e veja na hora.' },
  { id: 'jornada', bars: 2.75, title: 'Você sempre sabe em que etapa está.' },
  { id: 'final', bars: 1.25, title: 'Sua loja na Shopee começa aqui.' },
] as const;

export type ReelSceneId = (typeof REEL_SCENES)[number]['id'];

/** Onde cada cena começa, em compassos. */
export const REEL_START: Record<ReelSceneId, number> = (() => {
  const starts = {} as Record<ReelSceneId, number>;
  let at = 0;
  for (const scene of REEL_SCENES) {
    starts[scene.id] = at;
    at += scene.bars;
  }
  return starts;
})();

export const REEL_BARS = REEL_SCENES.reduce((sum, scene) => sum + scene.bars, 0);
export const REEL_DURATION = bars(REEL_BARS);

/** Primeiro quadro e duração da cena, em quadros. */
export function reelScene(id: ReelSceneId) {
  const scene = REEL_SCENES.find((entry) => entry.id === id)!;
  return { ...scene, from: bars(REEL_START[id]), length: bars(scene.bars) };
}
