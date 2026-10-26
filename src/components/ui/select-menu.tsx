'use client';

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
} from 'react';
import { Select as SelectPrimitive } from 'radix-ui';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Select as NativeSelect } from '@/components/ui/select';
import { cn } from '@/lib/utils';

/** Opção com uma frase curta embaixo do nome, só na lista aberta ("Orgânico" / "Sem pagar anúncios"). */
type MenuOption = ComponentProps<'option'> & { 'data-description'?: string };

/**
 * Lista de escolha com as cores do app (cartão, roxo suave na escolhida e o check), no lugar da
 * lista azul do navegador. O `<select>` de verdade continua por baixo: envia o formulário sem
 * JavaScript e antes da hidratação. Sem JavaScript, o atributo `label` da opção é o texto que
 * aparece, então o nome e a frase podem ir juntos nele.
 */
export function SelectMenu({
  children,
  className,
  id,
  value,
  defaultValue,
  ...props
}: ComponentProps<'select'>) {
  const options = Children.toArray(children).filter(
    (child): child is ReactElement<MenuOption> =>
      isValidElement<MenuOption>(child) && child.type === 'option',
  );
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState(String(defaultValue ?? options[0]?.props.value ?? ''));
  // Campo obrigatório enviado vazio: o navegador não consegue mostrar o balão no campo escondido,
  // então o aviso aparece embaixo da lista, com o foco nela.
  const [missing, setMissing] = useState(false);
  const nativeRef = useRef<HTMLSelectElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fallbackId = useId();
  const errorId = `${id ?? fallbackId}-escolha`;

  useEffect(() => {
    const native = nativeRef.current;
    if (!native) return;
    // Lê também escolhas feitas antes da hidratação e o reset automático dos formulários.
    setSelected(native.value);
    setReady(true);
    const reset = () => queueMicrotask(() => setSelected(native.value));
    const invalid = (event: Event) => {
      event.preventDefault();
      setMissing(true);
      triggerRef.current?.focus();
    };
    const form = native.form;
    form?.addEventListener('reset', reset);
    native.addEventListener('invalid', invalid);
    return () => {
      form?.removeEventListener('reset', reset);
      native.removeEventListener('invalid', invalid);
    };
  }, []);

  const describedBy =
    [props['aria-describedby'], missing ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <>
      <div hidden={ready}>
        <NativeSelect
          {...props}
          className={className}
          defaultValue={defaultValue}
          id={ready ? undefined : id}
          ref={nativeRef}
          value={value}
        >
          {children}
        </NativeSelect>
      </div>
      {ready ? (
        <SelectPrimitive.Root
          disabled={Boolean(props.disabled)}
          value={`option:${String(value ?? selected)}`}
          onValueChange={(encoded) => {
            const next = encoded.slice('option:'.length);
            setSelected(next);
            setMissing(false);
            const native = nativeRef.current;
            if (native) {
              native.value = next;
              // O evento real preserva onChange e as prévias que leem FormData do formulário.
              native.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }}
        >
          <SelectPrimitive.Trigger
            ref={triggerRef}
            id={id}
            aria-label={props['aria-label']}
            aria-labelledby={props['aria-labelledby']}
            aria-describedby={describedBy}
            aria-invalid={missing || props['aria-invalid']}
            className={cn(
              'flex min-h-14 w-full min-w-0 cursor-pointer items-center justify-between gap-3 rounded-field border border-input bg-card px-4 py-3 text-left text-body text-foreground outline-none hover:border-primary focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive motion-safe:transition-colors motion-safe:duration-150 forced-colors:border-[ButtonText] forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-offset-2 forced-colors:focus-visible:outline-[Highlight] [&>span]:min-w-0 [&>span]:break-words',
              className,
            )}
          >
            <SelectPrimitive.Value />
            <SelectPrimitive.Icon asChild>
              <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              position="popper"
              sideOffset={6}
              collisionPadding={16}
              // Abre a partir do campo (esmaece e cresce de leve, saindo dele); com menos movimento,
              // só aparece.
              className="z-50 max-h-[var(--radix-select-content-available-height)] max-w-[calc(100vw-2rem)] min-w-[var(--radix-select-trigger-width)] origin-[var(--radix-select-content-transform-origin)] overflow-hidden rounded-2xl border border-border bg-card text-body text-foreground shadow-card duration-200 ease-fluid data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none forced-colors:border-[CanvasText]"
            >
              <SelectPrimitive.ScrollUpButton className="flex min-h-11 items-center justify-center">
                <ChevronUp aria-hidden="true" className="size-5" />
              </SelectPrimitive.ScrollUpButton>
              <SelectPrimitive.Viewport className="p-2">
                <SelectPrimitive.Group>
                  {options.map((option) => (
                    <SelectPrimitive.Item
                      key={String(option.props.value)}
                      value={`option:${String(option.props.value ?? '')}`}
                      disabled={Boolean(option.props.disabled)}
                      className="relative flex min-h-11 cursor-pointer items-center rounded-field py-3 pr-10 pl-3 wrap-anywhere outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-muted data-highlighted:text-foreground data-[state=checked]:bg-primary-soft data-[state=checked]:text-link forced-colors:data-highlighted:outline forced-colors:data-highlighted:outline-[Highlight] [&>span]:min-w-0"
                    >
                      <span className="flex flex-col gap-0.5">
                        <SelectPrimitive.ItemText>{option.props.children}</SelectPrimitive.ItemText>
                        {option.props['data-description'] ? (
                          <span className="text-sm text-muted-foreground">
                            {option.props['data-description']}
                          </span>
                        ) : null}
                      </span>
                      <SelectPrimitive.ItemIndicator className="absolute right-3">
                        <Check aria-hidden="true" className="size-5" />
                      </SelectPrimitive.ItemIndicator>
                    </SelectPrimitive.Item>
                  ))}
                </SelectPrimitive.Group>
              </SelectPrimitive.Viewport>
              <SelectPrimitive.ScrollDownButton className="flex min-h-11 items-center justify-center">
                <ChevronDown aria-hidden="true" className="size-5" />
              </SelectPrimitive.ScrollDownButton>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
      ) : null}
      {ready && missing ? (
        <p id={errorId} role="alert" className="mt-2 text-sm text-destructive">
          Escolha uma opção.
        </p>
      ) : null}
    </>
  );
}
