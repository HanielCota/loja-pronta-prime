'use client';

import { ArrowUpIcon, RefreshCwIcon, SparklesIcon, SquarePenIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
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
 * O chat do logo, com a cara do ChatGPT (mas pensado pra quem tem pouca prática): a conversa, as
 * respostas rápidas em cima da caixa de escrever, o "Criar meu logo" quando a conversa tem o
 * bastante e, em cada logo criado, "Usar esse logo". O que ela escreve vai pro servidor, que
 * responde com a conversa toda.
 */
export function LogoChat({ initial, editing }: { initial: ChatView; editing: boolean }) {
  const [chat, setChat] = useState(initial);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<Busy>(null);
  /** O logo que ela tocou pra usar (o botão dele mostra que está salvando). */
  const [choosing, setChoosing] = useState<string>();
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

  /**
   * Roda uma action. `before`: a conversa como estava (volta a ela se a action nem respondeu);
   * `typed`: o que ela tinha escrito (volta pro campo se a mensagem não foi guardada).
   */
  function run(
    kind: Exclude<Busy, null>,
    action: () => Promise<ChatResult>,
    { before = chat, typed }: { before?: ChatView; typed?: string } = {},
  ) {
    setBusy(kind);
    setError(undefined);
    startTransition(async () => {
      let navigating = false;
      try {
        const result = await action();
        setChat(result.chat);
        setError(result.error);
        // Não guardou a mensagem (limite da conversa): o texto volta pro campo.
        if (typed && !result.chat.messages.some((message) => message.text === typed)) {
          setDraft(typed);
        }
        if (result.next) {
          // Mudando de página: os botões continuam travados até a outra tela abrir.
          navigating = true;
          router.push(result.next);
        }
      } catch {
        setChat(before);
        if (typed) setDraft(typed);
        setError('Algo deu errado. Confira a internet e tente de novo.');
      } finally {
        if (!navigating) setBusy(null);
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
    run('typing', () => sendLogoMessage(message), { before, typed: message });
  }

  const last = chat.messages.at(-1);
  // "Logo 1", "Logo 2"...: cada logo criado com o seu número (pro leitor de tela distinguir).
  let imageCount = 0;
  const imageNumbers = chat.messages.map((message) => (message.imageId ? ++imageCount : undefined));
  const suggestions = !busy && last?.role === 'assistant' ? (last.suggestions ?? []) : [];
  // O cartão de criar aparece quando há resumo e a última mensagem não é um logo (depois de um
  // logo, ela pode pedir mudanças conversando e criar outro).
  const hasImage = chat.messages.some((message) => message.imageId);
  const showCreate = chat.ready && !last?.imageId && last?.role !== 'user';
  // A última mensagem dela ficou sem resposta (a IA falhou): dá pra pedir a resposta de novo.
  const canRetry = !busy && last?.role === 'user';

  return (
    // Como o ChatGPT: a conversa solta na página (sem cartão em volta), as falas da assistente
    // sem balão, as dela num balão cinza à direita e a caixa de escrever presa embaixo.
    <div className="flex min-h-[calc(100dvh-13rem)] flex-col">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="inline"
          className="px-3"
          disabled={Boolean(busy)}
          onClick={() => run('restarting', restartLogoChat)}
        >
          <SquarePenIcon aria-hidden="true" />
          Nova conversa
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-8 py-6">
        {/* role=log: o leitor de tela anuncia cada mensagem nova, sem ler tudo de novo. Só as
            mensagens ficam aqui: o aviso de erro e os botões, fora, não são lidos duas vezes. */}
        <div role="log" aria-label="Conversa sobre o seu logo" className="flex flex-col gap-8">
          {chat.messages.map((message, index) => (
            <Message
              key={index}
              message={message}
              imageNumber={imageNumbers[index]}
              canChoose={!busy}
              choosing={busy === 'choosing' && choosing === message.imageId}
              canCreateMore={chat.generationsLeft > 0 && !busy}
              onChoose={(imageId) => {
                setChoosing(imageId);
                run('choosing', () => chooseLogo(imageId, editing));
              }}
              onAnother={() => run('creating', createLogo)}
              isLatestImage={Boolean(message.imageId) && message === last}
            />
          ))}
          {busy === 'typing' ? <Thinking text="Pensando…" /> : null}
          {busy === 'creating' ? <Thinking text="Criando seu logo… leva uns 15 segundos." /> : null}
        </div>

        {showCreate ? (
          <div className="ml-11 flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 shadow-card forced-colors:border-[CanvasText]">
            <p className="text-body font-semibold">
              {hasImage ? 'Pronto pra criar outro logo' : 'Tudo pronto pra criar o seu logo'}
            </p>
            {chat.summary ? (
              <p className="text-body text-pretty text-muted-foreground">{chat.summary}</p>
            ) : null}
            <p className="text-body text-pretty text-muted-foreground">
              {chat.generationsLeft
                ? `Você pode criar mais ${chat.generationsLeft} ${chat.generationsLeft === 1 ? 'logo' : 'logos'}.`
                : 'Você já criou todos os logos que dava. Escolha um deles aqui em cima.'}
            </p>
            <Button
              type="button"
              className="sm:w-auto sm:self-start sm:px-8"
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
          <Button
            type="button"
            variant="soft"
            className="ml-11 w-auto self-start px-6"
            onClick={() => run('typing', retryLogoReply)}
          >
            <RefreshCwIcon aria-hidden="true" />
            Tentar de novo
          </Button>
        ) : null}

        <p
          id={errorId}
          role="alert"
          className="ml-11 text-body text-pretty text-destructive empty:hidden"
        >
          {error}
        </p>

        {/* A rolagem para aqui: depois do "Criar meu logo" e do aviso. */}
        <div ref={endRef} className="scroll-mb-48" />
      </div>

      {/* A caixa de escrever, presa embaixo, com as respostas rápidas logo acima (o fundo some
          aos poucos por cima da conversa, como no ChatGPT). */}
      <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 bg-linear-to-t from-background from-70% to-transparent px-4 pt-8 pb-4 sm:-mx-6 sm:px-6">
        {suggestions.length ? (
          <fieldset className="flex flex-wrap gap-2">
            <legend className="sr-only">Respostas rápidas</legend>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => send(suggestion)}
                className="min-h-11 rounded-full border border-input bg-card px-4 text-body font-medium text-foreground shadow-sm transition-[background-color,transform] duration-100 outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.97] motion-reduce:active:scale-100 forced-colors:border-[ButtonText]"
              >
                {suggestion}
              </button>
            ))}
          </fieldset>
        ) : null}

        <form
          className="flex items-end gap-2 rounded-[28px] border border-input bg-card py-2 pr-2 pl-5 shadow-card transition-colors duration-150 focus-within:border-primary motion-reduce:transition-none forced-colors:border-[CanvasText]"
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
            placeholder="Escreva sobre o seu logo…"
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter manda; Shift+Enter pula linha.
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send(draft);
              }
            }}
            className="[field-sizing:content] max-h-48 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-body leading-normal text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            aria-label="Enviar"
            disabled={!draft.trim() || Boolean(busy)}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-foreground text-background transition-[opacity,transform] duration-100 outline-none hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.94] disabled:bg-muted disabled:text-muted-foreground motion-reduce:active:scale-100 forced-colors:border-2 forced-colors:border-[ButtonText]"
          >
            <ArrowUpIcon aria-hidden="true" className="size-5" strokeWidth={2.5} />
          </button>
        </form>
      </div>
    </div>
  );
}

/** O mascote, como "rosto" da assistente (só desenho: quem fala já vai escrito pro leitor). */
function Avatar() {
  return (
    <Image src="/brand/mascote.png" alt="" width={32} height={32} className="size-8 shrink-0" />
  );
}

function Message({
  message,
  imageNumber,
  canChoose,
  choosing,
  canCreateMore,
  isLatestImage,
  onChoose,
  onAnother,
}: {
  message: ChatViewMessage;
  /** O número do logo (só nas mensagens com logo). */
  imageNumber: number | undefined;
  canChoose: boolean;
  /** Este logo está sendo salvo como o da loja. */
  choosing: boolean;
  canCreateMore: boolean;
  isLatestImage: boolean;
  onChoose: (imageId: string) => void;
  onAnother: () => void;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[80%] rounded-3xl bg-card px-5 py-3 text-body text-pretty whitespace-pre-line text-foreground shadow-card forced-colors:border forced-colors:border-[CanvasText]">
          <span className="sr-only">Você disse: </span>
          {message.text}
        </p>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <Avatar />
      <div className="flex min-w-0 flex-1 flex-col gap-4 pt-1">
        <p className="text-body leading-relaxed text-pretty whitespace-pre-line">
          <span className="sr-only">Assistente: </span>
          {message.text}
        </p>
        {message.imageId ? (
          <div className="flex flex-col gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${BRAND_PATH}/imagens/${message.imageId}`}
              alt={`Logo ${imageNumber ?? ''} criado pra sua loja`}
              width={320}
              height={320}
              className="aspect-square w-[min(320px,100%)] rounded-3xl border border-border bg-card"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="w-auto px-6"
                disabled={!canChoose && !choosing}
                loading={choosing}
                loadingText="Salvando…"
                onClick={() => onChoose(message.imageId!)}
              >
                Usar esse logo<span className="sr-only"> (logo {imageNumber})</span>
              </Button>
              {isLatestImage && canCreateMore ? (
                <Button type="button" variant="soft" className="w-auto px-6" onClick={onAnother}>
                  <SparklesIcon aria-hidden="true" />
                  Fazer outro
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** "Pensando…" e "Criando seu logo…": a bolinha pulsando (como no ChatGPT) e o aviso escrito. */
function Thinking({ text }: { text: string }) {
  return (
    <div className="flex gap-3">
      <Avatar />
      <p className="flex items-center gap-2.5 pt-1 text-body text-muted-foreground">
        <span
          aria-hidden="true"
          className="size-3 animate-pulse rounded-full bg-foreground motion-reduce:animate-none"
        />
        {text}
      </p>
    </div>
  );
}
