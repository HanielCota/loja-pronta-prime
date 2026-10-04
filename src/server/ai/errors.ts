import { APIError } from 'openai';

/**
 * Falha de um serviço de IA (sem chave, fora do ar, demorou demais, resposta estranha). A tela
 * mostra uma mensagem simples e deixa tentar de novo; o detalhe fica só no log do servidor.
 */
export class AiUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AiUnavailableError';
  }
}

/** O erro do SDK em uma linha pro log (o status e a mensagem, quando a API respondeu). */
export function describe(error: unknown): string {
  if (error instanceof APIError && error.status) {
    return `${error.status} ${error.message.slice(0, 300)}`;
  }
  return error instanceof Error ? error.message : String(error);
}
