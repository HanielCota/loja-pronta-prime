/**
 * A linha do tempo do vídeo, em compassos da música. Tudo (cortes, legendas, efeitos e a própria
 * trilha, gerada por scripts/make-audio.ts) lê daqui: os cortes caem sempre no tempo forte, e é
 * isso que dá a cara de vídeo editado (e não de slides passando).
 *
 * 120 batidas por minuto a 30 quadros por segundo: uma batida = 15 quadros, um compasso = 60.
 */

export const FPS = 30;
export const BPM = 120;
export const BEAT = (FPS * 60) / BPM;
export const BAR = BEAT * 4;

/** Quadro do compasso `bar` (pode ser fracionado: 2.5 = metade do terceiro compasso). */
export const bars = (bar: number) => Math.round(bar * BAR);
export const beats = (beat: number) => Math.round(beat * BEAT);

/** As cenas, em ordem, com a duração em compassos. */
export const SCENES = [
  { id: 'problema', bars: 4 },
  { id: 'respira', bars: 3 },
  { id: 'promessa', bars: 3 },
  { id: 'conversa', bars: 4 },
  { id: 'nome', bars: 3 },
  { id: 'estudio', bars: 5 },
  { id: 'jornada', bars: 4 },
  { id: 'sll', bars: 4 },
  { id: 'final', bars: 4 },
] as const;

export type SceneId = (typeof SCENES)[number]['id'];

/** Onde cada cena começa (em compassos). */
export const SCENE_START: Record<SceneId, number> = (() => {
  const starts = {} as Record<SceneId, number>;
  let at = 0;
  for (const scene of SCENES) {
    starts[scene.id] = at;
    at += scene.bars;
  }
  return starts;
})();

export const TOTAL_BARS = SCENES.reduce((sum, scene) => sum + scene.bars, 0);
/** A trilha termina num acorde que soa até o fim (mais meio compasso de respiro). */
export const DURATION = bars(TOTAL_BARS);

/**
 * Os títulos: a frase grande de cada cena (o resumo do que a voz diz). `at` e `until` em
 * compassos desde o começo da cena. A legenda da fala (embaixo) vem da narração, mais abaixo.
 */
export const CAPTIONS = [
  { scene: 'problema', at: 0.25, until: 1.85, text: 'Você quer vender na Shopee.' },
  { scene: 'problema', at: 2, until: 3.85, text: 'Mas por onde começar?' },
  { scene: 'respira', at: 0.6, until: 2.9, text: 'Calma. Agora tem um caminho.' },
  {
    scene: 'promessa',
    at: 0,
    until: 3,
    text: 'Sua loja na Shopee, montada por você. Um passo de cada vez.',
  },
  { scene: 'conversa', at: 0.2, until: 3.9, text: 'Uma conversa rápida. Uma pergunta por tela.' },
  { scene: 'nome', at: 0.2, until: 2.9, text: 'Ideias de nome feitas com as suas respostas.' },
  { scene: 'estudio', at: 0.2, until: 4.9, text: 'Monte o seu logo e veja ele mudar na hora.' },
  { scene: 'jornada', at: 0.2, until: 3.9, text: 'Você sempre sabe em que etapa está.' },
  { scene: 'sll', at: 0.2, until: 3.9, text: 'Prefere estudar no seu ritmo? Tem o curso SLL.' },
  { scene: 'final', at: 0.6, until: 4, text: 'Sua loja na Shopee começa aqui.' },
] as const satisfies readonly { scene: SceneId; at: number; until: number; text: string }[];

/** As legendas da cena, em quadros desde o começo dela. */
export function sceneCaptions(scene: SceneId) {
  return CAPTIONS.filter((entry) => entry.scene === scene).map((entry) => ({
    text: entry.text,
    at: bars(entry.at),
    until: bars(entry.until),
  }));
}

/** A legenda da cena (a `index`-ésima, quando há mais de uma). */
export function caption(scene: SceneId, index = 0) {
  const found = sceneCaptions(scene)[index];
  if (!found) throw new Error(`A cena ${scene} não tem a legenda ${index}`);
  return found;
}

/**
 * A narração (a voz da OpenAI, gerada por scripts/make-voice.ts): uma fala por cena, começando
 * `at` compassos depois do começo dela. `text` é a legenda; `speech`, o que a voz lê, quando
 * precisa ser diferente (siglas e o endereço, escritos como se fala); `onScreen`: a tela já
 * mostra a frase em letra grande, então a legenda da fala não aparece (só vai pro .srt).
 */
export const NARRATION = [
  { scene: 'problema', at: 0.6, text: 'Quer vender na Shopee, mas não sabe por onde começar?' },
  {
    scene: 'respira',
    at: 0.05,
    text: 'Calma. Agora tem um caminho: a Loja Pronta Prime.',
    onScreen: true,
  },
  {
    scene: 'promessa',
    at: 0.05,
    text: 'Você monta a sua loja na Shopee, um passo de cada vez.',
    onScreen: true,
  },
  { scene: 'conversa', at: 0.15, text: 'Começa com uma conversa rápida: uma pergunta por tela.' },
  {
    scene: 'nome',
    at: 0.1,
    text: 'Com as suas respostas, a plataforma sugere nomes pra sua loja.',
  },
  {
    scene: 'estudio',
    at: 0.1,
    text: 'Depois, você monta o seu logo e vê o rascunho mudar na hora.',
  },
  { scene: 'jornada', at: 0.15, text: 'E você sempre sabe em que etapa está.' },
  {
    scene: 'sll',
    at: 0.05,
    text: 'Prefere estudar no seu ritmo? Tem o curso SLL.',
    speech: 'Prefere estudar no seu ritmo? Tem o curso S L L.',
  },
  {
    scene: 'final',
    at: 0.1,
    text: 'Loja Pronta Prime. Sua loja na Shopee começa aqui.',
    onScreen: true,
  },
] as const satisfies readonly {
  scene: SceneId;
  at: number;
  text: string;
  speech?: string;
  onScreen?: boolean;
}[];
