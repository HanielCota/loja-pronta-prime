import { APIError } from 'openai';

/**
 * Falha de um serviço de IA (sem chave, fora do ar, demorou demais, resposta estranha). A tela
 * mostra uma mensagem simples e deixa tentar de novo; o detalhe fica só no log do servidor.
 */
export class AiUnavailableError extends Error {
  /**
   * Se o serviço pode ter cobrado mesmo assim. Uma resposta de erro da API (moderação, limite,
   * fora do ar) não cobra; um tempo esgotado ou uma conexão caída podem ter gerado a imagem do
   * lado de lá. Quem dá cota de volta só devolve quando é `false`.
   */
  readonly mayHaveBilled: boolean;

  constructor(message: string, options?: { cause?: unknown; mayHaveBilled?: boolean }) {
    super(message, options);
    this.name = 'AiUnavailableError';
    this.mayHaveBilled = options?.mayHaveBilled ?? false;
  }
}

/** A API respondeu com um código de erro: o pedido foi recusado antes de gerar (sem cobrança). */
export function rejectedByApi(error: unknown): boolean {
  return error instanceof APIError && typeof error.status === 'number';
}

/** O erro do SDK em uma linha pro log (o status e a mensagem, quando a API respondeu). */
export function describe(error: unknown): string {
  if (error instanceof APIError && error.status) {
    return `${error.status} ${error.message.slice(0, 300)}`;
  }
  return error instanceof Error ? error.message : String(error);
}
