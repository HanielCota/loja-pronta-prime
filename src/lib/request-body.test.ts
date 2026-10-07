import { describe, expect, test } from 'bun:test';
import { readLimitedBody, readLimitedFormData, RequestBodyTooLargeError } from './request-body';

// O Node exige duplex em corpos transmitidos; a tipagem DOM ainda não inclui essa opção.
const STREAM_OPTIONS: RequestInit & { duplex: 'half' } = { duplex: 'half' };

function streamedRequest(chunks: Uint8Array[], headers?: HeadersInit, cancelled?: () => void) {
  return new Request('http://localhost/upload', {
    method: 'POST',
    ...(headers ? { headers } : {}),
    body: new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
      ...(cancelled ? { cancel: cancelled } : {}),
    }),
    ...STREAM_OPTIONS,
  });
}

describe('limite do corpo recebido', () => {
  test('aceita o tamanho exato, inclusive em vários pedaços e sem cabeçalho', async () => {
    const request = streamedRequest([new Uint8Array([1, 2]), new Uint8Array([3])]);
    expect(await readLimitedBody(request, 3)).toEqual(new Uint8Array([1, 2, 3]));
  });

  test.each([undefined, '1', 'inválido'])(
    'barra bytes além do limite com Content-Length %s',
    async (length) => {
      const request = streamedRequest(
        [new Uint8Array(2), new Uint8Array(3)],
        length ? { 'content-length': length } : undefined,
      );
      await expect(readLimitedBody(request, 4)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
      expect(request.body?.locked).toBe(false);
    },
  );

  test('cancela a origem sem continuar lendo o corpo excedente', async () => {
    let cancelled = false;
    const request = new Request('http://localhost/upload', {
      method: 'POST',
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(5));
        },
        cancel() {
          cancelled = true;
        },
      }),
      ...STREAM_OPTIONS,
    });
    await expect(readLimitedBody(request, 4)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
    expect(cancelled).toBe(true);
  });

  test('recusa tamanho declarado excessivo antes de ler', async () => {
    const request = streamedRequest([new Uint8Array(1)], { 'content-length': '1000' });
    await expect(readLimitedBody(request, 4)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  test('propaga falha da conexão e libera o leitor', async () => {
    const request = new Request('http://localhost/upload', {
      method: 'POST',
      body: new ReadableStream({
        start(controller) {
          controller.error(new Error('Rede'));
        },
      }),
      ...STREAM_OPTIONS,
    });
    await expect(readLimitedBody(request, 10)).rejects.toThrow('Rede');
    expect(request.body?.locked).toBe(false);
  });

  test('formulário mantém campos e arquivo após limitar o corpo', async () => {
    const form = new FormData();
    form.set('alt', 'Minha imagem');
    form.set('file', new File(['conteúdo'], 'material.txt', { type: 'text/plain' }));
    const parsed = await readLimitedFormData(
      new Request('http://localhost/upload', { method: 'POST', body: form }),
      4096,
    );
    expect(parsed.get('alt')).toBe('Minha imagem');
    expect(await (parsed.get('file') as File).text()).toBe('conteúdo');
  });

  test('limita também campos multipart e recusa formato incorreto', async () => {
    const form = new FormData();
    form.set('extra', 'x'.repeat(2000));
    await expect(
      readLimitedFormData(
        new Request('http://localhost/upload', { method: 'POST', body: form }),
        1000,
      ),
    ).rejects.toBeInstanceOf(RequestBodyTooLargeError);
    await expect(
      readLimitedFormData(
        new Request('http://localhost/upload', { method: 'POST', body: '{}' }),
        1000,
      ),
    ).rejects.toBeInstanceOf(TypeError);
  });

  test('conta bytes de UTF-8, não caracteres', async () => {
    await expect(
      readLimitedBody(new Request('http://localhost/webhook', { method: 'POST', body: 'ááá' }), 5),
    ).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  test('muitos pedaços pequenos e crescimento do buffer mantêm os bytes corretos', async () => {
    const chunks = Array.from({ length: 70_000 }, (_, index) => new Uint8Array([index % 256]));
    const body = await readLimitedBody(streamedRequest(chunks), 70_000);
    expect(body.byteLength).toBe(70_000);
    expect(body.every((value, index) => value === index % 256)).toBe(true);
  });
});
