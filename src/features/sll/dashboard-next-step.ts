export type SllPathStepId = 'welcome' | 'method' | 'courses';

export type SllPathStepInput = {
  id: SllPathStepId;
  /** Sem aula publicada ainda: o passo aparece como "em breve", sem link. */
  href: string | null;
};

export type SllWelcomeProgress = {
  completed: number;
  total: number;
};

export type SllNextStep = {
  id: SllPathStepId;
  href: string;
  /** Como o botão chama: começar do zero, continuar ou rever o que já terminou. */
  mode: 'start' | 'continue' | 'review' | 'open';
};

function isWelcomeDone(progress: SllWelcomeProgress | null): boolean {
  if (!progress) return false;
  if (progress.total === 0) return false;
  return progress.completed >= progress.total;
}

function welcomeMode(progress: SllWelcomeProgress | null): SllNextStep['mode'] {
  if (!progress) return 'start';
  if (progress.completed === 0) return 'start';
  return 'continue';
}

/**
 * O passo em destaque no painel: as boas-vindas até a aluna terminar; depois, o primeiro passo
 * aberto do caminho. Terminou tudo o que está publicado: as boas-vindas ficam pra rever.
 */
export function chooseSllNextStep(
  steps: readonly SllPathStepInput[],
  welcomeProgress: SllWelcomeProgress | null,
): SllNextStep | null {
  const welcome = steps.find((step) => step.id === 'welcome');
  const welcomeDone = isWelcomeDone(welcomeProgress);

  if (welcome?.href && !welcomeDone) {
    return { id: 'welcome', href: welcome.href, mode: welcomeMode(welcomeProgress) };
  }

  const nextOpen = steps.find((step) => step.id !== 'welcome' && step.href !== null);
  if (nextOpen?.href) return { id: nextOpen.id, href: nextOpen.href, mode: 'open' };

  if (welcome?.href) return { id: 'welcome', href: welcome.href, mode: 'review' };

  return null;
}
