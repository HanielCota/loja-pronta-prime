'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, CheckCircle2, Info, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ENHANCED_SUBMIT_FIELD } from '@/lib/forms';
import { visibleSituations, type SupportTopic } from '../catalog';
import { responsePromise } from '../copy';
import { answerFromFaq, type SupportAnswer } from '../faq';
import { MAX_DESCRIPTION } from '../plan-ticket';
import type { WhatsappContact } from '../whatsapp';
import { faqFeedbackAction } from '../server/actions';
import { appendAttachments, AttachmentPicker, useAttachments } from './attachment-picker';
import { SupportHoursNote } from './support-hours-note';
import { WhatsappTopicLine } from './whatsapp-alternatives';

export type NewTicketProps = {
  catalog: SupportTopic[];
  faqAnswers: SupportAnswer[];
  openTickets: { number: number; subject: string; topicId: string; situationId: string | null }[];
  knownIssues: { id: string; title: string; body: string; topicIds: string[] }[];
  whatsappByTopic: Record<string, WhatsappContact | null>;
  deadlines: { normal: number; high: number };
  hours: string;
  notice: string | null;
  pause: string | null;
  initial: {
    topicId: string;
    situationId: string;
    lessonId: string;
    phase: string;
    errorDigest: string;
    pagePath: string;
    /** "Aula 12 · Etapa 2 do SLL", quando o chamado leva contexto. */
    contextLabel: string | null;
    /** Id deste envio, criado no servidor: o mesmo envio repetido não abre dois chamados. */
    submissionId: string;
  };
  error: string | null;
};

const choiceClass =
  'flex min-h-14 w-full flex-col items-start justify-center gap-0.5 rounded-2xl bg-muted px-4 py-3 text-left text-body outline-none hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:transition-colors motion-safe:duration-150 forced-colors:border forced-colors:border-[CanvasText]';

const noSubscribe = () => () => {};

/** Verdadeiro só depois de hidratar: antes disso (e sem JavaScript), o formulário simples. */
function useHydrated() {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}

function StepHeading({ id, children, headingRef }: { id: string; children: ReactNode; headingRef?: React.Ref<HTMLHeadingElement> }) {
  return (
    <h2 id={id} ref={headingRef} tabIndex={-1} className="text-body font-semibold outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
      {children}
    </h2>
  );
}

function ContextFields({ initial }: { initial: NewTicketProps['initial'] }) {
  return (
    <>
      <input type="hidden" name="envio" value={initial.submissionId} />
      <input type="hidden" name="aula" value={initial.lessonId} />
      <input type="hidden" name="fase" value={initial.phase} />
      <input type="hidden" name="erro_codigo" value={initial.errorDigest} />
      <input type="hidden" name="pagina" value={initial.pagePath} />
    </>
  );
}

/** Sem JavaScript: os três campos como selects e texto normais, no mesmo envio. */
function SimpleForm(props: NewTicketProps) {
  return (
    <form action="/api/suporte/chamados" method="post" encType="multipart/form-data" className="flex flex-col gap-5">
      <ContextFields initial={props.initial} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="ticket-topic">Sobre o que é?</Label>
        <select id="ticket-topic" name="tema" required defaultValue={props.initial.topicId} className="min-h-12 rounded-field border border-input bg-card px-4 text-body">
          <option value="">Escolha o mais próximo</option>
          {props.catalog.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="ticket-situation">O que está acontecendo?</Label>
        <select id="ticket-situation" name="situacao" defaultValue={props.initial.situationId} className="min-h-12 rounded-field border border-input bg-card px-4 text-body">
          <option value="">Não sei dizer (Ouvidoria e Outra coisa)</option>
          {props.catalog.map((topic) =>
            visibleSituations(topic).length ? (
              <optgroup key={topic.id} label={topic.label}>
                {visibleSituations(topic).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ) : null,
          )}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="ticket-description">Conte o que está acontecendo</Label>
        <Textarea id="ticket-description" name="descricao" required maxLength={MAX_DESCRIPTION} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="ticket-files">Anexos (opcional)</Label>
        <input id="ticket-files" type="file" name="anexos" multiple accept="image/png,image/jpeg,image/webp,application/pdf" className="text-body" />
        <p className="text-sm text-muted-foreground">Até 3 arquivos: PNG, JPG, WEBP ou PDF, até 5 MB cada.</p>
      </div>
      <SupportHoursNote hours={props.hours} notice={props.notice} pause={props.pause} />
      <Button type="submit">
        <Send aria-hidden="true" />
        Enviar chamado
      </Button>
    </form>
  );
}

/**
 * Novo chamado guiado (tema → situação → pergunta), num cartão só. Passo respondido vira resumo
 * com "Alterar"; mudar um passo limpa só o que depende dele e o foco vai pro próximo título.
 * Antes de enviar: a resposta automática (se a situação tiver), o aviso de chamado parecido e os
 * problemas conhecidos. Sem JavaScript, o `SimpleForm` faz o mesmo envio.
 */
export function NewTicketForm(props: NewTicketProps) {
  const hydrated = useHydrated();
  if (!hydrated) return <SimpleForm {...props} />;
  return <GuidedForm {...props} />;
}

function GuidedForm(props: NewTicketProps) {
  const router = useRouter();
  const initialTopic = props.catalog.find((topic) => topic.id === props.initial.topicId) ?? null;
  const initialSituation =
    initialTopic && visibleSituations(initialTopic).some((item) => item.id === props.initial.situationId)
      ? props.initial.situationId
      : '';
  const [topicId, setTopicId] = useState(initialTopic?.id ?? '');
  const [situationId, setSituationId] = useState(initialSituation);
  const [faq, setFaq] = useState<'pending' | 'helped' | 'continue'>('pending');
  const [duplicateOk, setDuplicateOk] = useState(false);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(props.error);
  const [sending, setSending] = useState(false);
  const attachments = useAttachments();
  const situationHeading = useRef<HTMLHeadingElement>(null);
  const detailsHeading = useRef<HTMLHeadingElement>(null);
  const topicHeading = useRef<HTMLHeadingElement>(null);
  const [focusTarget, setFocusTarget] = useState<'topic' | 'situation' | 'details' | null>(null);

  useEffect(() => {
    const target = { topic: topicHeading, situation: situationHeading, details: detailsHeading }[focusTarget ?? 'topic'];
    if (focusTarget) target.current?.focus();
  }, [focusTarget]);

  const topic = props.catalog.find((item) => item.id === topicId) ?? null;
  const situations = topic ? visibleSituations(topic) : [];
  const situation = situations.find((item) => item.id === situationId) ?? null;
  const needsSituation = situations.length > 0;
  const ready = Boolean(topic && (!needsSituation || situation));
  const answer =
    ready && topic
      ? answerFromFaq(props.faqAnswers, { topicId: topic.id, situationId: situation?.id ?? null, alwaysHuman: topic.alwaysHuman })
      : null;
  const faqAnswer = answer?.kind === 'answer' ? answer.answer : null;
  const duplicate = ready
    ? props.openTickets.find((ticket) => ticket.topicId === topicId && ticket.situationId === (situation?.id ?? null))
    : undefined;
  const issues = topic ? props.knownIssues.filter((issue) => issue.topicIds.length === 0 || issue.topicIds.includes(topic.id)) : [];
  const priority = situation?.priority ?? 'normal';
  const showDetails = ready && (faq !== 'pending' || !faqAnswer) && (!duplicate || duplicateOk);

  function chooseTopic(id: string) {
    setTopicId(id);
    setSituationId('');
    setFaq('pending');
    setDuplicateOk(false);
    const next = props.catalog.find((item) => item.id === id);
    setFocusTarget(next && visibleSituations(next).length ? 'situation' : 'details');
  }

  function chooseSituation(id: string) {
    setSituationId(id);
    setFaq('pending');
    setDuplicateOk(false);
    setFocusTarget('details');
  }

  function answerFaq(resolved: boolean) {
    if (!faqAnswer || !topic) return;
    void faqFeedbackAction(faqAnswer.id, topic.id, situation?.id ?? null, resolved).catch(() => undefined);
    setFaq(resolved ? 'helped' : 'continue');
    if (!resolved) setFocusTarget('details');
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (description.trim().length === 0) {
      setError('Escreva o que está acontecendo.');
      return;
    }
    setSending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    form.set(ENHANCED_SUBMIT_FIELD, '1');
    appendAttachments(form, attachments.files);
    try {
      const response = await fetch('/api/suporte/chamados', { method: 'POST', body: form });
      const result = (await response.json()) as { ok: boolean; redirectTo?: string; message?: string };
      if (result.ok && result.redirectTo) {
        router.push(result.redirectTo);
        return;
      }
      setError(`${result.message ?? 'Não foi possível enviar agora.'} O que você escreveu continua aqui.`);
    } catch {
      setError('Não foi possível enviar agora. O que você escreveu continua aqui.');
    }
    setSending(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <ContextFields initial={props.initial} />
      <input type="hidden" name="tema" value={topicId} />
      <input type="hidden" name="situacao" value={situationId} />
      <input type="hidden" name="faq" value={faq === 'continue' && faqAnswer ? faqAnswer.id : ''} />

      {props.initial.contextLabel ? (
        <p className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-body">
          <Info aria-hidden="true" className="size-5 shrink-0 text-link" />
          <span>
            O chamado vai junto com: <strong className="font-semibold">{props.initial.contextLabel}</strong>
          </span>
        </p>
      ) : null}

      <section aria-labelledby="step-topic" className="flex flex-col gap-3">
        {topic ? (
          <Summary label="Sobre" value={topic.label} action="Alterar o tema" onChange={() => { setTopicId(''); setSituationId(''); setFocusTarget('topic'); }} />
        ) : (
          <>
            <StepHeading id="step-topic" headingRef={topicHeading}>Sobre o que é?</StepHeading>
            <p className="text-body text-muted-foreground">Escolha o mais próximo. Dá pra mudar depois.</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {props.catalog.map((item) => (
                <li key={item.id}>
                  <button type="button" className={choiceClass} onClick={() => chooseTopic(item.id)}>
                    <span className="font-semibold">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {topic && needsSituation ? (
        <section aria-labelledby="step-situation" className="flex flex-col gap-3">
          {situation ? (
            <Summary label="O que está acontecendo" value={situation.label} action="Alterar o que está acontecendo" onChange={() => { setSituationId(''); setFocusTarget('situation'); }} />
          ) : (
            <>
              <StepHeading id="step-situation" headingRef={situationHeading}>O que está acontecendo?</StepHeading>
              <ul className="grid gap-2 sm:grid-cols-2">
                {situations.map((item) => (
                  <li key={item.id}>
                    <button type="button" className={choiceClass} onClick={() => chooseSituation(item.id)}>
                      <span className="font-semibold">{item.label}</span>
                      {item.legend ? <span className="text-sm text-muted-foreground">{item.legend}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ) : null}

      {issues.map((issue) => (
        <div key={issue.id} role="note" className="flex gap-3 rounded-2xl bg-primary-soft px-4 py-3 text-body">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-link" />
          <div className="flex flex-col gap-1">
            <p className="font-semibold">{issue.title}</p>
            <p className="text-pretty">{issue.body}</p>
          </div>
        </div>
      ))}

      {ready && faqAnswer && faq !== 'continue' ? (
        <section aria-labelledby="faq-title" className="flex flex-col gap-3 rounded-2xl bg-muted p-5">
          {faq === 'helped' ? (
            <output className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-body font-semibold text-progress-text">
                <CheckCircle2 aria-hidden="true" className="size-5" />
                Que bom que resolveu!
              </p>
              <p className="text-body text-muted-foreground">Se precisar, é só voltar aqui.</p>
              <Link href="/suporte" className="inline-flex min-h-11 items-center gap-2 text-body font-semibold text-link hover:underline">
                Voltar pro suporte
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </output>
          ) : (
            <>
              <p className="text-sm font-semibold text-muted-foreground">Talvez isto resolva</p>
              <h2 id="faq-title" className="text-body font-semibold">
                {faqAnswer.title}
              </h2>
              <ol className="flex list-decimal flex-col gap-1 pl-5 text-body">
                {faqAnswer.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {faqAnswer.links.length ? (
                <ul className="flex flex-wrap gap-x-4">
                  {faqAnswer.links.map((link) => (
                    <li key={link.path}>
                      <Link href={link.path} className="inline-flex min-h-11 items-center gap-2 text-body font-semibold text-link hover:underline">
                        {link.label}
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" variant="soft" className="sm:w-auto" onClick={() => answerFaq(true)}>
                  Resolveu
                </Button>
                <Button type="button" variant="ghost" className="sm:w-auto" onClick={() => answerFaq(false)}>
                  Ainda preciso de ajuda
                </Button>
              </div>
            </>
          )}
        </section>
      ) : null}

      {ready && duplicate && !duplicateOk && (faq !== 'pending' || !faqAnswer) ? (
        <div role="note" className="flex flex-col gap-3 rounded-2xl bg-muted p-5 text-body">
          <p className="font-semibold">Você já tem um chamado sobre isso</p>
          <Link href={`/suporte/${duplicate.number}`} className="inline-flex min-h-11 items-center gap-2 font-semibold text-link hover:underline">
            Abrir “{duplicate.subject}”
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <Button type="button" variant="ghost" className="w-fit px-4" size="inline" onClick={() => { setDuplicateOk(true); setFocusTarget('details'); }}>
            Abrir outro mesmo assim
          </Button>
        </div>
      ) : null}

      {showDetails && topic ? (
        <section aria-labelledby="step-details" className="flex flex-col gap-4">
          <StepHeading id="step-details" headingRef={detailsHeading}>
            {situation?.question ?? topic.question}
          </StepHeading>
          {situation?.notice ? (
            <p className="flex gap-2 text-body text-muted-foreground">
              <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              {situation.notice}
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="ticket-description" className="sr-only">
              {situation?.question ?? topic.question}
            </Label>
            <Textarea
              id="ticket-description"
              name="descricao"
              value={description}
              maxLength={MAX_DESCRIPTION}
              aria-describedby="ticket-example"
              aria-invalid={error && description.trim().length === 0 ? true : undefined}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={`Exemplo: ${situation?.example ?? topic.example}`}
            />
            <p id="ticket-example" className="text-sm text-muted-foreground">
              Exemplo: {situation?.example ?? topic.example}
            </p>
          </div>
          <AttachmentPicker attachments={attachments} hint={situation?.attachmentTip} />
          <WhatsappTopicLine contact={props.whatsappByTopic[topic.id] ?? null} />
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <p className="text-body font-semibold">O que acontece depois</p>
            <p className="text-body text-pretty text-muted-foreground">
              {responsePromise(priority, priority === 'high' ? props.deadlines.high : props.deadlines.normal)}
            </p>
            <SupportHoursNote hours={props.hours} notice={props.notice} pause={props.pause} />
          </div>
          {error ? (
            <p role="alert" className="text-body text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" loading={sending} loadingText="Enviando…" className="sm:w-auto sm:self-start sm:px-8">
            <Send aria-hidden="true" />
            Enviar chamado
          </Button>
        </section>
      ) : null}
    </form>
  );
}

function Summary({ label, value, action, onChange }: { label: string; value: string; action: string; onChange: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-muted px-4 py-3">
      <p className="text-body">
        <span className="text-muted-foreground">{label}: </span>
        <strong className="font-semibold">{value}</strong>
      </p>
      <Button type="button" variant="link" size="inline" onClick={onChange}>
        {action}
      </Button>
    </div>
  );
}
