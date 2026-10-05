import voice from './voice.json';
import { FPS, NARRATION, SCENE_START, bars, type SceneId } from './timeline';

/**
 * A narração no tempo do vídeo: onde cada fala começa e o quadro de cada palavra (o tempo vem
 * da transcrição da própria voz, em voice.json, gerado por scripts/make-voice.ts).
 */
type Timing = Record<
  string,
  { duration: number; words: { word: string; start: number; end: number }[] }
>;
const TIMING = voice as Timing;

export type Line = {
  scene: SceneId;
  /** Quadro do vídeo em que a fala começa. */
  from: number;
  /** Quadro do vídeo em que a última palavra termina. */
  until: number;
  words: { word: string; from: number; until: number }[];
  /** A tela já mostra a frase: sem legenda da fala. */
  onScreen: boolean;
};

export const LINES: Line[] = NARRATION.map((line) => {
  const from = bars(SCENE_START[line.scene] + line.at);
  const timing = TIMING[line.scene];
  if (!timing) throw new Error(`Falta a voz da cena ${line.scene}: rode bun run voice`);
  const words = timing.words.map((word) => ({
    word: word.word,
    from: from + Math.round(word.start * FPS),
    until: from + Math.round(word.end * FPS),
  }));
  const onScreen = 'onScreen' in line && line.onScreen;
  return { scene: line.scene, from, until: words.at(-1)?.until ?? from, words, onScreen };
});
