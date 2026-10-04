import type { JsonChat } from '@/server/ai/chat';
import { AiUnavailableError } from '@/server/ai/errors';
import type { ImageGenerator } from '@/server/ai/images';

/**
 * Respostas de mentira pro chat e pra imagem (AI_FAKE=1, nos testes e2e): sem custo, sem internet
 * e sempre iguais. Depois de duas respostas dela, o resumo fica pronto.
 */
/** A mensagem que faz a IA de mentira falhar uma vez (pra testar o "Tentar de novo"). */
export const FAKE_FAILURE_MESSAGE = 'simular falha';
/** Conversas que acabaram de falhar (e quando): o "Tentar de novo" logo depois responde. */
const failedAt = new Map<string, number>();
const RETRY_WINDOW_MS = 60_000;

export const fakeJsonChat: JsonChat = async (messages) => {
  // "simular falha": falha na primeira vez e responde no "Tentar de novo" (a mesma conversa,
  // logo depois). Por conversa e com prazo, pra uma falha sem nova tentativa não mudar o próximo
  // teste.
  if (messages.at(-1)?.content === FAKE_FAILURE_MESSAGE) {
    const key = JSON.stringify(messages);
    const failed = failedAt.get(key);
    if (failed !== undefined && Date.now() - failed < RETRY_WINDOW_MS) {
      failedAt.delete(key);
    } else {
      failedAt.set(key, Date.now());
      throw new AiUnavailableError('falha de mentira (teste)');
    }
  }
  const answers = messages.filter((message) => message.role === 'user').length;
  if (answers < 2) {
    return JSON.stringify({
      reply: 'Que cores você quer no logo?',
      suggestions: ['Rosa e dourado', 'Azul e branco'],
      brief: null,
    });
  }
  return JSON.stringify({
    reply:
      'Perfeito! Vai ser uma patinha rosa com o nome em letra delicada. Toque em Criar meu logo.',
    suggestions: ['Quero mudar a cor'],
    brief: {
      symbol: 'uma patinha',
      colors: 'rosa e dourado',
      lettering: 'delicada',
      mood: 'acolhedor',
      background: 'branco',
      look: 'ilustracao',
    },
  });
};

/** Um PNG quadrado de 8×8 cor-de-rosa (válido, pra a tela e o download funcionarem). */
const FAKE_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP4/+M/VsQwKoEXAQB3h5ZJ6UMsdwAAAABJRU5ErkJggg==';

export const fakeImage: ImageGenerator = async () =>
  new Uint8Array(Buffer.from(FAKE_PNG, 'base64'));
