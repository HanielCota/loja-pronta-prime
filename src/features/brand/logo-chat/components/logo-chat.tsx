'use client';

import { CircleAlertIcon, RefreshCwIcon, SquarePenIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { topicAnswers, type ChatView } from '../chat-view';
import { LOGO_TOPIC_IDS } from '../model';
import {
  chooseLogo,
  createLogo,
  restartLogoChat,
  retryLogoReply,
  sendLogoMessage,
  uploadLogo,
  type ChatResult,
} from '../server/actions';
import { LOGO_TWEAKS, type LogoTweak } from '../tweaks';
import { AnswersBar } from './answers-bar';
import { Composer } from './composer';
import { CreateCard } from './create-card';
import { LogoGallery, type ChatLogo } from './logo-gallery';
import { LogoPanel } from './logo-panel';
import { LogoViewer } from './logo-viewer';
import { QuestionCard, Typewriter } from './question-card';
import { RestartDialog } from './restart-dialog';
import { shrinkImage } from './shrink-image';
import { StartChoices } from './start-choices';
import { CreatingProgress } from './waiting';

/** O que está acontecendo agora (mostra o aviso certo e trava os botões). */
type Busy = 'typing' | 'creating' | 'uploading' | 'choosing' | 'restarting' | null;

/** O que aparece no meio da tela: a pergunta, o resumo pra criar, a criação ou o logo pronto. */
type Stage = 'question' | 'ready' | 'creating' | 'result';

/**
 * O logo, uma pergunta por vez (pensado pra quem tem pouca prática). No começo, os cartões com
 * exemplo; depois, no meio da tela, só o que importa agora: a pergunta da vez (com "Pergunta 2
 * de 5" e as respostas em botões grandes), o resumo com "Criar meu logo", o andamento da criação
 * ou o logo pronto. Em cima, as respostas dela em etiquetas (tocar muda); embaixo, a caixa pra
 * escrever do jeito dela e a conversa inteira, fechada. A IA conduz a conversa por trás. Este
 * componente só guarda o estado e junta as partes (cada uma no seu arquivo).
 */
export function LogoChat({
  initial,
  editing,
  storeName,
  titleId,
}: {
  initial: ChatView;
  editing: boolean;
  storeName: string;
  /** O id do título (o foco vai pra ele ao chegar na página). */
  titleId: string;
}) {
  const [chat, setChat] = useState(initial);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<Busy>(null);
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  /** O logo aberto em tamanho grande. */
  const [viewing, setViewing] = useState<string>();
  /** O logo que ela tocou pra ver (e quantos logos havia: chegando outro, ele vale). */
  const [selection, setSelection] = useState<{ imageId: string; count: number }>();
  /** O logo que ela tocou pra usar (o botão dele mostra que está salvando). */
  const [choosing, setChoosing] = useState<string>();
  /** Daqui pra frente, as falas são novas (aparecem aos poucos); as de antes já estavam lá. */
  const [animateFrom, setAnimateFrom] = useState(initial.messages.length);
  /** Acabaram as respostas da IA (vale pra sempre, até recarregar): some o "Tentar de novo". */
  const [limited, setLimited] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const errorId = useId();

  // Criando o logo (até 1 minuto): sair da página pede confirmação do navegador.
  useEffect(() => {
    if (busy !== 'creating') return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [busy]);

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
        if (kind === 'restarting') setAnimateFrom(result.chat.messages.length);
        if (result.limited) setLimited(true);
        // Não guardou a mensagem (limite da conversa): o texto volta pro campo. Quem diz é o
        // servidor (comparar o texto falha: ele junta os espaços, e ela pode repetir uma mensagem).
        if (typed && !result.saved) setDraft(typed);
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

  /** Mostra o pedido dela na hora (enquanto o servidor trabalha) e devolve a conversa de antes. */
  function showAsked(text: string): ChatView {
    const before = chat;
    setChat({ ...chat, messages: [...chat.messages, { role: 'user', text }] });
    return before;
  }

  function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    const before = showAsked(message);
    setDraft('');
    run('typing', () => sendLogoMessage(message), { before, typed: message });
  }

  function tweak(id: LogoTweak) {
    if (busy) return;
    const before = showAsked(LOGO_TWEAKS[id].label);
    run('creating', () => createLogo(id), { before });
  }

  function choose(imageId: string) {
    setChoosing(imageId);
    run('choosing', () => chooseLogo(imageId, editing));
  }

  function upload(file: File) {
    if (busy) return;
    run('uploading', async () => {
      const image = await shrinkImage(file);
      if (!image) {
        return {
          chat,
          error: 'Não consegui abrir essa imagem. Mande uma foto ou imagem (PNG ou JPG).',
        };
      }
      const form = new FormData();
      form.set('logo', image, 'logo');
      return uploadLogo(form);
    });
  }

  function restart() {
    setConfirmingRestart(false);
    run('restarting', restartLogoChat);
    // Conversa nova: o cursor já fica na caixa de escrever.
    requestAnimationFrame(() => fieldRef.current?.focus());
  }

  const last = chat.messages.at(-1);
  const assistantIndex = chat.messages.findLastIndex((message) => message.role === 'assistant');
  const assistant = chat.messages[assistantIndex];
  // Só a pergunta de abertura (ela não respondeu nada): os cartões com exemplo, no meio da tela.
  const start = !busy && chat.messages.length === 1 && assistantIndex === 0;
  // "Logo 1", "Logo 2"...: cada logo com o seu número (pro leitor de tela e pra comparar).
  const logos: ChatLogo[] = [];
  for (const message of chat.messages) {
    if (message.imageId) {
      logos.push({
        imageId: message.imageId,
        number: logos.length + 1,
        uploaded: Boolean(message.uploaded),
      });
    }
  }
  const viewed = logos.find((logo) => logo.imageId === viewing) ?? null;
  // O logo da vez: o que ela escolheu ver, até chegar um novo (aí, o novo).
  const selected =
    (selection?.count === logos.length
      ? logos.find((logo) => logo.imageId === selection.imageId)
      : undefined) ??
    logos.at(-1) ??
    null;
  const select = (imageId: string) => setSelection({ imageId, count: logos.length });
  const answers = topicAnswers(chat.messages);
  // A pergunta da vez conta as respostas dos outros assuntos (refazer uma não avança a conta).
  const topic = assistant?.topic;
  const step = topic
    ? Math.min(answers.filter((answer) => answer.topic !== topic).length + 1, LOGO_TOPIC_IDS.length)
    : null;
  // Ajustes de um toque: no último logo, se a IA que criou e ainda dá pra criar.
  const canTweak = chat.ready && chat.generationsLeft > 0;
  // A última mensagem dela ficou sem resposta (a IA falhou): dá pra pedir a resposta de novo.
  // Sem respostas da IA sobrando, não: a tela segue pro resumo ou pro logo (criar ainda dá).
  const canRetry = !busy && last?.role === 'user' && !limited;
  const waiting =
    busy === 'uploading'
      ? 'Recebendo o seu logo…'
      : busy === 'typing' || busy === 'restarting'
        ? 'Pensando…'
        : null;
  const stage: Stage =
    busy === 'creating'
      ? 'creating'
      : waiting || canRetry
        ? 'question'
        : last?.imageId && selected
          ? 'result'
          : chat.ready
            ? 'ready'
            : 'question';
  // Com o resumo pronto, nada de respostas rápidas: o passo é "Criar meu logo".
  const suggestions = !busy && !chat.ready && !canRetry ? (assistant?.suggestions ?? []) : [];
  const animate = assistantIndex >= animateFrom;

  /** A fala da assistente fora do cartão da pergunta (com o resumo e com o logo pronto). */
  const speech = assistant ? (
    <div role="log" aria-label="Conversa sobre o seu logo">
      <p className="text-lg leading-relaxed text-pretty whitespace-pre-line sm:text-xl">
        <span className="sr-only">Assistente: </span>
        {animate ? <Typewriter key={assistant.text} text={assistant.text} /> : assistant.text}
      </p>
    </div>
  ) : null;

  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-[760px] flex-col gap-6',
        start && 'min-h-[calc(100dvh-13rem)] justify-center pb-[6vh] lg:max-w-[880px]',
      )}
    >
      {/* O título, "Nova conversa" e quantos logos ainda dá pra criar. */}
      <div className="flex flex-col gap-0.5">
        <div
          className={cn(
            'flex items-center gap-3',
            start ? 'justify-center text-center' : 'justify-between',
          )}
        >
          <h1
            id={titleId}
            tabIndex={-1}
            className={cn(
              'min-w-0 font-semibold text-balance outline-none',
              start
                ? // Tela baixa (notebook): o título menor, pra caixa de escrever caber sem rolar.
                  'text-title-lg sm:text-title-xl sm:[@media(max-height:820px)]:text-title-lg'
                : 'text-xl sm:text-2xl',
            )}
          >
            Logo da {storeName}
          </h1>
          {/* Nada pra recomeçar enquanto ela não respondeu. */}
          {start ? null : (
            <Button
              type="button"
              variant="ghost"
              size="inline"
              className="-mr-3 shrink-0 px-3"
              disabled={Boolean(busy)}
              onClick={() => setConfirmingRestart(true)}
            >
              <SquarePenIcon aria-hidden="true" />
              Nova conversa
            </Button>
          )}
        </div>
        {start ? null : (
          <p className="text-body text-muted-foreground">
            {chat.generationsLeft
              ? `Você ainda pode criar ${chat.generationsLeft} ${chat.generationsLeft === 1 ? 'logo' : 'logos'}`
              : 'Você já criou todos os logos que dava'}
          </p>
        )}
      </div>

      {start ? (
        <>
          {/* A pergunta de abertura, grande e no meio (como o "Como posso ajudar?" do ChatGPT). */}
          <div role="log" aria-label="Conversa sobre o seu logo">
            <p className="text-center text-xl leading-snug font-medium text-balance whitespace-pre-line sm:text-2xl">
              <span className="sr-only">Assistente: </span>
              {assistant?.text}
            </p>
          </div>
          <StartChoices
            storeName={storeName}
            disabled={Boolean(busy)}
            onSend={send}
            onUpload={upload}
          />
        </>
      ) : (
        <>
          {stage === 'result' ? null : (
            <AnswersBar answers={answers} disabled={Boolean(busy)} onChange={send} />
          )}

          {stage === 'question' && assistant ? (
            <QuestionCard
              text={assistant.text}
              step={step}
              total={LOGO_TOPIC_IDS.length}
              animate={animate}
              waiting={waiting}
              suggestions={suggestions}
              disabled={Boolean(busy)}
              onSend={send}
            />
          ) : null}

          {stage === 'ready' ? (
            <>
              {speech}
              <CreateCard
                summary={chat.summary}
                generationsLeft={chat.generationsLeft}
                again={logos.length > 0}
                busy={Boolean(busy)}
                onCreate={() => run('creating', () => createLogo())}
              />
            </>
          ) : null}

          {stage === 'creating' ? (
            <section
              aria-label="Criando seu logo"
              className="rounded-card bg-card p-5 shadow-card sm:p-8 forced-colors:border forced-colors:border-[CanvasText]"
            >
              <CreatingProgress />
            </section>
          ) : null}

          {stage === 'result' && selected ? (
            <>
              {speech}
              <LogoPanel
                logos={logos}
                selected={selected}
                storeName={storeName}
                generationsLeft={chat.generationsLeft}
                canTweak={canTweak}
                canChoose={!busy}
                choosing={busy === 'choosing' ? choosing : undefined}
                onSelect={select}
                onOpen={setViewing}
                onChoose={choose}
                onTweak={tweak}
              />
            </>
          ) : null}

          {/* Conversando de novo depois de um logo: os que ela já tem continuam à mão. */}
          {stage === 'question' || stage === 'ready' ? (
            <LogoGallery logos={logos} onOpen={setViewing} />
          ) : null}
        </>
      )}

      <p
        id={errorId}
        role="alert"
        className="flex items-start gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-body text-pretty text-destructive empty:hidden forced-colors:border forced-colors:border-[CanvasText]"
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
          className="w-auto self-start px-6"
          onClick={() => run('typing', retryLogoReply)}
        >
          <RefreshCwIcon aria-hidden="true" />
          Tentar de novo
        </Button>
      ) : null}

      {start ? null : (
        <p
          aria-hidden="true"
          className="flex items-center gap-3 text-lg text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border"
        >
          {stage === 'question' ? 'ou escreva do seu jeito' : 'quer mudar algo? escreva aqui'}
        </p>
      )}

      <Composer
        draft={draft}
        onDraftChange={setDraft}
        onSend={send}
        // No começo, os cartões já trazem o "Já tenho um logo".
        onUpload={start ? undefined : upload}
        disabled={Boolean(busy)}
        describedBy={error ? errorId : undefined}
        fieldRef={fieldRef}
        footnote={start ? undefined : 'A assistente pode errar. Confira antes de criar.'}
      />

      {/* A conversa inteira, fechada: pra quem quiser reler o que já foi dito. */}
      {start ? null : (
        <details className="text-body">
          <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-full px-3 font-medium text-link outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid">
            Ver a conversa toda
          </summary>
          <ol className="mt-3 flex flex-col gap-3 rounded-2xl bg-card p-5">
            {chat.messages.map((message, index) => (
              <li key={index} className="text-pretty whitespace-pre-line">
                <span className="font-semibold">
                  {message.role === 'user' ? 'Você: ' : 'Assistente: '}
                </span>
                {message.imageId
                  ? `${message.text} (logo ${logoNumber(logos, message.imageId)})`
                  : message.text}
              </li>
            ))}
          </ol>
        </details>
      )}

      <LogoViewer
        logo={viewed}
        canChoose={!busy}
        onChoose={choose}
        onClose={() => setViewing(undefined)}
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

function logoNumber(logos: ChatLogo[], imageId: string) {
  return logos.find((logo) => logo.imageId === imageId)?.number;
}
