import { spawn } from 'node:child_process';

// Um container possui os dois processos. Se um cair, a hospedagem reinicia o conjunto.
const children = new Set();
let stopping = false;
let exitCode = 0;
let killTimer;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  exitCode = code;
  for (const child of children) child.kill('SIGTERM');
  killTimer = setTimeout(() => {
    for (const child of children) child.kill('SIGKILL');
  }, 30_000);
  killTimer.unref();
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => stop());
function start(file) {
  const child = spawn(process.execPath, [file], {
    stdio: 'inherit',
    env: { ...process.env, HOSTNAME: '0.0.0.0' },
  });
  children.add(child);
  return new Promise((resolve) => {
    child.once('error', () => {
      stop(1);
    });
    child.once('close', (code) => {
      children.delete(child);
      resolve(code ?? 1);
      if (!children.size && stopping) {
        clearTimeout(killTimer);
        process.exitCode = exitCode;
      }
    });
  });
}
// Função própria pra sair cedo quando a migração falha, sem subir o servidor nem o worker.
async function run() {
  const migrated = await start('migrate.cjs');
  if (migrated !== 0 || stopping) {
    process.exitCode = migrated || exitCode;
    return;
  }
  await Promise.all(
    ['server.js', 'assistant-worker.cjs'].map(async (file) => {
      const code = await start(file);
      if (!stopping) {
        console.error(`[runtime] ${file} encerrou; reiniciando a aplicação.`);
        stop(code || 1);
      }
    }),
  );
}
await run();
