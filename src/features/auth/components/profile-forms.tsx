'use client';

import { getInputProps } from '@conform-to/react';
import {
  ALargeSmallIcon,
  CheckCircle2Icon,
  CirclePauseIcon,
  ContrastIcon,
  ChevronRightIcon,
  KeyRoundIcon,
  LockIcon,
  MailIcon,
  MoonIcon,
  CameraIcon,
  SunMoonIcon,
  UserRoundIcon,
} from 'lucide-react';
import Link from 'next/link';
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Field, FieldError } from '@/components/ui/field';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { LiveRegion } from '@/components/ui/live-region';
import { Switch } from '@/components/ui/switch';
import { PASSWORD_MIN_LENGTH } from '@/config/auth';
import { PROFILE_PHOTO_ACCEPT, PROFILE_PHOTO_MAX_BYTES } from '@/config/profile-photo';
import { listCard } from '@/features/member/list-card';
import { TEXT_SIZES, type TextSize } from '@/features/theme/display';
import { useDisplay } from '@/features/theme/use-display';
import { useTheme } from '@/features/theme/use-theme';
import { prefersReducedMotion } from '@/lib/reduced-motion';
import { formatBytes } from '@/lib/format-bytes';
import { shrinkImage } from '@/lib/shrink-image';
import { cn } from '@/lib/utils';
import { rememberEmail } from '../email-storage';
import { getAuthErrorCode } from '../error-codes';
import { authHref } from '../links';
import { changePasswordSchema, NAME_MAX_LENGTH, profileNameSchema } from '../schemas';
import { changePassword, updateName, updateProfilePhoto } from '../server/profile';
import { useAuthForm } from '../use-auth-form';
import { AuthErrorAlert } from './auth-error-alert';
import { FieldErrorMessage } from './field-error-message';
import { PasswordField } from './password-field';
import { PasswordStrengthMeter } from './password-strength-meter';

type Section = 'name' | 'password' | 'photo';

/** Quanto tempo o "Nome salvo" fica na linha, no lugar do "Editar". */
const SAVED_NOTICE_MS = 4000;

type ProfileSettingsProps = {
  /** Como ela quer ser chamada (vazio quando ainda não deu pra saber). */
  name: string;
  email: string;
  image: string | null | undefined;
  /** Como trocar o email (o link do suporte, quando existe). */
  emailHelp: ReactNode;
};

/**
 * Os ajustes do perfil, em listas como os Ajustes do iPhone: cada linha mostra o valor de hoje, e
 * o formulário abre ali mesmo, um por vez. Fechada, a página fica limpa: trocar a senha é raro e
 * não precisa ocupar a tela o tempo todo.
 */
export function ProfileSettings({ name, email, image, emailHelp }: ProfileSettingsProps) {
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
      <noscript>
        <style>{NO_SCRIPT_CSS}</style>
      </noscript>
      <SettingsGroup id="perfil-conta" title="Sua conta" footer={emailHelp}>
        <ExpandableRow
          section="photo"
          rowRef={(element) => {
            rows.current.photo = element;
          }}
          icon={<CameraIcon />}
          label="Foto de perfil"
          value={image ? 'Sua foto' : 'Suas iniciais'}
          action={image ? 'Trocar' : 'Adicionar'}
          open={open === 'photo'}
          saved={saved?.section === 'photo' ? saved.message : null}
          onToggle={() => toggle('photo')}
        >
          <ProfilePhotoForm
            name={name}
            image={image}
            onCancel={() => close('photo')}
            onSaved={(removed) => onSaved('photo', removed ? 'Foto removida' : 'Foto salva')}
          />
        </ExpandableRow>
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

      <SettingsGroup
        id="perfil-aparencia"
        title="Aparência"
        footer="Vale só neste aparelho: no celular e no computador, você escolhe em cada um."
      >
        <AppearanceRows />
      </SettingsGroup>

      <LiveRegion>{saved?.message ?? null}</LiveRegion>
    </>
  );
}

/**
 * Aparência, como nos Ajustes do iPhone: o claro é o padrão; "Automático" segue o tema do
 * aparelho, e a chave do escuro mostra o tema que está na tela. Mexer nela desliga o automático. Depois, os
 * ajustes de leitura: tamanho do texto, menos animação e mais contraste. Tudo vale na hora, sem
 * salvar.
 */
function AppearanceRows() {
  const { preference, theme, setPreference } = useTheme();
  const display = useDisplay();
  return (
    <>
      <SwitchRow
        id="tema-automatico"
        icon={<SunMoonIcon />}
        label="Automático"
        description="Segue o tema do seu celular ou computador."
        checked={preference === 'system'}
        // Desligar não muda nada na tela: fica fixo o tema que já estava.
        onCheckedChange={(checked) => setPreference(checked ? 'system' : theme)}
      />
      <SwitchRow
        id="tema-escuro"
        icon={<MoonIcon />}
        label="Tema escuro"
        description="Fundo escuro, mais confortável à noite."
        checked={theme === 'dark'}
        onCheckedChange={(checked) => setPreference(checked ? 'dark' : 'light')}
      />
      <TextSizeRow value={display.settings.text} onChange={(text) => display.update({ text })} />
      <SwitchRow
        id="menos-movimento"
        icon={<CirclePauseIcon />}
        label="Reduzir animações"
        description="Deixa o mascote e a tela mais parados."
        checked={display.settings.reduceMotion}
        onCheckedChange={(reduceMotion) => display.update({ reduceMotion })}
      />
      <SwitchRow
        id="mais-contraste"
        icon={<ContrastIcon />}
        label="Mais contraste"
        description="Textos cinza mais escuros e bordas mais fortes, pra ler melhor."
        checked={display.settings.moreContrast}
        onCheckedChange={(moreContrast) => display.update({ moreContrast })}
      />
    </>
  );
}

/**
 * Tamanho do texto: três opções lado a lado, como um controle segmentado do iPhone. São rádios de
 * verdade (as setas trocam a opção, o leitor de tela ouve "1 de 3"). Vale na hora, sem salvar.
 */
function TextSizeRow({ value, onChange }: { value: TextSize; onChange: (size: TextSize) => void }) {
  return (
    <li className="px-5 py-4 sm:px-6">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-[auto_1fr] items-center gap-4">
          <RowIcon>
            <ALargeSmallIcon />
          </RowIcon>
          <span className="flex min-w-0 flex-col">
            <span id="tamanho-texto-rotulo" className="text-body font-semibold text-foreground">
              Tamanho do texto
            </span>
            <span
              id="tamanho-texto-descricao"
              className="text-sm text-pretty text-muted-foreground"
            >
              Letras maiores no app inteiro.
            </span>
          </span>
        </div>
        <div
          role="radiogroup"
          aria-labelledby="tamanho-texto-rotulo"
          aria-describedby="tamanho-texto-descricao"
          className="grid grid-cols-3 gap-1 rounded-full bg-segment p-1 forced-colors:border forced-colors:border-[CanvasText]"
        >
          {(Object.keys(TEXT_SIZES) as TextSize[]).map((size) => (
            <label
              key={size}
              className="relative flex min-h-11 cursor-pointer items-center justify-center rounded-full px-2 text-body font-semibold text-muted-foreground outline-ring hover:text-foreground has-checked:bg-segment-thumb has-checked:text-foreground has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-solid motion-safe:transition-colors motion-safe:duration-150 forced-colors:has-checked:border-2 forced-colors:has-checked:border-[Highlight]"
            >
              <input
                type="radio"
                name="tamanho-texto"
                value={size}
                checked={value === size}
                onChange={() => onChange(size)}
                className="sr-only"
              />
              {TEXT_SIZES[size].label}
            </label>
          ))}
        </div>
      </div>
    </li>
  );
}

/**
 * Linha com chave liga/desliga. A linha inteira é o alvo do toque (o rótulo aponta pra chave); a
 * chave tem só o nome curto, e a explicação vem como descrição.
 */
function SwitchRow({
  id,
  icon,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  icon: ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <li>
      <label
        htmlFor={id}
        className="grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4 hover:bg-muted motion-safe:transition-colors motion-safe:duration-150 sm:px-6"
      >
        <RowIcon>{icon}</RowIcon>
        <span className="flex min-w-0 flex-col">
          <span id={`${id}-rotulo`} className="text-body font-semibold text-foreground">
            {label}
          </span>
          <span id={`${id}-descricao`} className="text-sm text-pretty text-muted-foreground">
            {description}
          </span>
        </span>
        <Switch
          id={id}
          aria-labelledby={`${id}-rotulo`}
          aria-describedby={`${id}-descricao`}
          checked={checked}
          onCheckedChange={onCheckedChange}
        />
      </label>
    </li>
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
 *
 * Sem JavaScript, nada abriria: por isso o `inert` só entra depois de a página hidratar, e o
 * <noscript> deixa os formulários abertos (eles funcionam sem JavaScript).
 */
const noSubscribe = () => () => {};

/** Sem JavaScript, as linhas não abrem: os formulários ficam abertos e os botões da linha somem. */
const NO_SCRIPT_CSS =
  '[data-profile-panel]{grid-template-rows:1fr!important}[aria-controls^="perfil-"] [data-row-action]{display:none}';

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
  const hydrated = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );

  // Sem o foco no campo, ele fica na linha: o Tab seguinte já entra no formulário.
  useEffect(() => {
    if (!open) return;
    if (focusOnOpen) {
      panel.current
        ?.querySelector<HTMLInputElement>('input:not([type="hidden"]):not([hidden])')
        ?.focus({ preventScroll: true });
    }
    if (prefersReducedMotion()) revealPanel();
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
          <span data-row-action className="flex items-center gap-1 text-sm font-semibold text-link">
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
        inert={hydrated && !open}
        data-profile-panel
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

/**
 * Trocar a foto: o círculo mostra como ela vai ficar (a atual, ou a escolhida antes de salvar), ao
 * lado do botão "Escolher foto" e do nome do arquivo. O botão é o rótulo do campo de arquivo de
 * verdade (escondido), então o teclado e o leitor de tela usam o campo normal. Sem JavaScript,
 * aparece o campo do navegador, que já funciona sozinho.
 */
function ProfilePhotoForm({
  name,
  image,
  onCancel,
  onSaved,
}: {
  name: string;
  image: string | null | undefined;
  onCancel: () => void;
  onSaved: (removed: boolean) => void;
}) {
  const [state, action, pending] = useActionState(updateProfilePhoto, undefined);
  useOnSaved(state, () => onSaved(Boolean(state?.removed)));
  /** Problema achado no navegador, antes de enviar (some ao escolher outra foto ou enviar). */
  const [localError, setLocalError] = useState<string>();
  const [preparing, setPreparing] = useState(false);
  /** A resposta do servidor que ela já deixou pra trás ao escolher outra foto. */
  const [dismissed, setDismissed] = useState(state);
  const error = localError ?? (state === dismissed ? undefined : state?.error);
  const hydrated = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  /** A escolhida, pra mostrar no círculo antes de salvar. */
  const [chosen, setChosen] = useState<{ url: string; name: string; size: number } | null>(null);
  useEffect(() => (chosen ? () => URL.revokeObjectURL(chosen.url) : undefined), [chosen]);
  const hasPhoto = Boolean(image);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        // Ainda reduzindo a foto: espera, pra não mandar o arquivo grande.
        if (preparing) event.preventDefault();
        else setLocalError(undefined);
      }}
      className="flex flex-col gap-4"
    >
      <Field data-invalid={Boolean(error) || undefined}>
        <label
          id="perfil-foto-titulo"
          htmlFor="perfil-foto-arquivo"
          className="text-body font-semibold"
        >
          Escolha sua foto
        </label>
        <div className={cn(hydrated && 'flex items-center gap-4')}>
          {hydrated ? (
            <Avatar
              name={name}
              image={chosen?.url ?? image}
              className="size-20 text-title [&_svg]:size-8"
            />
          ) : null}
          <div className={cn(hydrated && 'flex min-w-0 flex-col items-start gap-1')}>
            <input
              id="perfil-foto-arquivo"
              name="photo"
              type="file"
              accept={PROFILE_PHOTO_ACCEPT}
              required
              aria-labelledby="perfil-foto-titulo"
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={[
                hydrated && 'perfil-foto-arquivo-nome',
                'perfil-foto-ajuda',
                error && 'perfil-foto-erro',
              ]
                .filter(Boolean)
                .join(' ')}
              onChange={async (event) => {
                // Foto do celular passa fácil de 5 MB (e acima de 6 MB o servidor nem recebe): reduz
                // aqui mesmo. O servidor corta pra 512px de qualquer jeito. Sem JavaScript, vale o
                // limite escrito na ajuda.
                const input = event.currentTarget;
                const file = input.files?.[0];
                setLocalError(undefined);
                setDismissed(state);
                setChosen(null);
                if (!file) return;
                let upload: File = file;
                if (file.size > PROFILE_PHOTO_MAX_BYTES) {
                  setPreparing(true);
                  const smaller = await shrinkImage(file);
                  setPreparing(false);
                  if (!smaller) {
                    input.value = '';
                    setLocalError(
                      'Não deu pra abrir essa foto. Escolha uma imagem JPG, PNG ou WebP.',
                    );
                    return;
                  }
                  const extension = smaller.type === 'image/webp' ? 'webp' : 'jpg';
                  upload = new File([smaller], `foto.${extension}`, { type: smaller.type });
                  const transfer = new DataTransfer();
                  transfer.items.add(upload);
                  input.files = transfer.files;
                }
                // O nome é o que ela escolheu; o tamanho, o que vai de fato (já reduzida).
                setChosen({ url: URL.createObjectURL(upload), name: file.name, size: upload.size });
              }}
              className={
                hydrated
                  ? 'peer sr-only'
                  : 'min-h-12 w-full min-w-0 rounded-field border border-input bg-card p-3 text-sm text-foreground outline-none file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-primary-soft file:px-4 file:text-sm file:font-semibold file:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring forced-colors:file:border forced-colors:file:border-[ButtonText]'
              }
            />
            {hydrated ? (
              <>
                {/* O "botão" é o rótulo do campo: tocar abre a escolha de arquivo. O campo já tem
                nome pelo título acima, então este texto não é lido de novo. */}
                <Button
                  asChild
                  variant="soft"
                  className="w-auto cursor-pointer px-5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-focus-visible:outline-solid"
                >
                  <label htmlFor="perfil-foto-arquivo" aria-hidden="true">
                    <CameraIcon aria-hidden="true" />
                    {chosen || hasPhoto ? 'Escolher outra foto' : 'Escolher foto'}
                  </label>
                </Button>
                <p
                  id="perfil-foto-arquivo-nome"
                  className="max-w-full truncate text-sm text-muted-foreground"
                >
                  {preparing
                    ? 'Preparando a foto…'
                    : chosen
                      ? `${chosen.name} · ${formatBytes(chosen.size)}`
                      : 'Nenhuma foto escolhida'}
                </p>
              </>
            ) : null}
          </div>
        </div>
        <p id="perfil-foto-ajuda" className="text-sm text-pretty text-muted-foreground">
          JPG, PNG ou WebP. A foto fica redonda, com o centro da imagem.
        </p>
        <FieldError id="perfil-foto-erro">{error}</FieldError>
      </Field>
      <FormActions onCancel={onCancel}>
        {hasPhoto ? (
          <Button
            type="submit"
            name="intent"
            value="remove"
            formNoValidate
            variant="ghost"
            className="sm:w-auto"
            loading={pending}
            loadingText="Aguarde…"
          >
            Remover foto
          </Button>
        ) : null}
        <Button
          type="submit"
          name="intent"
          value="upload"
          className="sm:w-auto"
          loading={pending || preparing}
          loadingText={preparing ? 'Preparando foto…' : 'Salvando foto…'}
        >
          Salvar foto
        </Button>
      </FormActions>
    </form>
  );
}

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
