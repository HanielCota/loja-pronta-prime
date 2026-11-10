import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { BRAND_FONTS } from '../src/features/brand/fonts';

const runtimeDirectory = path.resolve('build/runtime');

// A pasta é uma saída descartável do build; limpar evita publicar arquivos de uma versão antiga.
await rm(runtimeDirectory, { recursive: true, force: true });
await cp('.next/standalone', runtimeDirectory, { recursive: true, dereference: true });
await Promise.all([
  cp('scripts/start-production.mjs', path.join(runtimeDirectory, 'start-production.mjs')),
  cp('public', path.join(runtimeDirectory, 'public'), { recursive: true }),
  cp('assets/fonts', path.join(runtimeDirectory, 'assets/fonts'), { recursive: true }),
  cp('.next/static', path.join(runtimeDirectory, '.next/static'), { recursive: true }),
  cp('drizzle', path.join(runtimeDirectory, 'drizzle'), { recursive: true }),
  cp('data/sll/tools', path.join(runtimeDirectory, 'data/sll/tools'), { recursive: true }),
]);

// A rota escolhe a fonte em tempo de execução; o rastreamento do Next não encontra esses caminhos.
for (const font of BRAND_FONTS) {
  const destination = path.join(runtimeDirectory, 'node_modules', font.file);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(path.join('node_modules', font.file), destination);
}

// Cada comando do runtime vira um arquivo só, sem as ferramentas de desenvolvimento na imagem.
// Os pacotes não dependem uns dos outros: saem em paralelo.
const bundles = [
  // O migrador usa o mesmo histórico do Drizzle Kit, sem carregar o CLI e suas ferramentas.
  {
    entry: 'scripts/migrate-production.ts',
    name: 'migrate.cjs',
    failure: 'Falha ao preparar o migrador.',
  },
  {
    entry: 'scripts/run-assistant-worker.ts',
    name: 'assistant-worker.cjs',
    failure: 'Falha ao preparar a rotina do assistente.',
    external: ['sharp'],
  },
  {
    entry: 'scripts/check-store-automation.ts',
    name: 'automation-check.cjs',
    failure: 'Falha ao preparar diagnóstico.',
  },
  // Comandos de manutenção que vão na imagem, mas nunca rodam durante o deploy.
  {
    entry: 'scripts/set-student-password.ts',
    name: 'set-student-password.mjs',
    failure: 'Failed to prepare student password maintenance.',
  },
  {
    entry: 'scripts/import-legacy-stores.ts',
    name: 'import-legacy-stores.mjs',
    failure: 'Failed to prepare legacy store import.',
  },
  {
    entry: 'scripts/import-sales-history.ts',
    name: 'import-sales-history.mjs',
    failure: 'Failed to prepare historical sales import.',
  },
  {
    entry: 'scripts/reconcile-manual-access.ts',
    name: 'reconcile-manual-access.mjs',
    failure: 'Failed to prepare manual access review.',
  },
];

// allSettled: espera todos terminarem e mostra cada pacote que falhou, não só o primeiro.
const results = await Promise.allSettled(
  bundles.map(async (bundle) => {
    const result = await Bun.build({
      entrypoints: [bundle.entry],
      outdir: runtimeDirectory,
      naming: bundle.name,
      target: 'node',
      format: bundle.name.endsWith('.cjs') ? 'cjs' : 'esm',
      external: ['pg-native', ...(bundle.external ?? [])],
      minify: true,
    });
    if (!result.success) throw new AggregateError(result.logs, bundle.failure);
  }),
);
const failures = results.flatMap((result) =>
  result.status === 'rejected' ? [result.reason as unknown] : [],
);
if (failures.length)
  throw new AggregateError(
    failures,
    failures
      .map((failure) => (failure instanceof Error ? failure.message : String(failure)))
      .join(' '),
  );

console.log(
  'Server, assets, fonts, migrations, worker and maintenance commands prepared in build/runtime.',
);
