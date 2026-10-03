import { UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** "Ana Souza Lima" → "AL"; "Ana" → "A"; sem nome, vazio (o círculo fica com o ícone de pessoa). */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words.at(-1)?.[0] ?? '') : '';
  return (first + last).toLocaleUpperCase('pt-BR');
}

type AvatarProps = {
  name: string;
  className?: string;
};

/**
 * Círculo com as iniciais. Decorativo: quem o usa diz o nome por perto (ou no rótulo do botão),
 * então o leitor de tela não lê "AL" solto.
 */
export function Avatar({ name, className }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-link select-none forced-colors:border forced-colors:border-[CanvasText]',
        className,
      )}
    >
      {initials(name) || <UserIcon className="size-5" />}
    </span>
  );
}
