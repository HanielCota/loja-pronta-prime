/**
 * Gera src/features/brand/logo/icon-paths.ts com os desenhos do Phosphor Icons (licença MIT) que o
 * logo usa, nos três estilos: traço (bold), cheio (fill) e duas cores (duotone). Só os da lista,
 * pra não levar os 1.500 pro navegador. Rode de novo depois de mudar a lista (icon-list.ts).
 *
 *   bun scripts/gerar-desenhos-logo.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { EDITOR_ONLY_ICON_LIST, LOGO_ICON_LIST } from '@/features/brand/logo/icon-list';

const WEIGHTS = ['bold', 'fill', 'duotone'] as const;
const ROOT = 'node_modules/@phosphor-icons/core/assets';
const OUTPUT = 'src/features/brand/logo/icon-paths.ts';

type Path = { d: string; opacity?: number };

/** Os caminhos do desenho nesse estilo (o Phosphor só usa <path>; o "duas cores" tem opacidade). */
function read(name: string, weight: string): Path[] {
  const svg = readFileSync(`${ROOT}/${weight}/${name}-${weight}.svg`, 'utf8');
  const paths = [...svg.matchAll(/<path d="([^"]+)"(?: opacity="([\d.]+)")?\/>/g)].map(
    ([, d, opacity]) => (opacity ? { d: d!, opacity: Number(opacity) } : { d: d! }),
  );
  if (!paths.length) throw new Error(`Sem desenho: ${name} (${weight})`);
  return paths;
}

const names = [
  ...new Set([...LOGO_ICON_LIST, ...EDITOR_ONLY_ICON_LIST].map((icon) => icon.phosphor)),
].toSorted();
const entries = names.map((name) => {
  const weights = Object.fromEntries(WEIGHTS.map((weight) => [weight, read(name, weight)]));
  return `  '${name}': ${JSON.stringify(weights)},`;
});

writeFileSync(
  OUTPUT,
  `// Gerado por scripts/gerar-desenhos-logo.ts a partir do Phosphor Icons (licença MIT).
// Não edite à mão: mude a lista em icon-list.ts e rode o script de novo.
import type { IconPaths } from './icons';

export const ICON_PATHS: Record<string, IconPaths> = {
${entries.join('\n')}
};
`,
);
console.log(`${names.length} desenhos em ${OUTPUT}`);
