'use client';

import { useEffect, useMemo, useState } from 'react';
import { LiveRegion } from '@/components/ui/live-region';
import { cn } from '@/lib/utils';
import { loadStrengthChecker, toStrength, type StrengthScore } from '../password-strength';

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
  const [check, setCheck] = useState<Awaited<ReturnType<typeof loadStrengthChecker>>>();
  // Além do valor inteiro, as partes dele: "ana.souza@gmail.com" também vira "ana.souza",
  // "ana" e "souza" (o zxcvbn não junta as partes sozinho).
  const inputsKey = userInputs
    .flatMap((value) => [value, value.split('@')[0] ?? '', ...value.split(/[@.\s_+-]+/)])
    .filter((part) => part.length >= 3)
    .join('\n');

  // Só baixa os dicionários quando a pessoa começa a digitar: quem abre a tela e não cria a
  // senha (ou usa o gerenciador de senhas) não paga esse download.
  const hasPassword = password.length > 0;
  useEffect(() => {
    if (!hasPassword || check) return;
    let active = true;
    loadStrengthChecker()
      .then((loaded) => {
        if (active) setCheck(() => loaded);
      })
      // Sem os dicionários o medidor só não aparece; a senha continua sendo validada normalmente.
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [hasPassword, check]);

  const strength = useMemo(
    () =>
      check && password ? toStrength(check(password, inputsKey.split('\n')), password) : undefined,
    [check, password, inputsKey],
  );
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
                  index < filled ? level.bar : 'bg-border',
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
