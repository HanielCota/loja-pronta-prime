import { expect, test } from 'bun:test';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const script = path.resolve('scripts/start-production.mjs');
async function fixture(migration: string, server: string, worker: string) {
  const folder = await mkdtemp(path.join(tmpdir(), 'loja-runtime-'));
  await Promise.all([
    writeFile(path.join(folder, 'migrate.cjs'), migration),
    writeFile(path.join(folder, 'server.js'), server),
    writeFile(path.join(folder, 'assistant-worker.cjs'), worker),
  ]);
  return folder;
}
test('a falha do migrador impede iniciar web e worker', async () => {
  const folder = await fixture(
    'process.exit(9)',
    "require('fs').writeFileSync('web-started', 'yes')",
    "require('fs').writeFileSync('worker-started', 'yes')",
  );
  try {
    const child = Bun.spawn(['node', script], { cwd: folder, stdout: 'pipe', stderr: 'pipe' });
    expect(await child.exited).toBe(9);
    expect(await Bun.file(path.join(folder, 'web-started')).exists()).toBe(false);
    expect(await Bun.file(path.join(folder, 'worker-started')).exists()).toBe(false);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
test('a queda do worker encerra a web para a hospedagem reiniciar o conjunto', async () => {
  const folder = await fixture(
    '',
    "require('fs').writeFileSync('web-started', 'yes');process.on('SIGTERM',()=>{require('fs').writeFileSync('web-stopped', 'yes');process.exit(0)});setInterval(()=>{},1000)",
    'setTimeout(()=>process.exit(7),500)',
  );
  try {
    const child = Bun.spawn(['node', script], { cwd: folder, stdout: 'pipe', stderr: 'pipe' });
    expect(await child.exited).toBe(7);
    expect(await readFile(path.join(folder, 'web-started'), 'utf8')).toBe('yes');
    expect(await readFile(path.join(folder, 'web-stopped'), 'utf8')).toBe('yes');
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
