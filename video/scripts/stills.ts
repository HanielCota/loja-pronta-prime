import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { webpackOverride } from '../webpack-override';

/**
 * Fotos de quadros soltos, pra revisar o visual sem renderizar o vídeo todo.
 *
 *   bun scripts/stills.ts 120 480 900          (os dois formatos)
 *   bun scripts/stills.ts --only=9x16 120 480
 */

const args = process.argv.slice(2);
const only = args.find((arg) => arg.startsWith('--only='))?.slice('--only='.length);
const frames = args.filter((arg) => !arg.startsWith('--')).map(Number);
const root = join(import.meta.dir, '..');
const out = join(root, 'out', 'stills');
mkdirSync(out, { recursive: true });

const serveUrl = await bundle({
  entryPoint: join(root, 'src', 'index.ts'),
  rootDir: root,
  publicDir: join(root, 'public'),
  webpackOverride,
});

for (const id of ['Apresentacao16x9', 'Apresentacao9x16']) {
  if (only && !id.endsWith(only)) continue;
  const composition = await selectComposition({ serveUrl, id });
  for (const frame of frames) {
    const output = join(out, `${id}-${String(frame).padStart(4, '0')}.png`);
    await renderStill({ composition, serveUrl, output, frame, scale: 0.5 });
    console.log(output);
  }
}
