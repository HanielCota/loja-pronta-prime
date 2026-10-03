import { ONBOARDING_QUESTIONS, type OnboardingAnswers } from '@/config/onboarding';

/** Dados de apoio dos testes da conversa (não entra nas telas). */

export function form(entries: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    for (const item of [value].flat()) data.append(key, item);
  }
  return data;
}

export function question(id: string) {
  const found = ONBOARDING_QUESTIONS.find((item) => item.id === id);
  if (!found) throw new Error(`pergunta ${id} não existe`);
  return found;
}

/** Todas as perguntas respondidas (com respostas válidas). */
export const ALL_ANSWERED: OnboardingAnswers = {
  vendas: 'Nunca vendi',
  motivacao: ['Renda extra'],
  dificuldade: 'Medo de errar',
  categorias: ['Beleza'],
  tempo: 'Até 3 horas',
  nome: 'Ateliê',
  estilo: 'Delicado',
  cor: 'Rosa',
  sentimento: ['Alegres'],
  toque: '',
};
