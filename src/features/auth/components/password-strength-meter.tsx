'use client';

import { LiveRegion } from '@/components/ui/live-region';
import { cn } from '@/lib/utils';
import type { StrengthScore } from '../password-strength';
import { usePasswordStrength } from '../use-password-strength';

/** Cores com contraste AA no texto (sobre branco); a barra é só reforço visual. */
const LEVELS: Record<StrengthScore, { label: string; bar: string; text: string }> = {
  0: { label: 'Muito fraca', bar: 'bg-red-600', text: 'text-red-700' },
  1: { label: 'Fraca', bar: 'bg-orange-500', text: 'text-orange-700' },
  2: { label: 'Razoável', bar: 'bg-amber-400', text: 'text-amber-700' },
  3: { label: 'Boa', bar: 'bg-green-500', text: 'text-green-700' },
  4: { label: 'Forte', bar: 'bg-green-600', text: 'text-green-700' },
};
const SEGMENTS = 4;

type PasswordStrengthMeterProps = {
  password: string;
  /** Dados da pessoa (ex.: email): senha parecida com eles cai de nível. */
  userInputs?: string[];
  /** Esconde a dica quando o campo já mostra um erro (pra não repetir a mesma coisa). */
  showTip?: boolean;
};

/** "Temperatura" da senha enquanto a pessoa cria: barra, nível em texto e dica. */
export function PasswordStrengthMeter({
  password,
  userInputs = [],
  showTip = true,
}: PasswordStrengthMeterProps) {
  // Calculada fora da linha principal (Web Worker): a digitação nunca trava.
  const strength = usePasswordStrength(password, userInputs);
  const level = strength ? LEVELS[strength.score] : undefined;
  const filled = strength ? Math.max(1, strength.score) : 0;

  return (
    <>
      {strength && level ? (
        <div data-slot="password-strength" className="flex flex-col gap-1.5 px-1">
          <div aria-hidden="true" className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: SEGMENTS }, (_, index) => (
              <span
                key={index}
                className={cn(
                  'h-1.5 rounded-full transition-colors duration-200 motion-reduce:transition-none',
                  index < filled ? level.bar : 'bg-track',
                )}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Força da senha: <span className={cn('font-semibold', level.text)}>{level.label}</span>
            {showTip && strength.tip ? (
              <span className="block text-pretty">{strength.tip}</span>
            ) : null}
          </p>
        </div>
      ) : null}
      {/* Só o nível: anunciar a cada tecla seria falatório. A dica fica no texto visível. */}
      <LiveRegion>{level ? `Força da senha: ${level.label}` : null}</LiveRegion>
    </>
  );
}
