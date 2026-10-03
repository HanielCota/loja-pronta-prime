import type { JsonChat } from '@/server/ai/chat';
import type { ImageGenerator } from '@/server/ai/images';

/**
 * Respostas de mentira pro chat e pra imagem (AI_FAKE=1, nos testes e2e): sem custo, sem internet
 * e sempre iguais. Depois de duas respostas dela, o resumo fica pronto.
 */
export const fakeJsonChat: JsonChat = async (messages) => {
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
