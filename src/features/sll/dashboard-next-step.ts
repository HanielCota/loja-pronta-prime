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

type OpenSllPathStep = SllPathStepInput & { href: string };

// Passo sem link (null ou vazio) é "em breve": nunca vira destaque.
function isOpen(step: SllPathStepInput | undefined): step is OpenSllPathStep {
  return Boolean(step?.href);
}

// Contagem quebrada (NaN, negativa) vale como zero: melhor mandar começar do que travar.
function safeCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  return value;
}

function isWelcomeDone(progress: SllWelcomeProgress | null): boolean {
  if (!progress) return false;
  const total = safeCount(progress.total);
  if (total === 0) return false;
  return safeCount(progress.completed) >= total;
}

function welcomeMode(progress: SllWelcomeProgress | null): SllNextStep['mode'] {
  if (!progress) return 'start';
  if (safeCount(progress.completed) === 0) return 'start';
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

  if (isOpen(welcome) && !welcomeDone) {
    return { id: 'welcome', href: welcome.href, mode: welcomeMode(welcomeProgress) };
  }

  const nextOpen = steps.find((step) => step.id !== 'welcome' && isOpen(step));
  if (isOpen(nextOpen)) return { id: nextOpen.id, href: nextOpen.href, mode: 'open' };

  if (isOpen(welcome)) return { id: 'welcome', href: welcome.href, mode: 'review' };

  return null;
}
