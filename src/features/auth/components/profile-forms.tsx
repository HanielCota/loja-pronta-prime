'use client';

import { getInputProps } from '@conform-to/react';
import {
  CheckCircle2Icon,
  ChevronRightIcon,
  KeyRoundIcon,
  LockIcon,
  MailIcon,
  UserRoundIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { LiveRegion } from '@/components/ui/live-region';
import { PASSWORD_MIN_LENGTH } from '@/config/auth';
import { listCard } from '@/features/member/list-card';
import { cn } from '@/lib/utils';
import { rememberEmail } from '../email-storage';
import { getAuthErrorCode } from '../error-codes';
import { authHref } from '../links';
import { changePasswordSchema, NAME_MAX_LENGTH, profileNameSchema } from '../schemas';
import { changePassword, updateName } from '../server/profile';
import { useAuthForm } from '../use-auth-form';
import { AuthErrorAlert } from './auth-error-alert';
import { FieldErrorMessage } from './field-error-message';
import { PasswordField } from './password-field';
import { PasswordStrengthMeter } from './password-strength-meter';

type Section = 'name' | 'password';

/** Quanto tempo o "Nome salvo" fica na linha, no lugar do "Editar". */
const SAVED_NOTICE_MS = 4000;

type ProfileSettingsProps = {
  /** Como ela quer ser chamada (vazio quando ainda não deu pra saber). */
  name: string;
  email: string;
  /** Como trocar o email (o link do suporte, quando existe). */
  emailHelp: ReactNode;
};

/**
 * Os ajustes do perfil, em listas como os Ajustes do iPhone: cada linha mostra o valor de hoje, e
 * o formulário abre ali mesmo, um por vez. Fechada, a página fica limpa: trocar a senha é raro e
 * não precisa ocupar a tela o tempo todo.
 */
export function ProfileSettings({ name, email, emailHelp }: ProfileSettingsProps) {
  const [open, setOpen] = useState<Section | null>(null);
  const [saved, setSaved] = useState<{ section: Section; message: string } | null>(null);
  const rows = useRef<Partial<Record<Section, HTMLButtonElement | null>>>({});

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(null), SAVED_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [saved]);

  function toggle(section: Section) {
    setOpen((current) => (current === section ? null : section));
  }

  /** Fecha e devolve o foco pra linha: quem usa teclado continua de onde estava. */
  function close(section: Section) {
    setOpen(null);
    rows.current[section]?.focus();
  }

  function onSaved(section: Section, message: string) {
    close(section);
    setSaved({ section, message });
  }

  return (
    <>
      <SettingsGroup id="perfil-conta" title="Sua conta" footer={emailHelp}>
        <ExpandableRow
          section="name"
          rowRef={(element) => {
            rows.current.name = element;
          }}
          icon={<UserRoundIcon />}
          label="Como quer ser chamada"
          value={name || <span className="font-normal text-muted-foreground">Sem nome ainda</span>}
          action="Editar"
          focusOnOpen
          open={open === 'name'}
          saved={saved?.section === 'name' ? saved.message : null}
          onToggle={() => toggle('name')}
        >
          <ProfileNameForm
            name={name}
            onCancel={() => close('name')}
            onSaved={() => onSaved('name', 'Nome salvo')}
          />
        </ExpandableRow>
        <li className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4 sm:px-6">
          <RowIcon>
            <MailIcon />
          </RowIcon>
          <RowText label="Email de acesso" value={email} />
          <span className="text-muted-foreground">
            <LockIcon aria-hidden="true" className="size-5" />
            <span className="sr-only">Não dá pra trocar por aqui</span>
          </span>
        </li>
      </SettingsGroup>

      <SettingsGroup
        id="perfil-seguranca"
        title="Segurança"
        footer="Quando você troca a senha, os outros aparelhos pedem a senha nova."
      >
        <ExpandableRow
          section="password"
          rowRef={(element) => {
            rows.current.password = element;
          }}
          icon={<KeyRoundIcon />}
          label="Senha"
          value={
            <>
              <span aria-hidden="true" className="tracking-[0.15em]">
                ••••••••
              </span>
              <span className="sr-only">Definida</span>
            </>
          }
          action="Trocar"
          open={open === 'password'}
          saved={saved?.section === 'password' ? saved.message : null}
          onToggle={() => toggle('password')}
        >
          <ChangePasswordForm
            email={email}
            onCancel={() => close('password')}
            onSaved={() => onSaved('password', 'Senha trocada')}
          />
        </ExpandableRow>
      </SettingsGroup>

      <LiveRegion>{saved?.message ?? null}</LiveRegion>
    </>
  );
}

/** Um grupo da lista: o título pequeno em cinza em cima, as linhas num cartão e uma nota embaixo. */
function SettingsGroup({
  id,
  title,
  footer,
  children,
}: {
  id: string;
  title: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="px-5 text-sm font-semibold text-muted-foreground sm:px-6">
        {title}
      </h2>
      <ul className={cn(listCard, 'divide-y divide-border/70')}>{children}</ul>
      {footer ? (
        <p className="px-5 text-sm text-pretty text-muted-foreground sm:px-6">{footer}</p>
      ) : null}
    </section>
  );
}

function RowIcon({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-9 items-center justify-center rounded-[10px] bg-primary-soft text-link forced-colors:border forced-colors:border-[CanvasText] [&_svg]:size-5"
    >
      {children}
    </span>
  );
}

function RowText({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-body font-semibold wrap-anywhere text-foreground">{value}</span>
    </span>
  );
}

type ExpandableRowProps = {
  section: Section;
  rowRef: (element: HTMLButtonElement | null) => void;
  icon: ReactNode;
  label: string;
  value: ReactNode;
  /** O que a linha faz ("Editar", "Trocar"). */
  action: string;
  /**
   * Abriu, o foco vai pro campo (no celular, o teclado já sobe). Só no nome, que vem preenchido: um
   * campo de senha vazio mostra "Digite sua senha" ao perder o foco, e ela nem começou a digitar.
   */
  focusOnOpen?: boolean;
  open: boolean;
  /** Logo depois de salvar: o aviso fica no lugar da ação por alguns segundos. */
  saved: string | null;
  onToggle: () => void;
  children: ReactNode;
};

/**
 * Linha que abre o formulário embaixo dela. A linha inteira é o botão (alvo grande, fácil no
 * celular). Fechado, o formulário continua montado (guarda o que ela digitou e a resposta do
 * servidor), mas `inert`: o Tab e o leitor de tela pulam ele.
 */
function ExpandableRow({
  section,
  rowRef,
  icon,
  label,
  value,
  action,
  focusOnOpen = false,
  open,
  saved,
  onToggle,
  children,
}: ExpandableRowProps) {
  const panel = useRef<HTMLDivElement>(null);
  const panelId = `perfil-${section}-form`;

  // Sem o foco no campo, ele fica na linha: o Tab seguinte já entra no formulário.
  useEffect(() => {
    if (!open) return;
    if (focusOnOpen) {
      panel.current
        ?.querySelector<HTMLInputElement>('input:not([type="hidden"]):not([hidden])')
        ?.focus({ preventScroll: true });
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) revealPanel();
  }, [open, focusOnOpen]);

  /** Depois de abrir, rola só o necessário pra o formulário inteiro caber na tela. */
  function revealPanel() {
    panel.current?.parentElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  return (
    <li>
      <button
        ref={rowRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4 text-left outline-none hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid motion-safe:transition-colors motion-safe:duration-150 sm:px-6"
      >
        <RowIcon>{icon}</RowIcon>
        <RowText label={label} value={value} />
        {saved ? (
          <span
            aria-hidden="true"
            className="flex items-center gap-1.5 text-sm font-semibold text-progress-text"
          >
            <CheckCircle2Icon className="size-4" />
            {saved}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-sm font-semibold text-link">
            {action}
            <ChevronRightIcon
              aria-hidden="true"
              className={cn(
                'size-4 motion-safe:transition-transform motion-safe:duration-300',
                open && 'rotate-90',
              )}
            />
          </span>
        )}
      </button>
      <div
        id={panelId}
        ref={panel}
        inert={!open}
        onTransitionEnd={(event) => {
          if (open && event.target === event.currentTarget) revealPanel();
        }}
        className={cn(
          'grid motion-safe:transition-[grid-template-rows] motion-safe:duration-300 motion-safe:ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          {/* No computador, o formulário começa alinhado com o texto da linha, não com o ícone. */}
          <div className="px-5 pt-2 pb-6 sm:pr-6 sm:pl-[4.75rem]">{children}</div>
        </div>
      </div>
    </li>
  );
}

/**
 * O salvar fica azul claro enquanto não há nada pra salvar e vira o azul cheio quando ela muda
 * algo: assim fica claro que falta salvar. Nunca desligado, pra continuar achável e clicável (pelo
 * teclado e pelo leitor de tela).
 */
function saveVariant(dirty: boolean) {
  return dirty ? 'default' : 'soft';
}

/** Cancelar e salvar: lado a lado e à direita no computador; empilhados no celular. */
function FormActions({ onCancel, children }: { onCancel: () => void; children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
      {/* Sem tirar o foco do campo ao apertar: o erro de "campo vazio" apareceria, empurraria o
          botão pra baixo e o clique cairia fora dele. */}
      <Button
        type="button"
        variant="ghost"
        className="sm:w-auto"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onCancel}
      >
        Cancelar
      </Button>
      {children}
    </div>
  );
}

/** Avisa a linha quando o servidor confirma que salvou (cada resposta é um objeto novo). */
function useOnSaved(state: { saved?: boolean } | undefined, onSaved: () => void) {
  const callback = useRef(onSaved);
  useEffect(() => {
    callback.current = onSaved;
  });
  useEffect(() => {
    if (state?.saved) callback.current();
  }, [state]);
}

type FormProps = { onCancel: () => void; onSaved: () => void };

export function ProfileNameForm({ name, onCancel, onSaved }: FormProps & { name: string }) {
  const { state, form, fields, pending, responseKey, formProps } = useAuthForm(
    profileNameSchema,
    updateName,
  );
  useOnSaved(state, onSaved);
  const errorCode = getAuthErrorCode(form.errors);
  const { key, ...inputProps } = getInputProps(fields.name, { type: 'text' });
  const typed = (fields.name.value ?? name).trim().replace(/\s+/g, ' ');
  const dirty = typed !== name.trim();

  return (
    <form {...formProps} className="flex flex-col gap-4">
      {errorCode ? <AuthErrorAlert key={responseKey} id={form.errorId} code={errorCode} /> : null}
      <Field>
        <FloatingLabelInput
          key={key}
          {...inputProps}
          defaultValue={inputProps.defaultValue ?? name}
          id={fields.name.id}
          label="Seu nome"
          autoComplete="nickname"
          autoCapitalize="words"
          maxLength={NAME_MAX_LENGTH}
        />
        <FieldErrorMessage id={fields.name.errorId} errors={fields.name.errors} />
      </Field>
      {/* Como vai ficar, enquanto ela digita. Só pra ver: o leitor de tela já ouve o campo. */}
      {typed ? (
        <p
          aria-hidden="true"
          className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-muted-foreground"
        >
          Assim fica nas saudações:
          <span className="rounded-[18px] rounded-bl-md bg-primary-soft px-3.5 py-1.5 font-semibold wrap-anywhere text-foreground forced-colors:border forced-colors:border-[CanvasText]">
            Oi, {typed}!
          </span>
        </p>
      ) : null}
      <FormActions
        onCancel={() => {
          form.reset();
          onCancel();
        }}
      >
        <Button
          type="submit"
          variant={saveVariant(dirty)}
          className="sm:w-auto"
          loading={pending}
          loadingText="Salvando…"
        >
          Salvar nome
        </Button>
      </FormActions>
    </form>
  );
}

export function ChangePasswordForm({ email, onCancel, onSaved }: FormProps & { email: string }) {
  const { state, form, fields, pending, responseKey, formProps } = useAuthForm(
    changePasswordSchema,
    changePassword,
  );
  useOnSaved(state, onSaved);
  const errorCode = getAuthErrorCode(form.errors);
  const dirty = Boolean(fields.currentPassword.value || fields.password.value);

  return (
    <form {...formProps} className="flex flex-col gap-4">
      {errorCode ? <AuthErrorAlert key={responseKey} id={form.errorId} code={errorCode} /> : null}
      {/* Pro gerenciador de senhas saber de qual conta é a senha nova. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />

      <PasswordField
        meta={fields.currentPassword}
        label="Senha atual"
        autoComplete="current-password"
        below={
          // Quem não lembra a senha de hoje não troca por aqui: o link manda um email pra criar
          // uma nova, já com o email dela preenchido, e depois volta pro perfil.
          <div className="-my-1 flex justify-end">
            <Button asChild variant="link" size="inline" className="text-sm">
              <Link
                href={authHref('/recuperar-senha', '/perfil')}
                onClick={() => rememberEmail(email)}
              >
                Esqueceu a senha atual?
              </Link>
            </Button>
          </div>
        }
      />
      <PasswordField
        meta={fields.password}
        label="Senha nova"
        autoComplete="new-password"
        hint={`Pelo menos ${PASSWORD_MIN_LENGTH} caracteres. Uma frase curta é fácil de lembrar e difícil de adivinhar.`}
        meter={
          <PasswordStrengthMeter
            password={fields.password.value ?? ''}
            userInputs={[email]}
            showTip={!fields.password.errors?.length}
          />
        }
      />
      <FormActions
        onCancel={() => {
          form.reset();
          onCancel();
        }}
      >
        <Button
          type="submit"
          variant={saveVariant(dirty)}
          className="sm:w-auto"
          loading={pending}
          loadingText="Salvando…"
        >
          Trocar senha
        </Button>
      </FormActions>
    </form>
  );
}
