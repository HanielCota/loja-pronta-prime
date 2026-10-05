import {
  Biquad,
  RATE,
  fadeEdges,
  mix,
  normalize,
  random,
  reverb,
  reversed,
  seconds,
  stereo,
  type Stereo,
} from './dsp';
import { BAR, FPS } from '../src/timeline';
import { bell, crash, kickHard } from './instruments';

/**
 * Os efeitos do vídeo. Discretos de propósito: acompanham o movimento da tela (o toque, a
 * passagem, o "deu certo") sem chamar atenção pra si. Alguns têm variações, pra repetição não
 * soar robótica.
 */

const TAU = Math.PI * 2;

/** Passagem de ar (troca de cena): ruído numa faixa que sobe e desce, cruzando de um lado pro outro. */
function whoosh(length: number, seed: number, low = 300, high = 3200): Stereo {
  const out = stereo(seconds(length));
  const noise = random(seed);
  const band = new Biquad('bandpass', low, 1.4);
  const body = new Biquad('lowpass', 2000, 0.7);
  for (let i = 0; i < out.left.length; i++) {
    const p = i / out.left.length;
    const shape = Math.sin(Math.PI * p) ** 2;
    band.set(low + (high - low) * Math.sin(Math.PI * Math.min(1, p * 1.15)));
    const x = band.run(noise() * 2 - 1) * 1.6 + body.run(noise() * 2 - 1) * 0.15;
    const pan = -0.8 + 1.6 * p;
    out.left[i] = x * shape * Math.cos(((pan + 1) * Math.PI) / 4);
    out.right[i] = x * shape * Math.sin(((pan + 1) * Math.PI) / 4);
  }
  return out;
}

/** Bolha que estoura: a pergunta que aparece. */
function pop(pitch: number): Stereo {
  const out = stereo(seconds(0.16));
  const tone = new Float32Array(out.left.length);
  let phase = 0;
  for (let i = 0; i < tone.length; i++) {
    const t = i / RATE;
    const f = pitch * (0.6 + 1.1 * (1 - Math.exp(-t * 90)));
    phase += f / RATE;
    tone[i] = Math.sin(TAU * phase) * Math.min(1, t / 0.002) * Math.exp(-t * 38);
  }
  mix(out, tone, 0, 0.8);
  return out;
}

/** Toque na tela: um clique curtinho com corpo, como o do iPhone. */
function tap(seed: number, pitch = 1): Stereo {
  const out = stereo(seconds(0.07));
  const noise = random(seed);
  const band = new Biquad('bandpass', 3200 * pitch, 2);
  const mono = new Float32Array(out.left.length);
  for (let i = 0; i < mono.length; i++) {
    const t = i / RATE;
    const click = band.run(noise() * 2 - 1) * Math.exp(-t * 700) * 1.5;
    const thump = Math.sin(TAU * 900 * pitch * t) * Math.exp(-t * 120) * 0.5;
    mono[i] = click + thump;
  }
  mix(out, mono, 0, 0.8);
  return out;
}

/** Tecla (digitando o nome). */
function key(seed: number): Stereo {
  const out = stereo(seconds(0.05));
  const noise = random(seed);
  const band = new Biquad('bandpass', 2400 + seed * 137, 1.5);
  const mono = new Float32Array(out.left.length);
  for (let i = 0; i < mono.length; i++) {
    const t = i / RATE;
    mono[i] = band.run(noise() * 2 - 1) * Math.exp(-t * 260) * 1.4;
  }
  mix(out, mono, 0, 0.7, (seed % 3) * 0.15 - 0.15);
  return out;
}

/** Sobe (antes do logo): ruído que abre e um tom que sobe, crescendo até cortar seco. */
function riser(length: number): Stereo {
  const out = stereo(seconds(length));
  const noise = random(5);
  const band = new Biquad('bandpass', 400, 1.1);
  let phase = 0;
  for (let i = 0; i < out.left.length; i++) {
    const p = i / out.left.length;
    band.set(300 + 5000 * p ** 2);
    const swell = p ** 2.4;
    phase += (180 + 700 * p ** 2) / RATE;
    const x = band.run(noise() * 2 - 1) * 1.4 * swell + Math.sin(TAU * phase) * 0.18 * swell;
    out.left[i] = x * (1 + 0.1 * Math.sin(TAU * 3 * p));
    out.right[i] = x * (1 - 0.1 * Math.sin(TAU * 3 * p));
  }
  return out;
}

/** Impacto suave (o logo chega): grave que cai e um "ar" que se espalha na sala. */
function impact(): Stereo {
  const out = stereo(seconds(2.5));
  const noise = random(8);
  const air = new Biquad('lowpass', 1800, 0.7);
  const mono = new Float32Array(out.left.length);
  let phase = 0;
  for (let i = 0; i < mono.length; i++) {
    const t = i / RATE;
    phase += (38 + 70 * Math.exp(-t * 14)) / RATE;
    const boom = Math.sin(TAU * phase) * Math.exp(-t * 2.6);
    const thud = air.run(noise() * 2 - 1) * Math.exp(-t * 18) * 0.6;
    mono[i] = Math.tanh((boom + thud) * 1.4);
  }
  mix(out, mono, 0, 0.7);
  const room = stereo(mono.length);
  mix(room, mono, 0, 0.6);
  const tail = reverb(room, { room: 0.88, damp: 0.3 });
  for (let i = 0; i < mono.length; i++) {
    out.left[i]! += tail.left[i]! * 0.5;
    out.right[i]! += tail.right[i]! * 0.5;
  }
  return out;
}

/** Brilhos (o logo pronto, o final): plinks agudos espalhados no estéreo. */
function sparkle(seed: number): Stereo {
  const out = stereo(seconds(1.8));
  const pick = random(seed);
  const notes = [96, 100, 103, 105, 108, 103, 100];
  notes.forEach((note, k) => {
    const ring = bell(note + (pick() > 0.7 ? 12 : 0), 0.25 + pick() * 0.2, 1.2);
    mix(out, ring, seconds(k * 0.055 + pick() * 0.02), 0.5, pick() * 1.6 - 0.8);
  });
  const tail = reverb(out, { room: 0.8, damp: 0.3 });
  for (let i = 0; i < out.left.length; i++) {
    out.left[i]! += tail.left[i]! * 0.6;
    out.right[i]! += tail.right[i]! * 0.6;
  }
  return out;
}

/** "Deu certo": um sino de duas notas, como uma notificação. */
function success(): Stereo {
  const out = stereo(seconds(1.8));
  mix(out, bell(84, 0.5, 1.6), 0, 0.6, -0.15);
  mix(out, bell(91, 0.5, 1.6), seconds(0.09), 0.6, 0.15);
  const tail = reverb(out, { room: 0.75, damp: 0.4 });
  for (let i = 0; i < out.left.length; i++) {
    out.left[i]! += tail.left[i]! * 0.5;
    out.right[i]! += tail.right[i]! * 0.5;
  }
  return out;
}

/** Os "checks" das etapas: notas subindo (escala de Fá maior pentatônica). */
function check(step: number): Stereo {
  const scale = [77, 79, 81, 84, 86, 89, 91];
  const out = stereo(seconds(1.2));
  mix(out, bell(scale[step % scale.length]!, 0.45, 1.1), 0, 0.6);
  mix(out, pop(500 + step * 60).left, 0, 0.3);
  return out;
}

/** Golpe de corte: grave seco que cai, estalo e um rabo de sala. O som do corte "na cara". */
function hit(): Stereo {
  const out = stereo(seconds(1.4));
  const noise = random(31);
  const crack = new Biquad('bandpass', 2200, 0.7);
  const mono = new Float32Array(out.left.length);
  let phase = 0;
  for (let i = 0; i < mono.length; i++) {
    const t = i / RATE;
    phase += (42 + 160 * Math.exp(-t * 22)) / RATE;
    const boom = Math.sin(TAU * phase) * Math.exp(-t * 4.5);
    const crackle = crack.run(noise() * 2 - 1) * Math.exp(-t * 60) * 1.4;
    mono[i] = Math.tanh((boom * 1.4 + crackle) * 2);
  }
  const kick = kickHard(1);
  for (let i = 0; i < kick.length; i++) mono[i]! += kick[i]! * 0.5;
  mix(out, mono, 0, 0.7);
  const room = reverb(out, { room: 0.85, damp: 0.35 });
  for (let i = 0; i < mono.length; i++) {
    out.left[i]! += room.left[i]! * 0.35;
    out.right[i]! += room.right[i]! * 0.35;
  }
  return out;
}

/** Sub que despenca (por baixo dos drops). */
function subDrop(): Stereo {
  const out = stereo(seconds(1.6));
  const mono = new Float32Array(out.left.length);
  let phase = 0;
  for (let i = 0; i < mono.length; i++) {
    const t = i / RATE;
    phase += (30 + 70 * Math.exp(-t * 2.2)) / RATE;
    mono[i] = Math.tanh(Math.sin(TAU * phase) * 2.5) * Math.min(1, t / 0.005) * Math.exp(-t * 1.6);
  }
  mix(out, mono, 0, 0.8);
  return out;
}

/** Whip: passagem de ar curtíssima e aguda (o "chicote" dos cortes rápidos). */
function whip(seed: number, length = 0.2): Stereo {
  return whoosh(length, seed + 40, 1200, 7500);
}

/**
 * Glitch: picotes de ruído e onda quadrada, ligados e desligados em rajada (a "falha digital"
 * que acompanha a tela tremendo em cores).
 */
function glitch(seed: number): Stereo {
  const out = stereo(seconds(0.28));
  const pick = random(seed * 7 + 1);
  const crush = 6 + Math.floor(pick() * 10);
  let held = 0;
  let gate = 1;
  let freq = 200 + pick() * 1200;
  for (let i = 0; i < out.left.length; i++) {
    if (i % seconds(0.018) === 0) {
      gate = pick() > 0.3 ? 1 : 0;
      freq = 150 + pick() * 2400;
    }
    // Redução de taxa: segura a amostra por alguns passos (o som "quebrado").
    if (i % crush === 0)
      held = (pick() * 2 - 1) * 0.6 + Math.sign(Math.sin((TAU * freq * i) / RATE)) * 0.5;
    const env = Math.exp(-(i / RATE) * 6);
    const pan = Math.sin(i / 900) * 0.7;
    out.left[i] = held * gate * env * (1 - pan) * 0.7;
    out.right[i] = held * gate * env * (1 + pan) * 0.7;
  }
  return out;
}

/** Reverse: o prato de trás pra frente, que suga até o corte (termina no fim do arquivo). */
function reverse(): Stereo {
  const out = stereo(seconds(0.8));
  const plate = reversed(crash(0.8));
  mix(out, plate, 0, 0.8);
  const room = reverb(out, { room: 0.6, damp: 0.5 });
  for (let i = 0; i < out.left.length; i++) {
    out.left[i]! += room.left[i]! * 0.3;
    out.right[i]! += room.right[i]! * 0.3;
  }
  return out;
}

/** Snap: estalo seco (as palavras batendo na tela). */
function snap(seed: number): Stereo {
  const out = stereo(seconds(0.09));
  const noise = random(seed + 90);
  const band = new Biquad('bandpass', 2800 + seed * 400, 1.4);
  const mono = new Float32Array(out.left.length);
  for (let i = 0; i < mono.length; i++) {
    const t = i / RATE;
    mono[i] =
      band.run(noise() * 2 - 1) * Math.exp(-t * 90) * 2 +
      Math.sin(TAU * 180 * t) * Math.exp(-t * 60) * 0.6;
  }
  mix(out, mono, 0, 0.8, (seed % 3) * 0.2 - 0.2);
  return out;
}

/** Tudo que o vídeo usa, pelo nome do arquivo (sem a extensão). */
export function effects(): Record<string, Stereo> {
  const list: Record<string, Stereo> = {
    'whoosh-1': whoosh(0.55, 1),
    'whoosh-2': whoosh(0.5, 2, 400, 4200),
    'whoosh-3': whoosh(0.75, 3, 200, 2400),
    'swipe-1': whoosh(0.28, 4, 900, 5200),
    'swipe-2': whoosh(0.3, 6, 700, 4600),
    // O riser sobe por 1,75 compasso e termina na parada seca antes do drop.
    riser: riser(((BAR / FPS) * 7) / 4),
    hit: hit(),
    'sub-drop': subDrop(),
    reverse: reverse(),
    impact: impact(),
    'sparkle-1': sparkle(1),
    'sparkle-2': sparkle(2),
    success: success(),
  };
  [520, 600, 680, 760, 840].forEach((pitch, k) => {
    list[`pop-${k + 1}`] = pop(pitch);
  });
  [1, 2, 3, 4].forEach((seed, k) => {
    list[`tap-${k + 1}`] = tap(seed, 0.9 + k * 0.07);
  });
  [1, 2, 3, 4, 5, 6].forEach((seed) => {
    list[`key-${seed}`] = key(seed);
  });
  for (let step = 0; step < 7; step++) list[`check-${step + 1}`] = check(step);
  for (let k = 1; k <= 3; k++) {
    list[`whip-${k}`] = whip(k, 0.16 + k * 0.03);
    list[`glitch-${k}`] = glitch(k);
    list[`snap-${k}`] = snap(k);
  }
  // Os golpes caem junto com o bumbo e o prato da música: saem mais baixos pra soma não estourar.
  const quieter: Record<string, number> = { hit: -8, 'sub-drop': -7, reverse: -5 };
  for (const name of Object.keys(list)) {
    list[name] = fadeEdges(normalize(list[name]!, quieter[name] ?? -3));
  }
  return list;
}
