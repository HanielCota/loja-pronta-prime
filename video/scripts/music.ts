import { BAR, BEAT, FPS, SCENE_START, TOTAL_BARS } from '../src/timeline';
import { Biquad, mix, mixStereo, random, reverb, seconds, stereo, type Stereo } from './dsp';
import { bass, bell, clap, crash, hat, keys, kick, pad, pluck } from './instruments';

/**
 * A trilha de fundo: pop leve e quente (piano elétrico, violão dedilhado, baixo redondo e
 * bateria bem macia), pra ficar por baixo da voz sem disputar com ela. Começa contida (o
 * problema), abre no logo, respira no SLL e resolve num acorde maior no final. No vídeo, ela
 * ainda abaixa sozinha enquanto a voz fala (Video.tsx).
 */

const barSeconds = BAR / FPS;
const sixteenth = BEAT / FPS / 4;
const feel = random(3);
const at = (bar: number, step = 0) => seconds(bar * barSeconds + step * sixteenth);

/** Acordes (notas MIDI) e a fundamental do baixo. */
const CHORDS = {
  Dm7: { notes: [50, 53, 57, 60, 64], root: 38 },
  Bbmaj7: { notes: [53, 57, 58, 62, 65], root: 34 },
  Fmaj7: { notes: [53, 57, 60, 64, 67], root: 41 },
  Csus: { notes: [55, 60, 65, 67], root: 36 },
  C: { notes: [52, 55, 60, 62, 67], root: 36 },
  Fadd9: { notes: [53, 57, 60, 65, 67, 72], root: 41 },
} as const;
type Chord = keyof typeof CHORDS;

type Section = 'intro' | 'groove' | 'break' | 'build' | 'final' | 'end';

const END = SCENE_START.final + 2;

function sectionAt(bar: number): Section {
  if (bar < SCENE_START.respira) return 'intro';
  if (bar >= END) return 'end';
  if (bar >= SCENE_START.final) return 'final';
  if (bar >= SCENE_START.sll) return bar < SCENE_START.sll + 2 ? 'break' : 'build';
  return 'groove';
}

/** Um acorde por compasso. */
function chordAt(bar: number): Chord {
  // O problema: menor e suspenso, sem resolver.
  if (bar < SCENE_START.respira) return (['Dm7', 'Bbmaj7', 'Dm7', 'Csus'] as const)[bar % 4]!;
  // O final: IV, V e resolve no I, que fica soando.
  if (bar >= SCENE_START.final) {
    return (['Bbmaj7', 'C', 'Fadd9', 'Fadd9'] as const)[Math.min(3, bar - SCENE_START.final)]!;
  }
  // O corpo: I, V, vi, IV (o clássico do pop, que soa como "dá pra fazer").
  return (['Fmaj7', 'C', 'Dm7', 'Bbmaj7'] as const)[(bar - SCENE_START.respira) % 4]!;
}

export function music(): Stereo {
  const length = at(TOTAL_BARS) + seconds(0.5);
  const drums = stereo(length);
  const harmony = stereo(length);
  const low = stereo(length);
  const send = stereo(length);
  // A "respiração" dos acordes a cada bumbo (sidechain leve): o balanço do pop.
  const duck = new Float32Array(length).fill(1);

  for (let bar = 0; bar < TOTAL_BARS; bar++) {
    const section = sectionAt(bar);
    const chord = CHORDS[chordAt(bar)];
    const start = at(bar);
    const ending = section === 'end';
    const lastChord = bar === END;

    // Colchão de fundo, e o piano elétrico quando a música abre.
    if (!ending || lastChord) {
      const sustain = lastChord ? barSeconds * 2 : barSeconds;
      const cutoff = section === 'intro' ? 700 + bar * 180 : section === 'break' ? 1800 : 1300;
      for (const note of chord.notes) {
        mix(harmony, pad(note, sustain, cutoff), start, 0.11, (note % 5) / 5 - 0.4);
      }
    }
    if (section !== 'intro' && (!ending || lastChord)) {
      const hits = lastChord
        ? [{ step: 0, vel: 0.85, len: barSeconds * 2 }]
        : [
            { step: 0, vel: 0.7, len: sixteenth * 5 },
            { step: 6, vel: 0.45, len: sixteenth * 4 },
            { step: 10, vel: 0.55, len: sixteenth * 6 },
          ];
      for (const hit of hits) {
        chord.notes.forEach((note, k) => {
          // Um dedilhado de poucos milissegundos entre as notas: mão humana no teclado.
          const strum = seconds(k * 0.007);
          const voice = keys(note, hit.len, hit.vel * (0.85 + (k % 2) * 0.1));
          mix(harmony, voice, at(bar, hit.step) + strum, 0.15, k / chord.notes.length - 0.5);
          mix(send, voice, at(bar, hit.step) + strum, 0.05);
        });
      }
    }

    // Baixo.
    if (section === 'intro' || section === 'break') {
      mix(low, bass(chord.root, barSeconds * 0.95, 0.6), start, 0.5);
    } else if (lastChord) {
      mix(low, bass(chord.root, barSeconds * 1.6, 0.8), start, 0.55);
    } else if (!ending) {
      const pattern = [
        { step: 0, len: 5, octave: 0 },
        { step: 6, len: 2, octave: 0 },
        { step: 8, len: 3, octave: 0 },
        { step: 11, len: 2, octave: 12 },
        { step: 14, len: 2, octave: 0 },
      ];
      for (const note of pattern) {
        mix(
          low,
          bass(chord.root + note.octave, note.len * sixteenth * 0.9, note.octave ? 0.6 : 0.9),
          at(bar, note.step),
          0.45,
        );
      }
    }

    // Violão dedilhado: abafado na abertura (o tique-taque da dúvida), aberto depois.
    if (!ending) {
      const order = [0, 2, 1, 3, 2, 4, 3, 1];
      const tones = chord.notes.map((note) => note + 12);
      const intro = section === 'intro';
      const steps = intro ? [0, 2, 4, 6, 8, 10, 12, 14] : [0, 2, 3, 6, 8, 10, 11, 14];
      steps.forEach((step, k) => {
        const note = tones[order[k]! % tones.length]!;
        const voice = pluck(note, intro ? 0.45 : 0.55, intro ? 0.985 : 0.996, intro ? 0.5 : 1.4);
        mix(harmony, voice, at(bar, step), intro ? 0.2 + bar * 0.03 : 0.22, k % 2 ? 0.35 : -0.25);
        mix(send, voice, at(bar, step), 0.1);
      });
    }

    // Bateria macia: sustenta sem chamar atenção (a voz é a protagonista).
    const groove = section === 'groove' || section === 'build' || section === 'final';
    if (groove) {
      for (const step of [0, 8]) {
        mix(drums, kick(0.9), at(bar, step), 0.5);
        const from = at(bar, step);
        for (let i = 0; i < seconds(0.22) && from + i < length; i++) {
          duck[from + i] = Math.min(duck[from + i]!, 0.6 + 0.4 * (i / seconds(0.22)) ** 1.5);
        }
      }
      for (const step of [4, 12]) {
        const hand = clap(0.8);
        mix(drums, hand, at(bar, step), 0.2, 0.05);
        mix(send, hand, at(bar, step), 0.12);
      }
      for (let step = 0; step < 16; step += 2) {
        const vel = (step % 4 === 2 ? 0.8 : 0.5) * (0.9 + feel() * 0.2);
        mix(drums, hat(false, vel), at(bar, step) + seconds(step % 4 === 2 ? 0.006 : 0), 0.22, 0.3);
      }
    }
    if (section === 'intro' && bar >= 2) {
      // Chimbal fechado só no tempo: o relógio andando.
      for (let step = 0; step < 16; step += 4) {
        mix(drums, hat(false, 0.5), at(bar, step), 0.18, 0.3);
      }
    }

    // Brilhos de sino no final.
    if (section === 'final' || lastChord) {
      const melody = lastChord
        ? [{ step: 0, note: 84 }]
        : [
            { step: 0, note: 77 },
            { step: 3, note: 79 },
            { step: 6, note: 81 },
            { step: 10, note: bar % 2 ? 84 : 79 },
          ];
      for (const { step, note } of melody) {
        const ring = bell(note, 0.45);
        mix(harmony, ring, at(bar, step), 0.1, 0.2);
        mix(send, ring, at(bar, step), 0.18);
      }
    }
  }

  // Pratos suaves nas grandes viradas: o logo aparece e o final.
  for (const bar of [SCENE_START.respira, SCENE_START.final, END]) {
    const plate = crash(bar === END ? 3.5 : 2.4);
    mix(drums, plate, at(bar), 0.18, -0.2);
    mix(send, plate, at(bar), 0.08);
  }

  for (let i = 0; i < length; i++) {
    harmony.left[i]! *= duck[i]!;
    harmony.right[i]! *= duck[i]!;
  }
  // Graves limpos: corta o que fica abaixo do bumbo nos acordes (some o "embolado").
  for (const side of ['left', 'right'] as const) {
    new Biquad('highpass', 140).process(harmony[side]);
    new Biquad('lowpass', 900).process(low[side]);
  }

  const out = stereo(length);
  mixStereo(out, drums);
  mixStereo(out, harmony);
  mixStereo(out, low);
  mixStereo(out, reverb(send, { room: 0.84, damp: 0.4 }));
  mixStereo(out, reverb(harmony, { room: 0.7, damp: 0.5 }), 0, 0.25);

  // Fim: a última nota soa e some devagar até o último quadro.
  const fadeFrom = at(TOTAL_BARS - 1);
  for (let i = fadeFrom; i < length; i++) {
    const g = 1 - (i - fadeFrom) / (length - fadeFrom);
    out.left[i]! *= g * g;
    out.right[i]! *= g * g;
  }

  // Master: um pouco de saturação, um brilho leve e menos médio-grave (abre espaço pra voz, que
  // mora entre 200 Hz e 3 kHz).
  for (const side of ['left', 'right'] as const) {
    const air = new Biquad('peak', 9000, 0.7, 2);
    const mud = new Biquad('peak', 320, 1, -2);
    const voice = new Biquad('peak', 1800, 0.8, -3);
    const buffer = out[side];
    for (let i = 0; i < length; i++) {
      buffer[i] = Math.tanh(voice.run(air.run(mud.run(buffer[i]! * 1.2))));
    }
  }
  return out;
}
