'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

/** A fala é curta: reduz a espera e impede que uma gravação esquecida continue aberta. */
const MAX_RECORDING_MS = 45_000;
type SpeechStatus = 'idle' | 'starting' | 'recording' | 'transcribing';
type TranscriptResponse = { text?: string; error?: string };

const noSubscribe = () => () => {};

function canRecord(): boolean {
  return (
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof window.MediaRecorder === 'function' &&
    Boolean(recordingMimeType())
  );
}

/** Um formato que o navegador grava e a transcrição aceita. */
function recordingMimeType(): string | undefined {
  for (const mime of [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ]) {
    if (MediaRecorder.isTypeSupported?.(mime)) return mime;
  }
  return undefined;
}

/** Grava, envia só depois de parar e coloca a transcrição no campo para ela revisar. */
export function useSpeechInput(onText: (text: string) => void) {
  const supported = useSyncExternalStore(noSubscribe, canRecord, () => false);
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [error, setError] = useState<string>();
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef<AbortController | null>(null);
  const active = useRef(false);
  const onTextRef = useRef(onText);

  useEffect(() => {
    onTextRef.current = onText;
  });

  const releaseMicrophone = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    recorder.current = null;
  }, []);

  // Saiu da tela: solta o microfone e cancela a requisição; não altera o campo desmontado.
  useEffect(
    () => () => {
      active.current = false;
      request.current?.abort();
      if (recorder.current?.state === 'recording') recorder.current.stop();
      releaseMicrophone();
    },
    [releaseMicrophone],
  );

  const stop = useCallback(() => {
    if (recorder.current?.state === 'recording') {
      setStatus('transcribing');
      recorder.current.stop();
    }
  }, []);

  const start = useCallback(
    async (before: string) => {
      if (active.current || !canRecord()) return;
      active.current = true;
      setError(undefined);
      setStatus('starting');
      try {
        const microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!active.current) {
          microphone.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.current = microphone;
        const mimeType = recordingMimeType();
        const current = new MediaRecorder(microphone, mimeType ? { mimeType } : undefined);
        const chunks: BlobPart[] = [];
        let recordingFailed = false;
        recorder.current = current;
        current.addEventListener('dataavailable', (event) => {
          if (event.data.size) chunks.push(event.data);
        });
        current.addEventListener('error', () => {
          recordingFailed = true;
          setError('Não consegui gravar. Tente de novo ou escreva.');
          if (current.state === 'recording') {
            current.stop();
          } else {
            releaseMicrophone();
            active.current = false;
            setStatus('idle');
          }
        });
        current.addEventListener('stop', async () => {
          releaseMicrophone();
          if (!active.current) return;
          if (recordingFailed) {
            active.current = false;
            setStatus('idle');
            return;
          }
          const format = current.mimeType || mimeType;
          const extension = format?.startsWith('audio/mp4')
            ? 'mp4'
            : format?.startsWith('audio/ogg')
              ? 'ogg'
              : format?.startsWith('audio/webm')
                ? 'webm'
                : null;
          if (!format || !extension) {
            setError('Este navegador não conseguiu gravar num formato aceito. Tente outro.');
            setStatus('idle');
            active.current = false;
            return;
          }
          const audio = new Blob(chunks, { type: format });
          if (!audio.size) {
            setError('Não ouvi nada. Toque no microfone e fale de novo.');
            setStatus('idle');
            active.current = false;
            return;
          }
          setStatus('transcribing');
          const controller = new AbortController();
          request.current = controller;
          let visibleError = 'Não consegui transcrever. Tente de novo ou escreva.';
          try {
            const form = new FormData();
            form.set('audio', audio, `fala.${extension}`);
            const response = await fetch('/loja-pronta/marca/transcrever', {
              method: 'POST',
              body: form,
              signal: controller.signal,
            });
            const result = (await response.json().catch(() => ({}))) as TranscriptResponse;
            if (!response.ok || !result.text?.trim()) {
              visibleError = result.error || visibleError;
              throw new Error('Transcrição sem texto');
            }
            const spoken = result.text.replace(/\s+/g, ' ').trim();
            onTextRef.current([before.trim(), spoken].filter(Boolean).join(' '));
          } catch {
            if (!controller.signal.aborted) setError(visibleError);
          } finally {
            request.current = null;
            active.current = false;
            setStatus('idle');
          }
        });
        current.start();
        setStatus('recording');
        timer.current = setTimeout(stop, MAX_RECORDING_MS);
      } catch (problem) {
        releaseMicrophone();
        active.current = false;
        setStatus('idle');
        setError(
          problem instanceof DOMException &&
            (problem.name === 'NotAllowedError' || problem.name === 'PermissionDeniedError')
            ? 'Libere o microfone pra este site e tente de novo.'
            : 'Não consegui ligar o microfone. Tente de novo ou escreva.',
        );
      }
    },
    [releaseMicrophone, stop],
  );

  return { supported, status, error, start, stop };
}
