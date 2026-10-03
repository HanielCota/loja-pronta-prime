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
