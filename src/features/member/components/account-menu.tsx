'use client';

import { ChevronDownIcon, LogOutIcon, UserRoundIcon } from 'lucide-react';
import Link from 'next/link';
import { DropdownMenu } from 'radix-ui';
import { useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Avatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { signOut } from '@/features/auth/server/sign-out';
import { cn } from '@/lib/utils';

const itemClass =
  'flex min-h-11 cursor-default items-center gap-3 rounded-xl px-3 text-body font-medium text-foreground outline-none select-none data-highlighted:bg-muted forced-colors:data-highlighted:outline-2 forced-colors:data-highlighted:outline-[Highlight] forced-colors:data-highlighted:outline-solid';

type AccountMenuProps = {
  name: string;
  email: string;
  image?: string | null | undefined;
  /**
   * `sidebar`: no pé do menu lateral do SLL, o botão mostra a foto, o nome e o email (ali tem
   * espaço, e ela confere a conta sem abrir), e o menu abre pra cima.
   */
  variant?: 'avatar' | 'sidebar';
};

/**
 * A conta, no canto do topo: o círculo com as iniciais abre o perfil e o sair. Fica num menu (e não
 * solto na barra) porque são coisas raras: o que ela veio fazer continua sendo o destaque da tela.
 */
export function AccountMenu({ name, email, image, variant = 'avatar' }: AccountMenuProps) {
  const signOutForm = useRef<HTMLFormElement>(null);
  const inSidebar = variant === 'sidebar';

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        // No menu lateral, o nome vem do texto visível (o nome e o email, WCAG 2.5.3) mais o
        // "Sua conta" escondido; no topo, só a foto aparece, então o rótulo diz o que é.
        aria-label={inSidebar ? undefined : 'Sua conta'}
        className={cn(
          'group flex min-h-11 items-center outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid motion-safe:transition-colors motion-safe:duration-150',
          inSidebar
            ? 'w-full gap-3 rounded-2xl p-2 text-left hover:bg-muted data-[state=open]:bg-muted'
            : '-mr-1 gap-1 rounded-full p-1 pr-2 hover:bg-card data-[state=open]:bg-card',
        )}
      >
        <Avatar name={name} image={image} />
        {inSidebar ? (
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-semibold wrap-anywhere text-foreground">
              {name || 'Sua conta'}
            </span>
            {/* Email comprido: corta com reticências aqui; o menu aberto mostra ele inteiro. */}
            <span className="truncate text-sm text-muted-foreground">{email}</span>
            <span className="sr-only">Sua conta</span>
          </span>
        ) : null}
        <ChevronDownIcon
          aria-hidden="true"
          className={cn(
            'size-4 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-150',
            // Abrindo pra cima, a seta aponta pra cima quando o menu está aberto.
            inSidebar
              ? 'rotate-180 group-data-[state=open]:rotate-0'
              : 'group-data-[state=open]:rotate-180',
          )}
        />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side={inSidebar ? 'top' : 'bottom'}
          align={inSidebar ? 'start' : 'end'}
          sideOffset={8}
          collisionPadding={16}
          className="z-50 w-72 max-w-[calc(100vw-2rem)] origin-(--radix-dropdown-menu-content-transform-origin) rounded-2xl bg-card p-1.5 shadow-card outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:data-[state=open]:zoom-in-100 forced-colors:border forced-colors:border-[CanvasText]"
        >
          {/* Quem está logada: confirma a conta antes de mexer nela (útil em computador dividido). */}
          <div className="flex items-center gap-3 px-3 pt-2 pb-3">
            <Avatar name={name} image={image} className="size-11 text-body" />
            <div className="flex min-w-0 flex-col">
              <span className="text-body font-semibold wrap-anywhere text-foreground">
                {name || 'Sua conta'}
              </span>
              <span className="text-sm wrap-anywhere text-muted-foreground">{email}</span>
            </div>
          </div>
          <DropdownMenu.Separator className="mx-3 my-1 h-px bg-border" />

          <DropdownMenu.Item asChild className={itemClass}>
            <Link href="/perfil">
              <UserRoundIcon aria-hidden="true" className="size-5 text-muted-foreground" />
              Meu perfil
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="mx-3 my-1 h-px bg-border" />

          {/* Formulário de verdade, como o sair das outras telas. O menu fica aberto enquanto sai,
              pra o "Saindo…" ter onde aparecer. */}
          <form ref={signOutForm} action={signOut}>
            <SignOutItem onSelect={() => signOutForm.current?.requestSubmit()} />
          </form>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function SignOutItem({ onSelect }: { onSelect: () => void }) {
  const { pending } = useFormStatus();
  return (
    <DropdownMenu.Item
      className={itemClass}
      disabled={pending}
      onSelect={(event) => {
        event.preventDefault();
        onSelect();
      }}
    >
      {pending ? (
        <Spinner />
      ) : (
        <LogOutIcon aria-hidden="true" className="size-5 text-muted-foreground" />
      )}
      {pending ? 'Saindo…' : 'Sair da conta'}
    </DropdownMenu.Item>
  );
}
