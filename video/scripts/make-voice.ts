import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NARRATION } from '../src/timeline';

/**
 * Gera a narração com a voz da OpenAI (uma fala por cena, em public/voice) e o tempo de cada
 * palavra (src/voice.json), pela transcrição da própria fala: é o que faz a legenda acender
 * junto com a voz. Custa centavos; as falas que já existem não são geradas de novo.
 *
 *   bun scripts/make-voice.ts            (só as falas que faltam)
 *   bun scripts/make-voice.ts --force    (todas de novo, ex.: mudou a voz ou o jeito de falar)
 *
 * Cada fala passa por um tratamento de locução (compressor e volume no ponto, polish), feito
 * aqui mesmo: a voz da OpenAI chega baixa e com o volume variando de palavra pra palavra.
 *
 * A chave vem de OPENAI_API_KEY ou do .env.local da raiz do projeto.
 */

/** A voz e o jeito de falar. */
const MODEL = 'gpt-4o-mini-tts';
const VOICE = 'coral';
const INSTRUCTIONS =
  'Fale em português do Brasil, com sotaque brasileiro natural. Tom acolhedor, confiante e animado, ' +
  'como uma amiga explicando algo simples num vídeo de apresentação. Ritmo natural e fluido, um ' +
  'pouco mais rápido que uma conversa calma, com pausas bem curtas. Sem exagero e sem soar como locutor.';

const root = join(import.meta.dir, '..');
const folder = join(root, 'public', 'voice');
const timingFile = join(root, 'src', 'voice.json');
const force = process.argv.includes('--force');

function apiKey(): string {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const env = join(root, '..', '.env.local');
  const line = existsSync(env)
    ? readFileSync(env, 'utf8')
        .split('\n')
        .find((entry) => entry.startsWith('OPENAI_API_KEY='))
    : undefined;
  const key = line?.slice('OPENAI_API_KEY='.length).trim();
  if (!key) throw new Error('Falta a OPENAI_API_KEY (no ambiente ou no .env.local da raiz).');
  return key;
}

const key = apiKey();
const headers = { Authorization: `Bearer ${key}` };

async function speak(input: string): Promise<ArrayBuffer> {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      voice: VOICE,
      input,
      instructions: INSTRUCTIONS,
      response_format: 'wav',
    }),
  });
  if (!response.ok) throw new Error(`Voz: ${response.status} ${await response.text()}`);
  return response.arrayBuffer();
}

type Word = { word: string; start: number; end: number };

/**
 * Tratamento de locução num WAV PCM de 16 bits: compressor (segura as palavras mais fortes e
 * traz as fracas pra frente) e o pico em -1 dB. Devolve o WAV tratado.
 */
function polish(bytes: Uint8Array): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  let rate = 24_000;
  let channels = 1;
  while (offset + 8 <= bytes.length) {
    const id = String.fromCharCode(...bytes.slice(offset, offset + 4));
    let size = view.getUint32(offset + 4, true);
    if (id === 'fmt ') {
      channels = view.getUint16(offset + 10, true);
      rate = view.getUint32(offset + 12, true);
    }
    if (id === 'data') {
      // Algumas respostas em fluxo vêm com o tamanho "desconhecido" (0xFFFFFFFF): vai até o fim.
      if (size === 0xffffffff || offset + 8 + size > bytes.length) size = bytes.length - offset - 8;
      const count = Math.floor(size / 2);
      const samples = new Float32Array(count);
      for (let i = 0; i < count; i++) samples[i] = view.getInt16(offset + 8 + i * 2, true) / 32768;
      const attack = Math.exp(-1 / (0.005 * rate * channels));
      const release = Math.exp(-1 / (0.08 * rate * channels));
      const threshold = 10 ** (-24 / 20);
      let envelope = 0;
      let peak = 0;
      for (let i = 0; i < count; i++) {
        const level = Math.abs(samples[i]!);
        envelope =
          level > envelope
            ? attack * envelope + (1 - attack) * level
            : release * envelope + (1 - release) * level;
        // Razão 3:1 acima de -24 dB.
        const gain =
          envelope > threshold ? (threshold * (envelope / threshold) ** (1 / 3)) / envelope : 1;
        samples[i]! *= gain;
        peak = Math.max(peak, Math.abs(samples[i]!));
      }
      const makeup = peak > 0 ? 10 ** (-1 / 20) / peak : 1;
      for (let i = 0; i < count; i++) {
        const value = Math.max(-1, Math.min(1, samples[i]! * makeup));
        view.setInt16(offset + 8 + i * 2, Math.round(value * 32767), true);
      }
      view.setUint32(offset + 4, count * 2, true);
      view.setUint32(4, offset + count * 2, true);
      return bytes.slice(0, offset + 8 + count * 2);
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error('WAV sem dados');
}

async function words(audio: ArrayBuffer): Promise<{ words: Word[]; duration: number }> {
  const form = new FormData();
  form.append('file', new Blob([audio], { type: 'audio/wav' }), 'fala.wav');
  form.append('model', 'whisper-1');
  form.append('language', 'pt');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers,
    body: form,
  });
  if (!response.ok) throw new Error(`Transcrição: ${response.status} ${await response.text()}`);
  const result = (await response.json()) as { words?: Word[]; duration: number };
  return { words: result.words ?? [], duration: result.duration };
}

/**
 * O tempo de cada palavra da legenda. A transcrição pode separar diferente do texto (o "S L L"
 * vira três palavras), então cada palavra da legenda pega o tempo da palavra falada na mesma
 * proporção da frase.
 */
function align(text: string, spoken: Word[], duration: number) {
  const shown = text.split(' ');
  if (spoken.length === 0) {
    return shown.map((word, index) => ({
      word,
      start: (index / shown.length) * duration,
      end: ((index + 1) / shown.length) * duration,
    }));
  }
  return shown.map((word, index) => {
    const from = spoken[Math.floor((index / shown.length) * spoken.length)]!;
    const to = spoken[Math.max(0, Math.ceil(((index + 1) / shown.length) * spoken.length) - 1)]!;
    return { word, start: from.start, end: to.end };
  });
}

mkdirSync(folder, { recursive: true });
const timing: Record<
  string,
  { duration: number; words: { word: string; start: number; end: number }[] }
> = existsSync(timingFile) ? JSON.parse(readFileSync(timingFile, 'utf8')) : {};

for (const line of NARRATION) {
  const file = join(folder, `${line.scene}.wav`);
  if (!force && existsSync(file) && timing[line.scene]) continue;
  const speech = 'speech' in line ? line.speech : line.text;
  const audio = await speak(speech);
  writeFileSync(file, polish(new Uint8Array(audio)));
  const heard = await words(audio);
  timing[line.scene] = {
    duration: heard.duration,
    words: align(line.text, heard.words, heard.duration),
  };
  console.log(`${line.scene}: ${heard.duration.toFixed(2)}s`);
}

writeFileSync(timingFile, `${JSON.stringify(timing, null, 2)}\n`);
