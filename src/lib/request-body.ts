/** Interrompe o recebimento antes que um corpo grande ocupe toda a memória do servidor. */
export class RequestBodyTooLargeError extends Error {}

/** O limite vale para bytes recebidos, mesmo sem Content-Length ou com um valor falso. */
export async function readLimitedBody(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw new RangeError('Limite inválido');
  const length = request.headers.get('content-length');
  if (length && /^\d+$/.test(length) && Number(length) > maxBytes) {
    void request.body?.cancel().catch(() => {});
    throw new RequestBodyTooLargeError();
  }
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  // Um buffer que cresce até o teto, sem guardar milhões de objetos para pedaços minúsculos.
  let body = new Uint8Array(Math.min(maxBytes, 64 * 1024));
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        void reader.cancel().catch(() => {});
        throw new RequestBodyTooLargeError();
      }
      if (received > body.byteLength) {
        const grown = new Uint8Array(Math.min(maxBytes, Math.max(received, body.byteLength * 2)));
        grown.set(body);
        body = grown;
      }
      body.set(value, received - value.byteLength);
    }
  } finally {
    reader.releaseLock();
  }
  return body.subarray(0, received);
}

/** Só entrega o multipart ao parser depois de limitar o corpo inteiro, incluindo os campos. */
export async function readLimitedFormData(request: Request, maxBytes: number): Promise<FormData> {
  const contentType = request.headers.get('content-type');
  if (!contentType || !/^multipart\/form-data\s*;/i.test(contentType)) {
    throw new TypeError('Formulário inválido');
  }
  const bytes = await readLimitedBody(request, maxBytes);
  return new Request(request.url, {
    method: 'POST',
    headers: { 'content-type': contentType },
    body: new Blob([bytes]),
  }).formData();
}
