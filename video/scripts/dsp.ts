/**
 * Peças de som pra trilha e os efeitos do vídeo, tudo sintetizado aqui (sem banco de sons nem
 * IA): assim não há licença pra conferir e cada som pode ser afinado pro vídeo. Funções puras
 * sobre Float32Array, a 48 kHz.
 */

export const RATE = 48_000;

export type Stereo = { left: Float32Array; right: Float32Array };

export const seconds = (s: number) => Math.round(s * RATE);
export const midiHz = (note: number) => 440 * 2 ** ((note - 69) / 12);

export function stereo(length: number): Stereo {
  return { left: new Float32Array(length), right: new Float32Array(length) };
}

/** Sorteio com semente: o mesmo áudio toda vez que o script roda. */
export function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Soma `source` (mono) em `target` a partir de `at`, com volume e posição no estéreo (-1 a 1). */
export function mix(target: Stereo, source: Float32Array, at: number, gain = 1, pan = 0) {
  // Pan de potência constante: o som não "some" no meio.
  const angle = ((pan + 1) * Math.PI) / 4;
  const gl = Math.cos(angle) * gain * Math.SQRT2;
  const gr = Math.sin(angle) * gain * Math.SQRT2;
  const end = Math.min(source.length, target.left.length - at);
  for (let i = Math.max(0, -at); i < end; i++) {
    target.left[at + i]! += source[i]! * gl;
    target.right[at + i]! += source[i]! * gr;
  }
}

export function mixStereo(target: Stereo, source: Stereo, at = 0, gain = 1) {
  const end = Math.min(source.left.length, target.left.length - at);
  for (let i = Math.max(0, -at); i < end; i++) {
    target.left[at + i]! += source.left[i]! * gain;
    target.right[at + i]! += source.right[i]! * gain;
  }
}

/** Filtro biquad (as receitas do RBJ): corta graves, agudos ou deixa passar uma faixa. */
export class Biquad {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;

  constructor(
    private type: 'lowpass' | 'highpass' | 'bandpass' | 'peak',
    freq: number,
    private q = Math.SQRT1_2,
    private gainDb = 0,
  ) {
    this.set(freq);
  }

  set(freq: number) {
    const w = (2 * Math.PI * Math.min(freq, RATE * 0.45)) / RATE;
    const cos = Math.cos(w);
    const alpha = Math.sin(w) / (2 * this.q);
    let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
    if (this.type === 'lowpass') {
      b0 = (1 - cos) / 2;
      b1 = 1 - cos;
      b2 = b0;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
    } else if (this.type === 'highpass') {
      b0 = (1 + cos) / 2;
      b1 = -(1 + cos);
      b2 = b0;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
    } else if (this.type === 'bandpass') {
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
    } else {
      const a = 10 ** (this.gainDb / 40);
      b0 = 1 + alpha * a;
      b1 = -2 * cos;
      b2 = 1 - alpha * a;
      a0 = 1 + alpha / a;
      a1 = -2 * cos;
      a2 = 1 - alpha / a;
    }
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }

  run(x: number) {
    const y =
      this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }

  process(buffer: Float32Array) {
    for (let i = 0; i < buffer.length; i++) buffer[i] = this.run(buffer[i]!);
    return buffer;
  }
}

/** Dente de serra sem o chiado digital (polyBLEP), pros acordes de fundo. */
export function saw(phase: number, step: number) {
  let value = 2 * phase - 1;
  if (phase < step) {
    const t = phase / step;
    value -= t + t - t * t - 1;
  } else if (phase > 1 - step) {
    const t = (phase - 1) / step;
    value -= t * t + t + t + 1;
  }
  return value;
}

/**
 * Reverb (Freeverb): oito ecos em pente e quatro difusores por lado. É o que tira o som "seco"
 * de computador e põe tudo na mesma sala.
 */
export function reverb(input: Stereo, { room = 0.82, damp = 0.35, wet = 1 } = {}): Stereo {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const allpasses = [556, 441, 341, 225];
  const scale = RATE / 44_100;
  const out = stereo(input.left.length);
  for (const [side, spread] of [
    ['left', 0],
    ['right', 23],
  ] as const) {
    const source = input[side];
    const target = out[side];
    const combState = combs.map((size) => ({
      buffer: new Float32Array(Math.round((size + spread) * scale)),
      index: 0,
      store: 0,
    }));
    const allState = allpasses.map((size) => ({
      buffer: new Float32Array(Math.round((size + spread) * scale)),
      index: 0,
    }));
    for (let i = 0; i < source.length; i++) {
      const x = source[i]! * 0.015;
      let sum = 0;
      for (const comb of combState) {
        const y = comb.buffer[comb.index]!;
        comb.store = y * (1 - damp) + comb.store * damp;
        comb.buffer[comb.index] = x + comb.store * room;
        comb.index = (comb.index + 1) % comb.buffer.length;
        sum += y;
      }
      for (const all of allState) {
        const buffered = all.buffer[all.index]!;
        all.buffer[all.index] = sum + buffered * 0.5;
        sum = buffered - sum;
        all.index = (all.index + 1) % all.buffer.length;
      }
      target[i] = sum * wet;
    }
  }
  return out;
}

/** Saturação suave: segura os picos sem estalar, como uma fita. */
export const soft = (x: number) => Math.tanh(x);

/** Deixa o pico em `peakDb` (abaixo de 0 dB, pra não distorcer em nenhum player). */
export function normalize(buffer: Stereo, peakDb = -1) {
  let peak = 0;
  for (let i = 0; i < buffer.left.length; i++) {
    peak = Math.max(peak, Math.abs(buffer.left[i]!), Math.abs(buffer.right[i]!));
  }
  if (peak === 0) return buffer;
  const gain = 10 ** (peakDb / 20) / peak;
  for (let i = 0; i < buffer.left.length; i++) {
    buffer.left[i]! *= gain;
    buffer.right[i]! *= gain;
  }
  return buffer;
}

/** Entradas e saídas sem estalo: um fade curtinho nas pontas. */
export function fadeEdges(buffer: Stereo, inSeconds = 0.003, outSeconds = 0.02) {
  const fadeIn = seconds(inSeconds);
  const fadeOut = seconds(outSeconds);
  const n = buffer.left.length;
  for (let i = 0; i < Math.min(fadeIn, n); i++) {
    const g = i / fadeIn;
    buffer.left[i]! *= g;
    buffer.right[i]! *= g;
  }
  for (let i = 0; i < Math.min(fadeOut, n); i++) {
    const g = i / fadeOut;
    buffer.left[n - 1 - i]! *= g;
    buffer.right[n - 1 - i]! *= g;
  }
  return buffer;
}

const sample = (x: number) => Math.round(Math.max(-1, Math.min(1, x)) * 32767);

/** WAV de 16 bits, estéreo. */
export function wav(buffer: Stereo): Uint8Array {
  const n = buffer.left.length;
  const data = new DataView(new ArrayBuffer(44 + n * 4));
  const text = (at: number, value: string) => {
    for (let i = 0; i < value.length; i++) data.setUint8(at + i, value.charCodeAt(i));
  };
  text(0, 'RIFF');
  data.setUint32(4, 36 + n * 4, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  data.setUint32(16, 16, true);
  data.setUint16(20, 1, true);
  data.setUint16(22, 2, true);
  data.setUint32(24, RATE, true);
  data.setUint32(28, RATE * 4, true);
  data.setUint16(32, 4, true);
  data.setUint16(34, 16, true);
  text(36, 'data');
  data.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) {
    data.setInt16(44 + i * 4, sample(buffer.left[i]!), true);
    data.setInt16(46 + i * 4, sample(buffer.right[i]!), true);
  }
  return new Uint8Array(data.buffer);
}

/** O som de trás pra frente (o "reverse" que puxa pro corte). */
export function reversed(source: Float32Array): Float32Array {
  return source.toReversed();
}
