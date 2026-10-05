/**
 * Troca o vídeo de um lugar da jornada, e a legenda (até o painel de vídeos existir).
 *
 *   bun run dev:video <lugar> <arquivo.mp4 | arquivo.webm> [legenda.vtt]
 *
 * Lugares: os de src/config/videos.ts (hoje, "orientacao"). O arquivo vai pro bucket e passa a
 * aparecer na hora; o vídeo antigo do lugar é apagado. A legenda (WebVTT) é opcional.
 */
import { readFile } from 'node:fs/promises';
import { isVideoSlot, VIDEOS } from '@/config/videos';
import { saveCaptions, saveVideo } from '@/features/videos/server/videos';

const [slot, file, captions] = process.argv.slice(2);

if (!slot || !file || !isVideoSlot(slot)) {
  console.error(
    `Uso: bun run dev:video <lugar> <arquivo> [legenda.vtt]\nLugares: ${Object.keys(VIDEOS).join(', ')}`,
  );
  process.exit(1);
}

const saved = await saveVideo(slot, new Uint8Array(await readFile(file)));
if (!saved.ok) {
  console.error(saved.error);
  process.exit(1);
}
if (captions) {
  const withCaptions = await saveCaptions(slot, await readFile(captions, 'utf8'));
  if (!withCaptions.ok) {
    console.error(`O vídeo foi trocado, mas a legenda não: ${withCaptions.error}`);
    process.exit(1);
  }
}
console.info(`Vídeo "${VIDEOS[slot].title}" trocado${captions ? ', com legenda' : ''}.`);
process.exit(0);
