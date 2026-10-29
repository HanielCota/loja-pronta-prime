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

// O migrador usa o mesmo histórico do Drizzle Kit, sem carregar o CLI e suas ferramentas na imagem.
const result = await Bun.build({
  entrypoints: ['scripts/migrate-production.ts'],
  outdir: runtimeDirectory,
  naming: 'migrate.cjs',
  target: 'node',
  format: 'cjs',
  external: ['pg-native'],
  minify: true,
});
if (!result.success) throw new AggregateError(result.logs, 'Falha ao preparar o migrador.');

const worker = await Bun.build({
  entrypoints: ['scripts/run-assistant-worker.ts'],
  outdir: runtimeDirectory,
  naming: 'assistant-worker.cjs',
  target: 'node',
  format: 'cjs',
  external: ['pg-native', 'sharp'],
  minify: true,
});
if (!worker.success)
  throw new AggregateError(worker.logs, 'Falha ao preparar a rotina do assistente.');
const diagnostic = await Bun.build({
  entrypoints: ['scripts/check-store-automation.ts'],
  outdir: runtimeDirectory,
  naming: 'automation-check.cjs',
  target: 'node',
  format: 'cjs',
  external: ['pg-native'],
  minify: true,
});
if (!diagnostic.success)
  throw new AggregateError(diagnostic.logs, 'Falha ao preparar diagnóstico.');

// Include the one-time maintenance command without running it during deployment.
const passwordMaintenance = await Bun.build({
  entrypoints: ['scripts/set-student-password.ts'],
  outdir: runtimeDirectory,
  naming: 'set-student-password.mjs',
  target: 'node',
  format: 'esm',
  external: ['pg-native'],
  minify: true,
});
if (!passwordMaintenance.success)
  throw new AggregateError(
    passwordMaintenance.logs,
    'Failed to prepare student password maintenance.',
  );

const legacyImport = await Bun.build({
  entrypoints: ['scripts/import-legacy-stores.ts'],
  outdir: runtimeDirectory,
  naming: 'import-legacy-stores.mjs',
  target: 'node',
  format: 'esm',
  external: ['pg-native'],
  minify: true,
});
if (!legacyImport.success)
  throw new AggregateError(legacyImport.logs, 'Failed to prepare legacy store import.');

const salesImport = await Bun.build({
  entrypoints: ['scripts/import-sales-history.ts'],
  outdir: runtimeDirectory,
  naming: 'import-sales-history.mjs',
  target: 'node',
  format: 'esm',
  external: ['pg-native'],
  minify: true,
});
if (!salesImport.success)
  throw new AggregateError(salesImport.logs, 'Failed to prepare historical sales import.');

console.log(
  'Server, assets, fonts, migrations, worker and maintenance commands prepared in build/runtime.',
);

// Ship the evidence-based access review command, but never execute it during build.
const manualAccessReview = await Bun.build({
  entrypoints: ['scripts/reconcile-manual-access.ts'],
  outdir: runtimeDirectory,
  naming: 'reconcile-manual-access.mjs',
  target: 'node',
  format: 'esm',
  external: ['pg-native'],
  minify: true,
});
if (!manualAccessReview.success)
  throw new AggregateError(manualAccessReview.logs, 'Failed to prepare manual access review.');
