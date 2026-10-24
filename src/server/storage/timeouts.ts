/** Prazo para o bucket aceitar a conexão. */
export const CONNECTION_TIMEOUT_MS = 5_000;

/** Prazo para a resposta começar, quando o pedido não leva um arquivo grande. */
export const REQUEST_TIMEOUT_MS = 15_000;

/**
 * A menor velocidade de envio que ainda conta como bucket respondendo (1 MB/s). No envio, o prazo
 * vale até o bucket responder, e ele só responde depois de receber o arquivo inteiro: um vídeo de
 * 500 MB não chega em 15 s.
 */
const MIN_UPLOAD_BYTES_PER_MS = (1024 * 1024) / 1000;

/** Prazo de um envio: o prazo normal mais o tempo de mandar o arquivo na menor velocidade aceita. */
export function uploadTimeoutMs(bytes: number): number {
  return REQUEST_TIMEOUT_MS + Math.ceil(Math.max(0, bytes) / MIN_UPLOAD_BYTES_PER_MS);
}
