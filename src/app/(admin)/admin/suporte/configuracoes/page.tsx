import { readClock } from '@/features/support/clock';
import type { Metadata } from 'next';
import { asc, count, gt, isNull, or } from 'drizzle-orm';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { panelCard } from '@/features/member/components/area-shell';
import { describeSupportHours } from '@/features/support/support-hours';
import { STATUS_LABELS } from '@/features/support/copy';
import { SupportSettingsForm } from '@/features/support/components/settings-form';
import { hasStaffPermission } from '@/features/support/staff-access';
import { loadSupportCatalog } from '@/features/support/server/catalog';
import { getSupportPhones } from '@/features/support/server/contacts';
import { loadHolidays, loadSupportSettings } from '@/features/support/server/settings';
import { loadStaffDirectory } from '@/features/support/server/tickets';
import { requireStaff } from '@/features/support/server/staff-guard';
import {
  addHoliday,
  endKnownIssue,
  removeHoliday,
  saveDeadlines,
  saveDistribution,
  saveFaqAnswer,
  saveHours,
  saveKnownIssue,
  savePause,
  saveRetention,
  saveTemplate,
  saveTopic,
} from '@/features/support-admin/server/actions';
import { clockValue, WEEKDAY_LABELS } from '@/features/support-admin/settings-input';
import { getParam, type SearchParams } from '@/lib/search-params';
import { cn } from '@/lib/utils';
import { db } from '@/server/db';
import { supportFaqAnswers, supportFaqFeedback, supportKnownIssues, supportReplyTemplates } from '@/server/db/schema';

export const metadata: Metadata = { title: 'Configurações do suporte', robots: { index: false, follow: false } };

const selectClass =
  'min-h-11 w-full rounded-field border border-input bg-card px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary';
const checkboxRow = 'flex min-h-11 cursor-pointer items-center gap-3 text-body';
const PRIORITY_ROWS = [
  ['urgent', 'Urgente'],
  ['high', 'Alta'],
  ['normal', 'Normal'],
  ['low', 'Baixa'],
] as const;

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn(panelCard, 'scroll-mt-24 gap-5 !p-5 sm:!p-6')}>
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="text-title font-semibold">
          {title}
        </h2>
        {intro ? <p className="max-w-[70ch] text-body text-muted-foreground">{intro}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Configurações do suporte (só administrador): horário e feriados, pausa, prazos, distribuição,
 * temas, respostas prontas, respostas automáticas, avisos de problema, WhatsApp e guarda de dados.
 * Cada parte salva sozinha, sem JavaScript.
 */
export default async function SupportSettingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff('/admin/suporte/configuracoes', 'support.settings');
  const params = await searchParams;
  const saved = getParam(params.salvo);
  const error = getParam(params.erro);
  const now = readClock();
  const [settings, holidays, catalog, staff, phones, templates, faq, feedback, issues] = await Promise.all([
    loadSupportSettings(),
    loadHolidays(),
    loadSupportCatalog(),
    loadStaffDirectory(),
    getSupportPhones(),
    db.select().from(supportReplyTemplates).orderBy(asc(supportReplyTemplates.position)),
    db.select().from(supportFaqAnswers).orderBy(asc(supportFaqAnswers.topicId)),
    db
      .select({ answerId: supportFaqFeedback.answerId, resolved: supportFaqFeedback.resolved, total: count() })
      .from(supportFaqFeedback)
      .groupBy(supportFaqFeedback.answerId, supportFaqFeedback.resolved),
    db
      .select()
      .from(supportKnownIssues)
      .where(or(isNull(supportKnownIssues.endsAt), gt(supportKnownIssues.endsAt, now)))
      .orderBy(asc(supportKnownIssues.startsAt)),
  ]);
  const answerStaff = staff.filter((member) => hasStaffPermission(member.role, 'support.answer'));
  const feedbackOf = (id: string, resolved: boolean) =>
    feedback.find((row) => row.answerId === id && row.resolved === resolved)?.total ?? 0;
  const paused = settings.pausedUntil && settings.pausedUntil.getTime() > now.getTime();

  return (
    <AdminPage title="Configurações do suporte" intro="Horário, prazos, temas e respostas. Cada parte salva sozinha.">
      {saved ? (
        <output className="block rounded-card bg-primary-soft px-6 py-4 text-body text-link">
          {saved}
        </output>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-card bg-destructive-soft px-6 py-4 text-body text-destructive">
          {error}
        </p>
      ) : null}

      <Section id="horario" title="Horário de atendimento" intro={`As alunas veem: “${describeSupportHours(settings.weeklyHours)}” O prazo de resposta só corre dentro do horário.`}>
        <form action={saveHours} className="flex flex-col gap-4">
          <ul className="flex flex-col gap-3">
            {WEEKDAY_LABELS.map((label, day) => {
              const hours = settings.weeklyHours[day] ?? null;
              return (
                <li key={label} className="grid gap-3 sm:grid-cols-[10rem_1fr_1fr] sm:items-end">
                  <label className={checkboxRow}>
                    <input type="checkbox" name={`dia-${day}-aberto`} value="1" defaultChecked={Boolean(hours)} className="size-5" />
                    {label}
                  </label>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`dia-${day}-abre`}>Abre</Label>
                    <input id={`dia-${day}-abre`} type="time" name={`dia-${day}-abre`} defaultValue={clockValue(hours?.opens ?? 480)} className={selectClass} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`dia-${day}-fecha`}>Fecha</Label>
                    <input id={`dia-${day}-fecha`} type="time" name={`dia-${day}-fecha`} defaultValue={clockValue(hours?.closes ?? 1080)} className={selectClass} />
                  </div>
                </li>
              );
            })}
          </ul>
          <Button type="submit" className="sm:w-auto sm:self-start sm:px-8">
            Salvar horário
          </Button>
        </form>
      </Section>

      <Section id="feriados" title="Feriados" intro="Nos feriados o suporte conta como fechado: o prazo não corre.">
        <ul className="divide-y divide-border">
          {holidays.map((holiday) => (
            <li key={holiday.date} className="flex flex-wrap items-center justify-between gap-3 py-2 text-body">
              <span>
                {holiday.date.split('-').toReversed().join('/')} · {holiday.name}
              </span>
              <form action={removeHoliday}>
                <input type="hidden" name="data" value={holiday.date} />
                <Button type="submit" variant="ghost" size="inline" className="px-4">
                  Remover
                </Button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addHoliday} className="grid gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
          <div className="flex flex-col gap-1">
            <Label htmlFor="feriado-data">Data</Label>
            <input id="feriado-data" type="date" name="data" required className={selectClass} />
          </div>
          <FloatingLabelInput id="feriado-nome" name="nome" label="Nome do feriado" required maxLength={80} />
          <Button type="submit" variant="soft" className="sm:w-auto sm:px-6">
            Adicionar
          </Button>
        </form>
      </Section>

      <Section id="pausa" title="Pausa" intro="Férias ou parada: as alunas veem o aviso e os contatos de WhatsApp, e os prazos param. Abrir chamado continua possível.">
        {paused ? (
          <form action={savePause} className="flex flex-col gap-3">
            <p className="text-body">
              Em pausa até {settings.pausedUntil?.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.
            </p>
            <input type="hidden" name="acao" value="tirar" />
            <Button type="submit" variant="soft" className="sm:w-auto sm:self-start sm:px-6">
              Encerrar a pausa agora
            </Button>
          </form>
        ) : (
          <form action={savePause} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1 sm:w-60">
              <Label htmlFor="pausa-ate">Volta no dia</Label>
              <input id="pausa-ate" type="date" name="ate" required className={selectClass} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="pausa-mensagem">Mensagem pras alunas (opcional)</Label>
              <Textarea id="pausa-mensagem" name="mensagem" maxLength={300} className="min-h-20" placeholder="O suporte está em férias coletivas até 05/01. Respondemos assim que voltarmos." />
            </div>
            <Button type="submit" variant="soft" className="sm:w-auto sm:self-start sm:px-6">
              Pausar o suporte
            </Button>
          </form>
        )}
      </Section>

      <Section id="prazos" title="Prazos" intro="Em horas de atendimento. A frase “Respondemos em até…” das alunas sai daqui.">
        <form action={saveDeadlines} className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {PRIORITY_ROWS.map(([priority, label]) => (
              <div key={priority} className="flex flex-col gap-1">
                <Label htmlFor={`prazo-${priority}`}>{label} (horas)</Label>
                <input id={`prazo-${priority}`} type="number" name={`prazo-${priority}`} min="0.5" max="200" step="0.5" defaultValue={(settings.deadlineMinutes[priority] ?? 480) / 60} className={selectClass} />
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <Label htmlFor="encerrar-dias">Encerrar respondido após (dias)</Label>
              <input id="encerrar-dias" type="number" name="encerrar-dias" min="1" max="60" defaultValue={settings.autoCloseDays} className={selectClass} />
            </div>
          </div>
          <Button type="submit" className="sm:w-auto sm:self-start sm:px-8">
            Salvar prazos
          </Button>
        </form>
      </Section>

      <Section id="distribuicao" title="Distribuição" intro="Chamado novo vai pra responsável do tema. Sem ela, fica em “Sem responsável”, ou vai pra atendente disponível com menos chamados, se a distribuição automática estiver ligada.">
        <form action={saveDistribution} className="flex flex-col gap-4">
          <label className={checkboxRow}>
            <input type="checkbox" name="automatica" value="1" defaultChecked={settings.autoAssign} className="size-5" />
            Distribuir automaticamente entre quem está disponível
          </label>
          <div className="flex flex-col gap-1 sm:w-72">
            <Label htmlFor="limite">Limite de chamados abertos por pessoa</Label>
            <input id="limite" type="number" name="limite" min="1" max="200" defaultValue={settings.maxOpenPerPerson} className={selectClass} />
          </div>
          <Button type="submit" variant="soft" className="sm:w-auto sm:self-start sm:px-6">
            Salvar distribuição
          </Button>
        </form>
      </Section>

      <Section id="temas" title="Temas e situações" intro="O que a aluna escolhe ao abrir o chamado. “Outro problema” entra sozinho no fim de cada tema com situações.">
        {catalog.map((topic) => (
          <form key={topic.id} id={`tema-${topic.id}`} action={saveTopic} className="flex scroll-mt-24 flex-col gap-4 rounded-3xl bg-muted p-5">
            <input type="hidden" name="tema" value={topic.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <FloatingLabelInput id={`tema-${topic.id}-rotulo`} name="rotulo" label="Nome do tema" defaultValue={topic.label} maxLength={60} required />
              <div className="flex flex-col gap-1">
                <Label htmlFor={`tema-${topic.id}-responsavel`}>Responsável padrão</Label>
                <select id={`tema-${topic.id}-responsavel`} name="responsavel" defaultValue={topic.defaultAssigneeId ?? ''} className={selectClass}>
                  <option value="">Ninguém (vai pra fila)</option>
                  {answerStaff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <FloatingLabelInput id={`tema-${topic.id}-pergunta`} name="pergunta" label="Pergunta (sem situação)" defaultValue={topic.question} maxLength={200} />
              <FloatingLabelInput id={`tema-${topic.id}-exemplo`} name="exemplo" label="Exemplo de resposta" defaultValue={topic.example} maxLength={300} />
            </div>
            <label className={checkboxRow}>
              <input type="checkbox" name="ativo" value="1" defaultChecked={topic.active} className="size-5" />
              Tema aparece pras alunas
              {topic.queue === 'ombudsman' ? <span className="text-sm text-muted-foreground">(fila restrita da Ouvidoria)</span> : null}
            </label>
            {topic.situations.length ? (
              <ul className="flex flex-col gap-3">
                {topic.situations.map((item) => (
                  <li key={item.id} className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
                    <FloatingLabelInput id={`situacao-${topic.id}-${item.id}`} name={`situacao-${item.id}-rotulo`} label="Situação" defaultValue={item.label} maxLength={80} />
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`situacao-${topic.id}-${item.id}-prioridade`}>Prioridade</Label>
                      <select id={`situacao-${topic.id}-${item.id}-prioridade`} name={`situacao-${item.id}-prioridade`} defaultValue={item.priority} className={selectClass}>
                        <option value="normal">Normal</option>
                        <option value="high">Alta</option>
                      </select>
                    </div>
                    <label className={checkboxRow}>
                      <input type="checkbox" name={`situacao-${item.id}-ativo`} value="1" defaultChecked={item.active} className="size-5" />
                      Ativa
                    </label>
                  </li>
                ))}
              </ul>
            ) : null}
            <Button type="submit" variant="soft" className="sm:w-auto sm:self-start sm:px-6">
              Salvar {topic.label}
            </Button>
          </form>
        ))}
      </Section>

      <Section id="respostas" title="Respostas prontas" intro="A equipe escolhe no chamado. Use {aluna}, {assunto} e {atendente}.">
        {[...templates, null].map((template) => (
          <form key={template?.id ?? 'nova'} action={saveTemplate} className="flex flex-col gap-3 rounded-3xl bg-muted p-5">
            {template ? <input type="hidden" name="id" value={template.id} /> : <p className="text-body font-semibold">Nova resposta pronta</p>}
            <div className="grid gap-3 sm:grid-cols-[1fr_16rem]">
              <FloatingLabelInput id={`resposta-${template?.id ?? 'nova'}-titulo`} name="titulo" label="Título" defaultValue={template?.title ?? ''} maxLength={60} required />
              <div className="flex flex-col gap-1">
                <Label htmlFor={`resposta-${template?.id ?? 'nova'}-status`}>Status ao enviar</Label>
                <select id={`resposta-${template?.id ?? 'nova'}-status`} name="status" defaultValue={template?.statusAfter ?? ''} className={selectClass}>
                  <option value="">Padrão (respondido)</option>
                  {(['answered', 'open', 'closed'] as const).map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Label htmlFor={`resposta-${template?.id ?? 'nova'}-texto`}>Texto</Label>
            <Textarea id={`resposta-${template?.id ?? 'nova'}-texto`} name="texto" defaultValue={template?.body ?? ''} maxLength={2000} required />
            {template ? (
              <label className={checkboxRow}>
                <input type="hidden" name="ativo" value="0" />
                <input type="checkbox" name="ativo" value="1" defaultChecked={template.active} className="size-5" />
                Aparece pra equipe
              </label>
            ) : null}
            <Button type="submit" variant="soft" className="sm:w-auto sm:self-start sm:px-6">
              {template ? 'Salvar resposta' : 'Adicionar resposta'}
            </Button>
          </form>
        ))}
      </Section>

      <Section id="faq" title="Respostas automáticas" intro="Aparecem antes de a aluna enviar o chamado. Pagamento, Ouvidoria e “Comprei e não aparece” vão sempre pra uma pessoa.">
        {faq.map((answer) => (
          <form key={answer.id} action={saveFaqAnswer} className="flex flex-col gap-3 rounded-3xl bg-muted p-5">
            <input type="hidden" name="id" value={answer.id} />
            <p className="text-sm text-muted-foreground">
              {catalog.find((topic) => topic.id === answer.topicId)?.label ?? answer.topicId}
              {answer.situationId ? ` · ${catalog.find((topic) => topic.id === answer.topicId)?.situations.find((item) => item.id === answer.situationId)?.label ?? answer.situationId}` : ''} · resolveu {feedbackOf(answer.id, true)} vezes, não resolveu {feedbackOf(answer.id, false)}
            </p>
            <FloatingLabelInput id={`faq-${answer.id}-titulo`} name="titulo" label="Título" defaultValue={answer.title} maxLength={120} required />
            <Label htmlFor={`faq-${answer.id}-passos`}>Passos (um por linha)</Label>
            <Textarea id={`faq-${answer.id}-passos`} name="passos" defaultValue={answer.steps.join('\n')} maxLength={2000} required />
            <label className={checkboxRow}>
              <input type="checkbox" name="ativo" value="1" defaultChecked={answer.active} className="size-5" />
              Aparece pras alunas
            </label>
            <Button type="submit" variant="soft" className="sm:w-auto sm:self-start sm:px-6">
              Salvar resposta automática
            </Button>
          </form>
        ))}
      </Section>

      <Section id="avisos" title="Avisos de problema conhecido" intro="Ex.: “Os vídeos estão lentos hoje, já estamos resolvendo.” Aparece no suporte e ao abrir chamado do tema, e evita chamados repetidos.">
        {issues.length ? (
          <ul className="flex flex-col gap-3">
            {issues.map((issue) => (
              <li key={issue.id} className="flex flex-wrap items-start justify-between gap-3 rounded-3xl bg-muted p-5 text-body">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-semibold">{issue.title}</p>
                  <p className="text-pretty">{issue.body}</p>
                  <p className="text-sm text-muted-foreground">
                    {issue.topicIds.length ? issue.topicIds.map((id) => catalog.find((topic) => topic.id === id)?.label ?? id).join(', ') : 'Todos os temas'}
                  </p>
                </div>
                <form action={endKnownIssue}>
                  <input type="hidden" name="id" value={issue.id} />
                  <Button type="submit" variant="ghost" size="inline" className="px-4">
                    Encerrar aviso
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-muted-foreground">Nenhum aviso no ar.</p>
        )}
        <form action={saveKnownIssue} className="flex flex-col gap-3">
          <FloatingLabelInput id="aviso-titulo" name="titulo" label="Título do aviso" maxLength={120} required />
          <Label htmlFor="aviso-texto">Texto</Label>
          <Textarea id="aviso-texto" name="texto" maxLength={600} required className="min-h-20" />
          <fieldset className="flex flex-col gap-2">
            <legend className="text-body font-semibold">Temas (nenhum marcado: todos)</legend>
            <div className="flex flex-wrap gap-x-6">
              {catalog.map((topic) => (
                <label key={topic.id} className={checkboxRow}>
                  <input type="checkbox" name="temas" value={topic.id} className="size-5" />
                  {topic.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-1 sm:w-60">
            <Label htmlFor="aviso-ate">Sai do ar no fim do dia (opcional)</Label>
            <input id="aviso-ate" type="date" name="ate" className={selectClass} />
          </div>
          <Button type="submit" variant="soft" className="sm:w-auto sm:self-start sm:px-6">
            Publicar aviso
          </Button>
        </form>
      </Section>

      <Section id="whatsapp" title="Contatos por assunto" intro="Os mesmos de sempre: aparecem no Perfil, no menu da conta, no painel da Loja Pronta e, como segunda opção, nas telas de suporte e no login.">
        <SupportSettingsForm phones={phones} />
      </Section>

      <Section id="guarda" title="Guarda de dados" intro="Anexos são apagados depois do encerramento; chamados antigos perdem nome e e-mail da aluna, e ficam só pras métricas.">
        <form action={saveRetention} className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="anexos-dias">Apagar anexos após (dias)</Label>
              <input id="anexos-dias" type="number" name="anexos-dias" min="30" max="3650" defaultValue={settings.attachmentRetentionDays} className={selectClass} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="chamados-anos">Guardar chamados por (anos)</Label>
              <input id="chamados-anos" type="number" name="chamados-anos" min="1" max="20" defaultValue={settings.ticketRetentionYears} className={selectClass} />
            </div>
          </div>
          <Button type="submit" variant="soft" className="sm:w-auto sm:self-start sm:px-6">
            Salvar guarda de dados
          </Button>
        </form>
      </Section>
    </AdminPage>
  );
}
