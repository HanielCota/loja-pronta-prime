'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

/**
 * Falar em vez de escrever: o reconhecimento de voz do próprio navegador (Chrome, Edge, Safari),
 * em português. O que ela fala aparece no campo enquanto fala. Sem suporte (Firefox), o botão nem
 * aparece.
 */

type Recognition = EventTarget & {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
};
type ResultEvent = Event & { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type RecognitionErrorEvent = Event & { error: string };

type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | undefined {
  const source = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return source.SpeechRecognition ?? source.webkitSpeechRecognition;
}

const noSubscribe = () => () => {};

export function useSpeechInput(onText: (text: string) => void) {
  const supported = useSyncExternalStore(
    noSubscribe,
    () => Boolean(recognitionConstructor()),
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string>();
  const recognition = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  });

  // Saiu da tela ouvindo: desliga o microfone.
  useEffect(() => () => recognition.current?.abort(), []);

  /** Começa a ouvir. `before`: o que já estava escrito (a fala entra depois). */
  const start = useCallback((before: string) => {
    const Constructor = recognitionConstructor();
    if (!Constructor) return;
    recognition.current?.abort();
    const current = new Constructor();
    current.lang = 'pt-BR';
    current.interimResults = true;
    current.continuous = true;
    const prefix = before.trim() ? `${before.trim()} ` : '';
    current.addEventListener('result', (event) => {
      const { results } = event as ResultEvent;
      const spoken = Array.from(results, (result) => result[0]?.transcript ?? '').join('');
      onTextRef.current(prefix + spoken.trimStart());
    });
    current.addEventListener('error', (event) => {
      const { error: problem } = event as RecognitionErrorEvent;
      if (problem === 'not-allowed' || problem === 'service-not-allowed') {
        setError('Libere o microfone pra este site (no cadeado, ao lado do endereço).');
      } else if (problem === 'no-speech') {
        setError('Não ouvi nada. Toque no microfone e fale de novo.');
      } else if (problem !== 'aborted') {
        setError('Não consegui ouvir agora. Tente de novo ou escreva.');
      }
    });
    current.addEventListener('end', () => {
      setListening(false);
      if (recognition.current === current) recognition.current = null;
    });
    recognition.current = current;
    setError(undefined);
    setListening(true);
    current.start();
  }, []);

  const stop = useCallback(() => recognition.current?.stop(), []);

  return { supported, listening, error, start, stop };
}
