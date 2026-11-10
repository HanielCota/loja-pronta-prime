import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { Glob } from 'bun';

/**
 * Guarda dos testes de integração: barra `expect(promise).rejects` e `.resolves`.
 *
 * No Bun esses matchers esperam a promessa girando o laço de eventos por dentro. No Windows esse
 * laço aninhado às vezes perde a resposta do Postgres, e o teste e o `pool.end()` travam pra
 * sempre. Use `rejection`/`rejectionMessage` de `tests/support/rejection.ts` (ou um `await` comum
 * no lugar de `.resolves`). O motivo completo está no comentário desse arquivo.
 */
test('testes de integração não usam .rejects nem .resolves', () => {
  const offenders = [...new Glob('tests/integration/**/*.ts').scanSync('.')].flatMap((path) =>
    readFileSync(path, 'utf8')
      .split('\n')
      .flatMap((line, index) =>
        /\.(rejects|resolves)\b/.test(line)
          ? [`${path.replaceAll('\\', '/')}:${index + 1}: ${line.trim()}`]
          : [],
      ),
  );
  expect(offenders).toEqual([]);
});
