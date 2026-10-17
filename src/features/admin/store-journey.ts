import type { OnboardingAnswers } from '@/config/onboarding';
import { findQuestion, resumeStep } from '@/features/loja-pronta/steps';
import { resumeBrandStep, type BrandDraft } from '@/features/brand/steps';

export const STORE_PHASE_LABELS = [
  'Conversa inicial',
  'Marca da loja',
  'Conta na Shopee',
  'Conexão com a Shopee',
  'Produtos',
  'Publicação',
  'Loja pronta',
] as const;

export type StoreJourneyImage = {
  src: string;
  selected: boolean;
  uploaded?: boolean;
};

/** Diz o próximo passo salvo, sem entrar na conta da aluna nem mudar o progresso dela. */
export function currentStoreStep({
  phase,
  answers,
  brand,
}: {
  phase: number;
  answers: OnboardingAnswers;
  brand: BrandDraft & { completedAt: Date | null };
}): { title: string; detail: string } {
  if (phase === 1) {
    const question = findQuestion(resumeStep(answers));
    return question
      ? { title: 'Responder a próxima pergunta', detail: question.ask }
      : {
          title: 'Revisar as respostas e confirmar o WhatsApp',
          detail: 'Todas as perguntas têm resposta. Falta a aluna enviar a conversa.',
        };
  }
  if (brand.completedAt && !brand.logoImage) {
    return {
      title: 'Criar o logo que falta',
      detail: 'A marca foi confirmada sem logo. A aluna pode criar ou enviar um.',
    };
  }
  if (phase === 2) {
    const titles = {
      nome: 'Escolher o nome da loja',
      logo: 'Criar ou enviar o logo',
      descricao: 'Escrever o texto da loja',
      revisao: 'Revisar e confirmar a marca',
    };
    return {
      title: titles[resumeBrandStep(brand)],
      detail: 'A aluna continua das escolhas que já estão salvas abaixo.',
    };
  }
  if (phase === 3) {
    return {
      title: 'Abrir a conta de vendedora na Shopee',
      detail:
        'A aluna segue o passo a passo e confirma quando a conta de vendedora estiver pronta.',
    };
  }
  if (phase === 4) {
    return {
      title: 'Conectar a conta da Shopee',
      detail:
        'A aluna autoriza a conexão pela própria conta da Shopee quando a conexão estiver disponível.',
    };
  }
  return {
    title: 'Em breve',
    detail:
      phase === 5
        ? 'A escolha dos produtos chega em breve.'
        : phase === 6
          ? 'A publicação automática chega em breve.'
          : 'O acompanhamento das vendas chega em breve. Esta fase não quer dizer que a loja já está na Shopee.',
  };
}
