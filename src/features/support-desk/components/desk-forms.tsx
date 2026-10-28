'use client';

import { SelectMenu } from '@/components/ui/select-menu';
import { useActionState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ConfirmAction } from './confirm-action';
import {
  assignAction,
  availabilityAction,
  priorityAction,
  queueAction,
  statusAction,
  topicAction,
  type DeskActionState,
} from '../server/actions';

const IDLE: DeskActionState = { ok: false, message: '' };

function Feedback({ state }: { state: DeskActionState }) {
  if (!state.message) return null;
  return (
    <p role={state.ok ? 'status' : 'alert'} className={cn('text-sm', state.ok ? 'text-progress-text' : 'text-destructive')}>
      {state.message}
    </p>
  );
}

const selectClass =
  'min-h-11 w-full rounded-field border border-input bg-card px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary';

/** Um campo do painel "Atendimento": select + "Salvar", funciona sem JavaScript. */
function SelectForm({
  action,
  number,
  name,
  label,
  value,
  children,
}: {
  action: (state: DeskActionState, form: FormData) => Promise<DeskActionState>;
  number: number;
  name: string;
  label: string;
  value: string;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const id = `triage-${name}`;
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="numero" value={number} />
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <SelectMenu id={id} name={name} defaultValue={value} className={selectClass}>
          {children}
        </SelectMenu>
        <Button type="submit" variant="soft" size="inline" className="px-4" loading={pending}>
          Salvar
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function AssigneeForm({
  number,
  current,
  canAssignOthers,
  viewerId,
  staff,
}: {
  number: number;
  current: { id: string; name: string } | null;
  canAssignOthers: boolean;
  viewerId: string;
  staff: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(assignAction, IDLE);
  if (canAssignOthers)
    return (
      <SelectForm action={assignAction} number={number} name="responsavel" label="Responsável" value={current?.id ?? ''}>
        <option value="">Sem responsável</option>
        {staff.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </SelectForm>
    );
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="numero" value={number} />
      <p className="text-sm font-semibold text-muted-foreground">Responsável</p>
      {!current ? (
        <>
          <p className="text-body">Sem responsável</p>
          <input type="hidden" name="responsavel" value="me" />
          <Button type="submit" variant="soft" className="w-fit px-5" size="inline" loading={pending}>
            Assumir chamado
          </Button>
        </>
      ) : current.id === viewerId ? (
        <>
          <p className="text-body font-semibold">Você</p>
          <input type="hidden" name="responsavel" value="" />
          <Button type="submit" variant="ghost" className="w-fit px-4" size="inline" loading={pending}>
            Devolver para a fila
          </Button>
        </>
      ) : (
        <p className="text-body">{current.name}</p>
      )}
      <Feedback state={state} />
    </form>
  );
}

export function PriorityForm({ number, value, labels }: { number: number; value: string; labels: Record<string, string> }) {
  return (
    <SelectForm action={priorityAction} number={number} name="prioridade" label="Prioridade" value={value}>
      {Object.entries(labels).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </SelectForm>
  );
}

export function TopicForm({ number, value, topics }: { number: number; value: string; topics: { id: string; label: string }[] }) {
  return (
    <SelectForm action={topicAction} number={number} name="tema" label="Tema" value={value}>
      {topics.map((topic) => (
        <option key={topic.id} value={topic.id}>
          {topic.label}
        </option>
      ))}
    </SelectForm>
  );
}

export function QueueForm({ number, value }: { number: number; value: 'general' | 'ombudsman' }) {
  return (
    <SelectForm action={queueAction} number={number} name="fila" label="Fila" value={value}>
      <option value="general">Fila geral</option>
      <option value="ombudsman">Ouvidoria</option>
    </SelectForm>
  );
}

/** Reabrir ou encerrar sem mensagem ("respondido" só respondendo). */
export function StatusButton({ number, next, label, variant = 'ghost', confirm }: { number: number; next: 'open' | 'closed'; label: string; variant?: 'ghost' | 'soft'; confirm?: { title: string; description: string; confirmLabel: string } }) {
  const [state, formAction, pending] = useActionState(statusAction, IDLE);
  const form = (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="numero" value={number} />
      <input type="hidden" name="status" value={next} />
      {/* Dentro da confirmação, o botão que faz de verdade é `soft`, como em "Entrar como aluna". */}
      <Button type="submit" variant={confirm ? 'soft' : variant} className="w-fit px-4" size="inline" loading={pending}>
        {confirm ? confirm.confirmLabel : label}
      </Button>
      <Feedback state={state} />
    </form>
  );
  if (!confirm) return form;
  return (
    <ConfirmAction label={label} title={confirm.title} description={confirm.description}>
      {form}
    </ConfirmAction>
  );
}

/** "Disponível / Em pausa": em pausa, a distribuição automática pula a pessoa. */
export function AvailabilityToggle({ available }: { available: boolean }) {
  const [state, formAction, pending] = useActionState(availabilityAction, IDLE);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="disponivel" value={available ? '0' : '1'} />
      <span className="inline-flex items-center gap-2 text-body">
        <span aria-hidden="true" className={cn('size-2.5 rounded-full', available ? 'bg-progress' : 'bg-muted-foreground')} />
        {available ? 'Você está disponível' : 'Você está em pausa'}
      </span>
      <Button type="submit" variant="ghost" size="inline" className="px-4" loading={pending}>
        {available ? 'Pausar' : 'Ficar disponível'}
      </Button>
      <Feedback state={state} />
    </form>
  );
}
