import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ambient } from './ambient';
import { normalize, wav } from './dsp';
import { music } from './music';
import { effects } from './sfx';

/**
 * Gera as trilhas (a do vídeo longo e a ambiente do curto) e os efeitos em public/audio. Rode de novo sempre que mudar a linha do tempo
 * (src/timeline.ts ou src/reel/timeline.ts): a música é arranjada nas cenas.
 *
 *   bun scripts/make-audio.ts
 */

const folder = join(import.meta.dir, '..', 'public', 'audio');
mkdirSync(folder, { recursive: true });

const started = performance.now();
writeFileSync(join(folder, 'trilha.wav'), wav(normalize(music(), -1)));
writeFileSync(join(folder, 'ambiente.wav'), wav(normalize(ambient(), -1)));
for (const [name, sound] of Object.entries(effects())) {
  writeFileSync(join(folder, `${name}.wav`), wav(sound));
}
console.log(`Áudio gerado em ${Math.round(performance.now() - started)} ms: ${folder}`);
