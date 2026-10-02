import { SignOutButton } from '@/features/auth/components/sign-out-button';

const MENU_ID = 'menu-da-conta';

/**
 * Menu da conta no canto da barra: com qual conta ela entrou e o sair. É um popover nativo do
 * navegador (abre, fecha com Esc ou clicando fora, e funciona sem JavaScript).
 */
export function AccountMenu({ name, email }: { name: string; email: string }) {
  const initial = (name.trim() || email).charAt(0).toUpperCase();
  return (
    <>
      <button
        type="button"
        popoverTarget={MENU_ID}
        aria-label="Conta"
        className="grid size-11 shrink-0 place-items-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
      >
        <span
          aria-hidden="true"
          className="grid size-9 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
        >
          {initial}
        </span>
      </button>
      <div
        id={MENU_ID}
        popover="auto"
        // Alinha com a borda direita da barra (que tem no máximo 64rem): no topo, abaixo dela.
        className="fixed inset-auto top-17 right-[max(1rem,calc((100%-64rem)/2+1rem))] m-0 w-72 max-w-[calc(100%-2rem)] origin-top-right scale-95 rounded-2xl border-0 bg-card p-2 opacity-0 shadow-card transition-[opacity,scale,display,overlay] transition-discrete duration-150 ease-out open:scale-100 open:opacity-100 motion-reduce:scale-100 starting:open:scale-95 starting:open:opacity-0"
      >
        <p className="flex flex-col gap-0.5 px-3 pt-2 pb-3 text-sm">
          <span className="text-muted-foreground">Conta</span>
          <span className="font-semibold wrap-anywhere text-foreground">{email}</span>
        </p>
        <div className="border-t border-border px-3 pt-1">
          <SignOutButton className="justify-start" />
        </div>
      </div>
    </>
  );
}
