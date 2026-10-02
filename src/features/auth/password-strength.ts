import type { ZxcvbnResult } from '@zxcvbn-ts/core';
import { PASSWORD_MIN_LENGTH } from '@/config/auth';

/**
 * Força de senha com o zxcvbn (do Dropbox, versão mantida em TypeScript). Diferente de regras
 * como "tem número e símbolo", ele reconhece senhas comuns, sequências de teclado, datas, nomes e
 * palavras do dicionário (comum + português): "Senha@123" é fraca, "minha loja vai bombar" é forte.
 */

export type StrengthScore = 0 | 1 | 2 | 3 | 4;
type PasswordStrength = { score: StrengthScore; tip?: string };
type Checker = (password: string, userInputs: string[]) => ZxcvbnResult;

let checker: Promise<Checker> | undefined;

/** Os dicionários são grandes: carregam só nas telas de criar senha, e uma vez só. */
export function loadStrengthChecker(): Promise<Checker> {
  checker ??= Promise.all([
    import('@zxcvbn-ts/core'),
    import('@zxcvbn-ts/language-common'),
    import('@zxcvbn-ts/language-pt-br'),
  ])
    .then(([core, common, portuguese]): Checker => {
      const zxcvbn = new core.ZxcvbnFactory({
        translations: portuguese.translations,
        graphs: common.adjacencyGraphs,
        dictionary: { ...common.dictionary, ...portuguese.dictionary },
        useLevenshteinDistance: true,
      });
      return (password, userInputs) => zxcvbn.check(password, userInputs);
    })
    .catch((error: unknown) => {
      // Falhou (ex.: internet instável no celular): a próxima tela que pedir tenta de novo.
      checker = undefined;
      throw error;
    });
  return checker;
}

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
