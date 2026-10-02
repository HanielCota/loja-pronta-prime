import { useEffect, useRef, useState } from 'react';
import {
  personalInputs,
  type PasswordStrength,
  type StrengthRequest,
  type StrengthResponse,
} from './password-strength';

/** Espera a pessoa dar uma pausa antes de recalcular (digitando rápido, só a última conta). */
const DEBOUNCE_MS = 150;

/**
 * Força da senha calculada num Web Worker, fora da linha principal: a digitação nunca espera.
 *
 * - O worker (com os dicionários) só é criado na primeira tecla: quem abre a tela e não digita,
 *   ou usa o gerenciador de senhas, não baixa nada.
 * - Enquanto a nova nota é calculada, a anterior continua na tela (sem piscar a cada tecla).
 * - Respostas que chegam depois de uma mais nova são descartadas.
 */
export function usePasswordStrength(
  password: string,
  userInputs: string[] = [],
): PasswordStrength | undefined {
  const [strength, setStrength] = useState<PasswordStrength>();
  const workerRef = useRef<Worker | null>(null);
  const failedRef = useRef(false);
  const latestIdRef = useRef(0);
  const inputsKey = personalInputs(userInputs).join('\n');

  useEffect(() => {
    if (!password || failedRef.current) return;
    const timer = window.setTimeout(() => {
      if (!workerRef.current) {
        const worker = new Worker(new URL('./password-strength.worker.ts', import.meta.url), {
          type: 'module',
        });
        worker.addEventListener('message', ({ data }: MessageEvent<StrengthResponse>) => {
          if (data.id === latestIdRef.current) setStrength(data.strength);
        });
        // Sem o worker (ex.: falha de rede ao baixar os dicionários): o medidor só não aparece;
        // a senha continua sendo validada normalmente.
        worker.addEventListener('error', () => {
          failedRef.current = true;
          worker.terminate();
          workerRef.current = null;
        });
        workerRef.current = worker;
      }
      const request: StrengthRequest = {
        id: ++latestIdRef.current,
        password,
        userInputs: inputsKey.split('\n'),
      };
      // postMessage de worker não tem "targetOrigin" (isso é do postMessage entre janelas).
      // oxlint-disable-next-line unicorn/require-post-message-target-origin
      workerRef.current.postMessage(request);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [password, inputsKey]);

  // Fecha o worker ao sair da tela.
  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    [],
  );

  return password ? strength : undefined;
}
