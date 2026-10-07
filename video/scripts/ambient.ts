import { REEL_BARS, REEL_START, type ReelSceneId } from '../src/reel/timeline';
import { BAR, BEAT, FPS } from '../src/timeline';
import { Biquad, RATE, mix, mixStereo, random, reverb, seconds, stereo, type Stereo } from './dsp';
import { bass, bell, keys, pad, shaker } from './instruments';

/**
 * A trilha do vídeo curto: ambiente, calma e clara. Colchão que respira devagar, um piano
 * elétrico bem leve dedilhando os acordes, um ar de fundo e sininhos quando a tela troca. No
 * mesmo andamento das telas (os toques caem nas notas), mas sem bateria: o som dos toques é o
 * ritmo. Resolve num acorde maior no fecho, que soa até o fim.
 */

const barSeconds = BAR / FPS;
const sixteenth = BEAT / FPS / 4;
const at = (bar: number, step = 0) => seconds(bar * barSeconds + step * sixteenth);
const humanize = random(11);

const CHORDS = {
  Fmaj9: { notes: [53, 57, 60, 64, 67], root: 41 },
  Dm9: { notes: [50, 53, 57, 60, 64], root: 38 },
  Bbmaj7: { notes: [53, 57, 58, 62, 65], root: 34 },
  Csus: { notes: [55, 60, 65, 67], root: 36 },
  Fadd9: { notes: [53, 57, 60, 65, 67, 72], root: 41 },
} as const;
type Chord = keyof typeof CHORDS;

const FINAL = REEL_START.final;

/** I, vi, IV, V (sem a terça, suspenso) e volta; o fecho resolve no I. */
const PROGRESSION: { at: number; chord: Chord }[] = [
  { at: 0, chord: 'Fmaj9' },
  { at: 2, chord: 'Dm9' },
  { at: 4, chord: 'Bbmaj7' },
  { at: 6, chord: 'Csus' },
  { at: 8, chord: 'Fmaj9' },
  { at: 10, chord: 'Dm9' },
  { at: 12, chord: 'Bbmaj7' },
  { at: 13, chord: 'Csus' },
  { at: FINAL, chord: 'Fadd9' },
];

/** As trocas de tela ganham um brilho (as cenas depois da abertura). */
const CHIMES: ReelSceneId[] = ['conversa', 'nome', 'estudio', 'jornada'];

export function ambient(): Stereo {
  const length = at(REEL_BARS);
  const harmony = stereo(length);
  const low = stereo(length);
  const air = stereo(length);
  const send = stereo(length);

  PROGRESSION.forEach((entry, index) => {
    const until = PROGRESSION[index + 1]?.at ?? REEL_BARS;
    const span = (until - entry.at) * barSeconds;
    const chord = CHORDS[entry.chord];
    const final = entry.at === FINAL;

    // Colchão: abre o filtro devagar ao longo do vídeo (fica mais claro no fim).
    const cutoff = 900 + 900 * (entry.at / REEL_BARS);
    for (const note of chord.notes) {
      const voice = pad(note, span + 0.2, cutoff);
      mix(harmony, voice, at(entry.at), 0.1, (note % 5) / 5 - 0.4);
      mix(send, voice, at(entry.at), 0.05);
    }

    // Grave redondo, baixinho: dá chão sem pesar no celular.
    mix(low, bass(chord.root, span * 0.97, 0.5), at(entry.at), final ? 0.32 : 0.26);

    if (final) {
      // O fecho: o acorde inteiro no piano, com um sino em cima.
      chord.notes.forEach((note, k) => {
        const voice = keys(note + 12, span, 0.45);
        mix(harmony, voice, at(entry.at) + seconds(k * 0.012), 0.11, k / chord.notes.length - 0.5);
        mix(send, voice, at(entry.at) + seconds(k * 0.012), 0.06);
      });
      for (const [step, note] of [
        [0, 84],
        [4, 88],
        [8, 91],
      ] as const) {
        const ring = bell(note, 0.32, 2.4);
        mix(harmony, ring, at(entry.at, step), 0.07, 0.2);
        mix(send, ring, at(entry.at, step), 0.14);
      }
      return;
    }

    // Piano elétrico dedilhando os acordes, leve e sem marcar demais (entra depois do celular).
    const pattern = [0, 3, 6, 8, 11, 14];
    const order = [0, 2, 4, 1, 3, 2];
    const tones = chord.notes.map((note) => note + 12);
    for (let bar = entry.at; bar < until; bar++) {
      pattern.forEach((step, k) => {
        const time = bar + step / 16;
        if (time < 0.5 || time >= until) return;
        const note = tones[order[k]! % tones.length]!;
        const velocity = 0.22 + humanize() * 0.14;
        const voice = keys(note, sixteenth * 3, velocity);
        // Uns milissegundos fora da grade: mão humana.
        const drift = seconds((humanize() - 0.5) * 0.012);
        mix(harmony, voice, at(bar, step) + drift, 0.14, k % 2 ? 0.4 : -0.35);
        mix(send, voice, at(bar, step) + drift, 0.09);
      });
    }
  });

  // Um chiado de ar quase imperceptível nos contratempos: movimento sem bateria.
  for (let bar = 1; bar < FINAL; bar++) {
    for (let step = 2; step < 16; step += 4) {
      mix(air, shaker(0.5 + humanize() * 0.2), at(bar, step), 0.05, step % 8 === 2 ? 0.4 : -0.4);
    }
  }

  // Sininhos nas trocas de tela (a nota sobe a cada cena: o caminho avançando).
  CHIMES.forEach((scene, index) => {
    const note = [79, 81, 84, 86][index]!;
    const ring = bell(note + 12, 0.28, 2);
    mix(harmony, ring, at(REEL_START[scene]), 0.05, index % 2 ? 0.3 : -0.3);
    mix(send, ring, at(REEL_START[scene]), 0.16);
  });

  // O ar da sala: ruído agudo bem baixo, que sobe e desce devagar.
  const noiseL = random(21);
  const noiseR = random(22);
  const bandL = new Biquad('bandpass', 3800, 0.6);
  const bandR = new Biquad('bandpass', 4200, 0.6);
  for (let i = 0; i < length; i++) {
    const t = i / RATE;
    const swell = 0.5 + 0.5 * Math.sin(t * 0.7);
    air.left[i]! += bandL.run(noiseL() * 2 - 1) * 0.012 * swell;
    air.right[i]! += bandR.run(noiseR() * 2 - 1) * 0.012 * (1 - swell * 0.6);
  }

  for (const side of ['left', 'right'] as const) {
    new Biquad('highpass', 120).process(harmony[side]);
    new Biquad('lowpass', 320).process(low[side]);
  }

  const out = stereo(length);
  mixStereo(out, harmony);
  mixStereo(out, low);
  mixStereo(out, air);
  // Sala grande: é ela que dá a cara de "ambiente".
  mixStereo(out, reverb(send, { room: 0.9, damp: 0.45 }), 0, 1.1);

  // Entra sem estalo e some devagar no último segundo e meio.
  const fadeIn = seconds(0.4);
  const fadeFrom = length - seconds(1.5);
  for (let i = 0; i < length; i++) {
    const g =
      Math.min(1, i / fadeIn) *
      (i > fadeFrom ? (1 - (i - fadeFrom) / (length - fadeFrom)) ** 2 : 1);
    out.left[i]! *= g;
    out.right[i]! *= g;
  }

  // Master: tira o grave inútil e segura os picos com uma saturação suave.
  for (const side of ['left', 'right'] as const) {
    const rumble = new Biquad('highpass', 35);
    const buffer = out[side];
    for (let i = 0; i < length; i++) buffer[i] = Math.tanh(rumble.run(buffer[i]!) * 1.2);
  }
  return out;
}
