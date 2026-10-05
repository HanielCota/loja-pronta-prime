'use client';

import { UserIcon } from 'lucide-react';
import { useState } from 'react';
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
  image?: string | null | undefined;
  className?: string;
};

/**
 * Foto com as iniciais de reserva. Decorativo: o nome está por perto (ou no rótulo do botão),
 * então o leitor de tela não lê "AL" solto.
 */
export function Avatar({ name, image, className }: AvatarProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-sm font-semibold text-link select-none forced-colors:border forced-colors:border-[CanvasText]',
        className,
      )}
    >
      <span
        className={cn(
          'flex size-full items-center justify-center',
          image && image !== failedImage && 'invisible',
        )}
      >
        {initials(name) || <UserIcon className="size-5" />}
      </span>
      {image && image !== failedImage ? (
        // Já redimensionada no envio: o navegador lê a rota privada com o cookie, mesmo sem JS.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          width={512}
          height={512}
          onError={() => setFailedImage(image)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
    </span>
  );
}
