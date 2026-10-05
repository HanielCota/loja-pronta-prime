import { Biquad, RATE, midiHz, random, saw, seconds } from './dsp';

/**
 * Os instrumentos: cada um devolve uma nota (mono). Pequenas variações sorteadas em cada nota
 * (afinação, ataque, brilho) fazem o som parecer tocado, não colado.
 */

const TAU = Math.PI * 2;
const humanize = random(7);

/** Piano elétrico (FM, tipo Rhodes): o calor dos acordes. */
export function keys(note: number, length: number, velocity = 0.8): Float32Array {
  const tail = 1.2;
  const out = new Float32Array(seconds(length + tail));
  const f = midiHz(note) * (1 + (humanize() - 0.5) * 0.002);
  const bright = 0.7 + velocity * 0.8;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const index = bright * (1.6 * Math.exp(-t * 4) + 0.25);
    const tine = 0.5 * Math.exp(-t * 18) * velocity;
    const modulator = Math.sin(TAU * f * t) * index + Math.sin(TAU * f * 14 * t) * tine;
    const env = Math.min(1, t / 0.004) * Math.exp(-t * 1.1);
    const release = t > length ? Math.exp(-(t - length) * 6) : 1;
    // Um leve vibrato de amplitude (tremolo), como o do Rhodes de verdade.
    const tremolo = 1 - 0.08 * (0.5 + 0.5 * Math.sin(TAU * 4.6 * t));
    out[i] = Math.sin(TAU * f * t + modulator) * env * release * tremolo * velocity;
  }
  return out;
}

/** Colchão de fundo: dois dentes de serra desafinados, abafados, que entram devagar. */
export function pad(note: number, length: number, cutoff = 1400): Float32Array {
  const attack = 0.35;
  const releaseTime = 0.9;
  const out = new Float32Array(seconds(length + releaseTime));
  const f = midiHz(note);
  const detunes = [-0.006, 0.006, 0];
  const phases = detunes.map(() => humanize());
  const low1 = new Biquad('lowpass', cutoff, 0.6);
  const low2 = new Biquad('lowpass', cutoff * 1.4, 0.6);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    let value = 0;
    detunes.forEach((detune, k) => {
      const step = (f * (1 + detune) * (k === 2 ? 0.5 : 1)) / RATE;
      phases[k] = (phases[k]! + step) % 1;
      value += saw(phases[k]!, step) * (k === 2 ? 0.6 : 1);
    });
    const env =
      Math.min(1, t / attack) * (t > length ? Math.exp(-(t - length) * (5 / releaseTime)) : 1);
    out[i] = low2.run(low1.run(value * 0.3)) * env;
  }
  return out;
}

/** Baixo: senoide redonda com um pouco de harmônico pra aparecer no celular. */
export function bass(note: number, length: number, velocity = 1): Float32Array {
  const out = new Float32Array(seconds(length + 0.08));
  const f = midiHz(note);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / 0.006) * (0.75 + 0.25 * Math.exp(-t * 6));
    const release = t > length ? Math.exp(-(t - length) * 60) : 1;
    const body =
      Math.sin(TAU * f * t) + 0.22 * Math.sin(TAU * f * 2 * t) + 0.06 * Math.sin(TAU * f * 3 * t);
    out[i] = Math.tanh(body * 1.3) * env * release * velocity;
  }
  return out;
}

/** Corda dedilhada (Karplus-Strong): o arpejo. Soa como um violão/kalimba de verdade. */
export function pluck(note: number, velocity = 0.8, damping = 0.996, length = 1.6): Float32Array {
  const out = new Float32Array(seconds(length));
  const period = Math.max(2, Math.round(RATE / midiHz(note)));
  const line = new Float32Array(period);
  const noise = random(note * 31 + Math.floor(humanize() * 1000));
  // Ruído abafado na excitação: ataque macio, sem "clic".
  let previous = 0;
  for (let i = 0; i < period; i++) {
    const x = noise() * 2 - 1;
    previous = previous * 0.5 + x * 0.5;
    line[i] = previous;
  }
  let index = 0;
  for (let i = 0; i < out.length; i++) {
    const current = line[index]!;
    const next = line[(index + 1) % period]!;
    line[index] = ((current + next) / 2) * damping;
    out[i] = current * velocity;
    index = (index + 1) % period;
  }
  return new Biquad('highpass', 120).process(out);
}

/** Sino (FM inarmônico): os brilhos do final e o "check" de cada fase. */
export function bell(note: number, velocity = 0.7, length = 2.2): Float32Array {
  const out = new Float32Array(seconds(length));
  const f = midiHz(note);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const index = 2.2 * Math.exp(-t * 3);
    const env = Math.min(1, t / 0.002) * Math.exp(-t * 2.4);
    out[i] = Math.sin(TAU * f * t + Math.sin(TAU * f * 3.5 * t) * index) * env * velocity;
  }
  return out;
}

/* Bateria. */

export function kick(velocity = 1): Float32Array {
  const out = new Float32Array(seconds(0.5));
  const noise = random(11);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const f = 48 + 120 * Math.exp(-t * 32);
    phase += f / RATE;
    const body = Math.sin(TAU * phase) * Math.exp(-t * 5.5);
    const click = (noise() * 2 - 1) * Math.exp(-t * 900) * 0.35;
    out[i] = Math.tanh((body + click) * 1.6) * velocity;
  }
  return out;
}

export function clap(velocity = 1): Float32Array {
  const out = new Float32Array(seconds(0.35));
  const noise = random(Math.floor(humanize() * 1e6));
  const band = new Biquad('bandpass', 1300, 0.9);
  const air = new Biquad('highpass', 600);
  // Três batidas de mão quase juntas e o rabo: é isso que faz soar como palma, não como chiado.
  const bursts = [0, 0.011, 0.022];
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    let env = Math.exp(-(t - 0.022) * 22) * (t >= 0.022 ? 1 : 0);
    for (const at of bursts)
      if (t >= at && t < at + 0.011) env = Math.max(env, Math.exp(-(t - at) * 220));
    out[i] = air.run(band.run((noise() * 2 - 1) * env * 2.2)) * velocity;
  }
  return out;
}

export function hat(open = false, velocity = 1): Float32Array {
  const length = open ? 0.35 : 0.06;
  const out = new Float32Array(seconds(length));
  const noise = random(Math.floor(humanize() * 1e6));
  const high = new Biquad('highpass', 7500, 0.8);
  const shine = new Biquad('peak', 10_000, 1, 4);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const env = Math.exp(-t * (open ? 11 : 75));
    out[i] = shine.run(high.run(noise() * 2 - 1)) * env * velocity * 0.5;
  }
  return out;
}

export function shaker(velocity = 1): Float32Array {
  const out = new Float32Array(seconds(0.09));
  const noise = random(Math.floor(humanize() * 1e6));
  const band = new Biquad('bandpass', 5200, 1.2);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / 0.012) * Math.exp(-t * 45);
    out[i] = band.run(noise() * 2 - 1) * env * velocity;
  }
  return out;
}

/** Prato: ruído agudo e metal (quadradas inarmônicas, como na 808). */
export function crash(length = 2.4, velocity = 1): Float32Array {
  const out = new Float32Array(seconds(length));
  const noise = random(99);
  const high = new Biquad('highpass', 3500, 0.7);
  const metal = [205.3, 304.4, 369.6, 522.7, 540, 800];
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    let tone = 0;
    for (const f of metal) tone += Math.sign(Math.sin(TAU * f * 1.7 * t));
    const env = Math.min(1, t / 0.002) * Math.exp(-t * (2.2 / length) * 1.6);
    out[i] = high.run((noise() * 2 - 1) * 0.8 + tone * 0.06) * env * velocity * 0.6;
  }
  return out;
}

/* Golpe de corte (usado no efeito "hit"). */

/** Kick de trap: clique forte e corpo curto, saturado. */
export function kickHard(velocity = 1): Float32Array {
  const out = new Float32Array(seconds(0.35));
  const noise = random(21);
  const click = new Biquad('highpass', 2500);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    phase += (55 + 240 * Math.exp(-t * 45)) / RATE;
    const body = Math.sin(TAU * phase) * Math.exp(-t * 9);
    const snap = click.run(noise() * 2 - 1) * Math.exp(-t * 500) * 0.9;
    out[i] = Math.tanh((body + snap) * 2.4) * velocity;
  }
  return out;
}
