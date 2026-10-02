import type { ZxcvbnResult } from '@zxcvbn-ts/core';
import { PASSWORD_MIN_LENGTH } from '@/config/auth';

/**
 * Força de senha com o zxcvbn (do Dropbox, versão mantida em TypeScript). Diferente de regras
 * como "tem número e símbolo", ele reconhece senhas comuns, sequências de teclado, datas, nomes e
 * palavras do dicionário (comum + português): "Senha@123" é fraca, "minha loja vai bombar" é forte.
 *
 * O cálculo roda num Web Worker (password-strength.worker.ts): custa de 10 a 60ms por senha no
 * computador (bem mais no celular), e na linha principal travaria a digitação.
 */

export type StrengthScore = 0 | 1 | 2 | 3 | 4;
export type PasswordStrength = { score: StrengthScore; tip?: string };

/** Pedido pro worker: `id` identifica a resposta (as antigas são descartadas). */
export type StrengthRequest = { id: number; password: string; userInputs: string[] };
export type StrengthResponse = { id: number; strength: PasswordStrength };

/** Nota de 0 a 4 e, quando ainda não está boa, uma dica do que melhorar. */
export function toStrength(result: ZxcvbnResult, password: string): PasswordStrength {
  // Abaixo do mínimo nem é aceita: no máximo "fraca", com a dica do tamanho.
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      score: Math.min(result.score, 1) as StrengthScore,
      tip: `Use pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    };
  }
  const score = result.score as StrengthScore;
  if (score >= 3) return { score };
  const { warning, suggestions } = result.feedback;
  return { score, tip: warning || suggestions[0] || 'Adicione mais palavras menos comuns.' };
}

/**
 * Dados da pessoa que não podem virar senha: além do valor inteiro, as partes dele
 * ("ana.souza@gmail.com" também vira "ana.souza", "ana" e "souza"; o zxcvbn não junta sozinho).
 */
export function personalInputs(values: string[]): string[] {
  return values
    .flatMap((value) => [value, value.split('@')[0] ?? '', ...value.split(/[@.\s_+-]+/)])
    .filter((part) => part.length >= 3);
}
