'use client';

import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
} from 'react';
import { Select as SelectPrimitive } from 'radix-ui';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Select as NativeSelect } from '@/components/ui/select';
import { cn } from '@/lib/utils';

/** Lista do admin com as cores do painel; o campo real mantém o envio sem JavaScript. */
export function AdminSelect({
  children,
  className,
  id,
  value,
  defaultValue,
  ...props
}: ComponentProps<'select'>) {
  const options = Children.toArray(children).filter(
    (child): child is ReactElement<ComponentProps<'option'>> =>
      isValidElement<ComponentProps<'option'>>(child) && child.type === 'option',
  );
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState(String(defaultValue ?? options[0]?.props.value ?? ''));
  const nativeRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    const native = nativeRef.current;
    if (!native) return;
    // Lê também escolhas feitas antes da hidratação e o reset automático dos formulários.
    setSelected(native.value);
    setReady(true);
    const reset = () => queueMicrotask(() => setSelected(native.value));
    const form = native.form;
    form?.addEventListener('reset', reset);
    return () => form?.removeEventListener('reset', reset);
  }, []);

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
            const native = nativeRef.current;
            if (native) {
              native.value = next;
              // O evento real preserva onChange e as prévias que leem FormData do formulário.
              native.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }}
        >
          <SelectPrimitive.Trigger
            id={id}
            aria-label={props['aria-label']}
            aria-labelledby={props['aria-labelledby']}
            aria-describedby={props['aria-describedby']}
            aria-invalid={props['aria-invalid']}
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
              className="z-50 max-h-[var(--radix-select-content-available-height)] max-w-[calc(100vw-2rem)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-border bg-card text-body text-foreground shadow-card forced-colors:border-[CanvasText]"
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
                      <SelectPrimitive.ItemText>{option.props.children}</SelectPrimitive.ItemText>
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
    </>
  );
}
