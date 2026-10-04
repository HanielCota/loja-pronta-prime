'use client';

import { CircleAlertIcon, RefreshCwIcon, SquarePenIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ChatView } from '../chat-view';
import {
  chooseLogo,
  createLogo,
  restartLogoChat,
  retryLogoReply,
  sendLogoMessage,
  type ChatResult,
} from '../server/actions';
import { ChatMessage, Creating, Thinking } from './chat-message';
import { Composer } from './composer';
import { CreateCard } from './create-card';
import { RestartDialog } from './restart-dialog';

/** O que está acontecendo agora (mostra o aviso certo e trava os botões). */
type Busy = 'typing' | 'creating' | 'choosing' | 'restarting' | null;

/**
 * O chat do logo, com a cara do ChatGPT (mas pensado pra quem tem pouca prática). Antes da
 * primeira resposta dela, tudo fica no meio da tela (a pergunta, as respostas rápidas e a caixa
 * de escrever); depois, a conversa corre na página e a caixa fica presa embaixo. Este componente
 * só guarda o estado e junta as partes: as mensagens, o cartão de criar, a caixa e a janela de
 * "Nova conversa" ficam cada uma no seu arquivo.
 */
export function LogoChat({
  initial,
  editing,
  storeName,
  titleId,
  testMode,
}: {
  initial: ChatView;
  editing: boolean;
  storeName: string;
  /** O id do título (o foco vai pra ele ao chegar na página). */
  titleId: string;
  /** IA de mentira ligada (AI_FAKE=1, só fora de produção): o logo sai um quadrado rosa. */
  testMode: boolean;
}) {
  const [chat, setChat] = useState(initial);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<Busy>(null);
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  /** O logo que ela tocou pra usar (o botão dele mostra que está salvando). */
  const [choosing, setChoosing] = useState<string>();
  const [, startTransition] = useTransition();
  const router = useRouter();
  const endRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
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

  function restart() {
    setConfirmingRestart(false);
    run('restarting', restartLogoChat);
    // Conversa nova: o cursor já fica na caixa de escrever.
    requestAnimationFrame(() => fieldRef.current?.focus());
  }

  const last = chat.messages.at(-1);
  // Ainda só a primeira pergunta (ela não respondeu nada): tudo no meio da tela.
  const fresh = !chat.messages.some((message) => message.role === 'user') && !busy;
  // "Logo 1", "Logo 2"...: cada logo criado com o seu número (pro leitor de tela distinguir).
  let imageCount = 0;
  const imageNumbers = chat.messages.map((message) => (message.imageId ? ++imageCount : undefined));
  const suggestions = !busy && last?.role === 'assistant' ? (last.suggestions ?? []) : [];
  const hasImage = imageCount > 0;
  // O cartão de criar aparece quando há resumo e a última mensagem não é um logo (depois de um
  // logo, ela pode pedir mudanças conversando e criar outro).
  const showCreate = chat.ready && !last?.imageId && last?.role !== 'user';
  // A última mensagem dela ficou sem resposta (a IA falhou): dá pra pedir a resposta de novo.
  const canRetry = !busy && last?.role === 'user';

  return (
    <div
      className={cn(
        'flex min-h-[calc(100dvh-13rem)] flex-col',
        fresh && 'justify-center gap-8 pb-[10vh]',
      )}
    >
      {/* Sem este aviso, o quadrado rosa da IA de mentira parece um logo quebrado. */}
      {testMode ? (
        <p className="mb-4 rounded-2xl border border-dashed border-border px-4 py-3 text-center text-body text-muted-foreground">
          Modo de teste (AI_FAKE=1): a IA está desligada e o logo sai um quadrado rosa.
        </p>
      ) : null}
      <div
        className={cn(
          'flex items-center gap-3',
          fresh ? 'justify-center text-center' : 'justify-between',
        )}
      >
        <h1
          id={titleId}
          tabIndex={-1}
          className={cn(
            'font-semibold text-balance outline-none',
            fresh ? 'text-title-lg sm:text-title-xl' : 'text-lg',
          )}
        >
          Logo da {storeName}
        </h1>
        {/* Nada pra recomeçar enquanto ela não respondeu. */}
        {fresh ? null : (
          <Button
            type="button"
            variant="ghost"
            size="inline"
            className="shrink-0 px-3"
            disabled={Boolean(busy)}
            onClick={() => setConfirmingRestart(true)}
          >
            <SquarePenIcon aria-hidden="true" />
            Nova conversa
          </Button>
        )}
      </div>

      <div className={cn('flex flex-col gap-8', !fresh && 'flex-1 py-6')}>
        {/* role=log: o leitor de tela anuncia cada mensagem nova, sem ler tudo de novo. Só as
            mensagens ficam aqui: o aviso de erro e os botões, fora, não são lidos duas vezes. */}
        <div role="log" aria-label="Conversa sobre o seu logo" className="flex flex-col gap-8">
          {chat.messages.map((message, index) => (
            <ChatMessage
              key={index}
              message={message}
              storeName={storeName}
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
          {busy === 'typing' ? <Thinking /> : null}
          {busy === 'creating' ? <Creating /> : null}
        </div>

        {showCreate ? (
          <CreateCard
            summary={chat.summary}
            generationsLeft={chat.generationsLeft}
            again={hasImage}
            busy={Boolean(busy)}
            creating={busy === 'creating'}
            onCreate={() => run('creating', createLogo)}
          />
        ) : null}

        <p
          id={errorId}
          role="alert"
          className="ml-13 flex items-start gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-body text-pretty text-destructive empty:hidden forced-colors:border forced-colors:border-[CanvasText]"
        >
          {error ? (
            <>
              <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              {error}
            </>
          ) : null}
        </p>

        {canRetry ? (
          <Button
            type="button"
            variant="soft"
            className="ml-13 w-auto self-start px-6"
            onClick={() => run('typing', retryLogoReply)}
          >
            <RefreshCwIcon aria-hidden="true" />
            Tentar de novo
          </Button>
        ) : null}

        {/* A rolagem para aqui: depois do "Criar meu logo" e do aviso. */}
        {fresh ? null : <div ref={endRef} className="scroll-mb-48" />}
      </div>

      <Composer
        draft={draft}
        onDraftChange={setDraft}
        onSend={send}
        suggestions={suggestions}
        disabled={Boolean(busy)}
        describedBy={error ? errorId : undefined}
        fieldRef={fieldRef}
        // Começo: no meio, com o resto. Depois: presa embaixo, com o fundo sumindo aos poucos por
        // cima da conversa (como no ChatGPT).
        className={
          fresh
            ? undefined
            : 'sticky bottom-0 -mx-4 bg-linear-to-t from-background from-70% to-transparent px-4 pt-8 pb-4 sm:-mx-6 sm:px-6'
        }
      />

      <RestartDialog
        open={confirmingRestart}
        generationsLeft={chat.generationsLeft}
        onConfirm={restart}
        onClose={() => setConfirmingRestart(false)}
      />
    </div>
  );
}
