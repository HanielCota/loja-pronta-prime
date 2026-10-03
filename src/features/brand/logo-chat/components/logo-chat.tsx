'use client';

import { ArrowUpIcon, RefreshCwIcon, RotateCcwIcon, SparklesIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BRAND_PATH } from '../../steps';
import type { ChatView, ChatViewMessage } from '../chat-view';
import { MAX_MESSAGE_CHARS } from '../model';
import {
  chooseLogo,
  createLogo,
  restartLogoChat,
  retryLogoReply,
  sendLogoMessage,
  type ChatResult,
} from '../server/actions';

/** O que está acontecendo agora (mostra o aviso certo e trava os botões). */
type Busy = 'typing' | 'creating' | 'choosing' | 'restarting' | null;

/**
 * O chat do logo: a conversa (como no ChatGPT, mas pensada pra quem tem pouca prática), as
 * respostas rápidas, o "Criar meu logo" quando a conversa tem o bastante e, em cada logo criado,
 * "Usar esse logo". O que ela escreve vai pro servidor, que responde com a conversa toda.
 */
export function LogoChat({ initial, editing }: { initial: ChatView; editing: boolean }) {
  const [chat, setChat] = useState(initial);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<Busy>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const endRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const fieldId = useId();
  const errorId = useId();

  // A conversa desce sozinha até a última mensagem, a cada mensagem nova ou aviso de espera (sem
  // animação pra quem pediu menos movimento).
  const scrollKey = `${chat.messages.length}-${busy}`;
  useEffect(() => {
    if (!scrollKey) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    endRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' });
  }, [scrollKey]);

  /** Roda uma action; `before`: a conversa como estava (volta a ela se a action nem respondeu). */
  function run(kind: Exclude<Busy, null>, action: () => Promise<ChatResult>, before = chat) {
    setBusy(kind);
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await action();
        setChat(result.chat);
        setError(result.error);
        if (result.next) router.push(result.next);
      } catch {
        setChat(before);
        setError('Algo deu errado. Confira a internet e tente de novo.');
      } finally {
        setBusy(null);
      }
    });
  }

  function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    // A mensagem aparece na hora, enquanto o assistente responde.
    const before = chat;
    setChat({ ...chat, messages: [...chat.messages, { role: 'user', text: message }] });
    setDraft('');
    run('typing', () => sendLogoMessage(message), before);
  }

  const last = chat.messages.at(-1);
  const suggestions = !busy && last?.role === 'assistant' ? (last.suggestions ?? []) : [];
  // O cartão de criar aparece quando há resumo e a última mensagem não é um logo (depois de um
  // logo, ela pode pedir mudanças conversando e criar outro).
  const hasImage = chat.messages.some((message) => message.imageId);
  const showCreate = chat.ready && !last?.imageId && last?.role !== 'user';
  // A última mensagem dela ficou sem resposta (a IA falhou): dá pra pedir a resposta de novo.
  const canRetry = !busy && last?.role === 'user';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="inline"
          className="px-3"
          disabled={Boolean(busy)}
          onClick={() => run('restarting', restartLogoChat)}
        >
          <RotateCcwIcon aria-hidden="true" />
          Recomeçar conversa
        </Button>
      </div>

      {/* role=log: o leitor de tela anuncia cada mensagem nova, sem ler tudo de novo. */}
      <div
        role="log"
        aria-label="Conversa sobre o seu logo"
        className="flex flex-col gap-4 rounded-card bg-card p-4 shadow-card sm:p-6 forced-colors:border forced-colors:border-[CanvasText]"
      >
        {chat.messages.map((message, index) => (
          <Message
            key={index}
            message={message}
            canChoose={!busy}
            canCreateMore={chat.generationsLeft > 0 && !busy}
            onChoose={(imageId) => run('choosing', () => chooseLogo(imageId, editing))}
            onAnother={() => run('creating', createLogo)}
            isLatestImage={Boolean(message.imageId) && message === last}
          />
        ))}
        {busy === 'typing' ? <Thinking text="Digitando…" /> : null}
        {busy === 'creating' ? <Thinking text="Criando seu logo… leva uns 15 segundos." /> : null}
      </div>

      {suggestions.length ? (
        <fieldset className="flex flex-wrap gap-2.5">
          <legend className="sr-only">Respostas rápidas</legend>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => send(suggestion)}
              className="min-h-12 rounded-full border-[1.5px] border-primary bg-card px-5 text-body font-semibold text-link transition-[background-color,transform] duration-100 outline-none hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.97] motion-reduce:active:scale-100 forced-colors:border-[ButtonText]"
            >
              {suggestion}
            </button>
          ))}
        </fieldset>
      ) : null}

      {showCreate ? (
        <div className="flex flex-col gap-3 rounded-card bg-primary-soft p-5 forced-colors:border forced-colors:border-[CanvasText]">
          <p className="text-body font-semibold">
            {hasImage ? 'Pronto pra criar outro logo' : 'Tudo pronto pra criar o seu logo'}
          </p>
          {chat.summary ? <p className="text-body text-pretty">{chat.summary}</p> : null}
          <p className="text-body text-pretty text-muted-foreground">
            {chat.generationsLeft
              ? `Você pode criar mais ${chat.generationsLeft} ${chat.generationsLeft === 1 ? 'logo' : 'logos'}.`
              : 'Você já criou todos os logos que dava. Escolha um deles lá em cima.'}
          </p>
          <Button
            type="button"
            className="min-h-14"
            disabled={Boolean(busy) || chat.generationsLeft === 0}
            loading={busy === 'creating'}
            loadingText="Criando…"
            onClick={() => run('creating', createLogo)}
          >
            <SparklesIcon aria-hidden="true" />
            {hasImage ? 'Criar outro logo' : 'Criar meu logo'}
          </Button>
        </div>
      ) : null}

      {canRetry ? (
        <Button type="button" variant="soft" onClick={() => run('typing', retryLogoReply)}>
          <RefreshCwIcon aria-hidden="true" />
          Tentar de novo
        </Button>
      ) : null}

      <p
        id={errorId}
        role="alert"
        className="text-center text-body text-pretty text-destructive empty:hidden"
      >
        {error}
      </p>

      {/* A rolagem para aqui: depois das respostas rápidas, do "Criar meu logo" e do aviso. */}
      <div ref={endRef} className="scroll-mb-28" />

      <form
        className="sticky bottom-0 -mx-4 flex items-end gap-2 bg-background/95 px-4 pt-2 pb-3 backdrop-blur-md sm:-mx-6 sm:px-6"
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
      >
        <label htmlFor={fieldId} className="sr-only">
          Sua mensagem
        </label>
        <textarea
          ref={fieldRef}
          id={fieldId}
          rows={1}
          value={draft}
          maxLength={MAX_MESSAGE_CHARS}
          placeholder="Escreva aqui…"
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter manda; Shift+Enter pula linha.
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              send(draft);
            }
          }}
          className="[field-sizing:content] max-h-40 min-h-14 flex-1 resize-none rounded-field border-[1.5px] border-input bg-card px-4 py-3.5 text-body leading-normal outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Enviar"
          disabled={!draft.trim() || Boolean(busy)}
          className="size-14 shrink-0 rounded-full"
        >
          <ArrowUpIcon aria-hidden="true" className="size-6" />
        </Button>
      </form>
    </div>
  );
}

function Message({
  message,
  canChoose,
  canCreateMore,
  isLatestImage,
  onChoose,
  onAnother,
}: {
  message: ChatViewMessage;
  canChoose: boolean;
  canCreateMore: boolean;
  isLatestImage: boolean;
  onChoose: (imageId: string) => void;
  onAnother: () => void;
}) {
  const mine = message.role === 'user';
  return (
    <div className={cn('flex items-end gap-2', mine && 'flex-row-reverse')}>
      {mine ? null : (
        <Image
          src="/brand/mascote.png"
          alt=""
          width={36}
          height={36}
          className="size-9 shrink-0 self-start"
        />
      )}
      <div className={cn('flex max-w-[85%] flex-col gap-3', mine && 'items-end')}>
        <p className="sr-only">{mine ? 'Você disse:' : 'Assistente:'}</p>
        <p
          className={cn(
            'rounded-3xl px-4 py-3 text-body text-pretty whitespace-pre-line',
            mine
              ? 'rounded-br-md bg-primary text-primary-foreground forced-colors:border forced-colors:border-[CanvasText]'
              : 'rounded-bl-md bg-muted text-foreground',
          )}
        >
          {message.text}
        </p>
        {message.imageId ? (
          <div className="flex flex-col gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${BRAND_PATH}/imagens/${message.imageId}`}
              alt="Logo criado pra sua loja"
              width={280}
              height={280}
              className="aspect-square w-[min(280px,100%)] rounded-3xl bg-card shadow-card"
            />
            <Button
              type="button"
              className="w-[min(280px,100%)]"
              disabled={!canChoose}
              onClick={() => onChoose(message.imageId!)}
            >
              Usar esse logo
            </Button>
            {isLatestImage && canCreateMore ? (
              <Button
                type="button"
                variant="soft"
                className="w-[min(280px,100%)]"
                onClick={onAnother}
              >
                <SparklesIcon aria-hidden="true" />
                Fazer outro
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** "Digitando…" e "Criando seu logo…": três bolinhas e o aviso escrito. */
function Thinking({ text }: { text: string }) {
  return (
    <div className="flex items-end gap-2">
      <Image src="/brand/mascote.png" alt="" width={36} height={36} className="size-9 shrink-0" />
      <p className="flex items-center gap-2 rounded-3xl rounded-bl-md bg-muted px-4 py-3 text-body text-muted-foreground">
        <span aria-hidden="true" className="flex gap-1">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="size-2 animate-bounce rounded-full bg-muted-foreground motion-reduce:animate-none"
              style={{ animationDelay: `${dot * 150}ms` }}
            />
          ))}
        </span>
        {text}
      </p>
    </div>
  );
}
