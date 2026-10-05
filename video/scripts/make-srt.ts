import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LINES } from '../src/narration';
import { FPS, NARRATION } from '../src/timeline';

/**
 * A legenda da narração em .srt (o que a voz diz, no tempo dela), pra subir junto no YouTube,
 * Instagram ou na página de vendas: quem assiste sem som ou não ouve bem também acompanha.
 *
 *   bun scripts/make-srt.ts
 */

const pad = (value: number, size = 2) => String(value).padStart(size, '0');

const time = (frame: number) => {
  const ms = Math.round((frame / FPS) * 1000);
  return `${pad(Math.floor(ms / 3_600_000))}:${pad(Math.floor(ms / 60_000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
};

const blocks = LINES.map((line, index) => {
  const text = NARRATION[index]!.text;
  return `${index + 1}
${time(line.from)} --> ${time(line.until + 6)}
${text}
`;
});

const folder = join(import.meta.dir, '..', 'out');
mkdirSync(folder, { recursive: true });
writeFileSync(join(folder, 'loja-pronta-prime.srt'), blocks.join('\n'));
console.log(blocks.join('\n'));
