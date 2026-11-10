/**
 * A mensagem de erro de uma promessa que precisa falhar, esperada com `await` comum.
 *
 * Por que não `await expect(promise).rejects.toThrow(...)`: o Bun não devolve uma promessa ali.
 * O matcher fica parado esperando a promessa e gira o laço de eventos por dentro (laço aninhado).
 * No Windows, esse laço aninhado às vezes perde o aviso de que chegou a resposta de um socket do
 * Postgres: o banco já respondeu, os bytes estão no socket, mas o `pg` nunca lê. A consulta fica
 * pendurada pra sempre e o `pool.end()` do `afterAll` também. Com `await` comum, quem lê o socket
 * é o laço principal, como na aplicação.
 *
 * Use quando a promessa consulta o banco. Compare com `toContain`, que confere o mesmo trecho da
 * mensagem que o `toThrow('...')` conferia.
 */
export async function rejectionMessage(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error('A promessa devia ter falhado, mas deu certo.');
}
