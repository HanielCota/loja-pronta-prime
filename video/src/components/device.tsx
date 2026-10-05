import type { ReactNode } from 'react';
import { LockIcon } from 'lucide-react';
import { useLayout } from '../layout';

/**
 * Onde o app aparece: uma janela de navegador (no vídeo horizontal) ou um celular (no vertical).
 * O conteúdo é desenhado no tamanho de tela de verdade (em px de CSS) e escalado inteiro, então
 * o texto continua nítido e as medidas são as mesmas do app.
 */

export const BROWSER = { width: 1180, height: 700 };
export const PHONE = { width: 390, height: 800 };

export function Device({ children, scale }: { children: ReactNode; scale: number }) {
  const { portrait } = useLayout();
  return portrait ? (
    <Phone scale={scale}>{children}</Phone>
  ) : (
    <Browser scale={scale}>{children}</Browser>
  );
}

function Browser({ children, scale }: { children: ReactNode; scale: number }) {
  return (
    <div style={{ width: BROWSER.width * scale, height: (BROWSER.height + 44) * scale }}>
      <div
        className="overflow-hidden rounded-[18px] bg-card shadow-card ring-1 ring-black/5"
        style={{
          width: BROWSER.width,
          height: BROWSER.height + 44,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <div className="flex h-11 items-center gap-2 border-b border-border bg-card px-4">
          <span className="size-3 rounded-full bg-border" />
          <span className="size-3 rounded-full bg-border" />
          <span className="size-3 rounded-full bg-border" />
          <div className="mx-auto flex h-7 w-[340px] items-center justify-center gap-1.5 rounded-full bg-muted text-sm text-muted-foreground">
            <LockIcon className="size-3.5" aria-hidden="true" />
            lojaprontaprime.com
          </div>
          <span className="w-[52px]" />
        </div>
        <div
          className="relative overflow-hidden bg-background"
          style={{ width: BROWSER.width, height: BROWSER.height }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function Phone({ children, scale }: { children: ReactNode; scale: number }) {
  const bezel = 12;
  return (
    <div
      style={{
        width: (PHONE.width + bezel * 2) * scale,
        height: (PHONE.height + bezel * 2) * scale,
      }}
    >
      <div
        className="relative rounded-[58px] bg-foreground shadow-card"
        style={{
          width: PHONE.width + bezel * 2,
          height: PHONE.height + bezel * 2,
          padding: bezel,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <div
          className="relative overflow-hidden rounded-[46px] bg-background"
          style={{ width: PHONE.width, height: PHONE.height }}
        >
          {/* Barra de status e a ilha do celular. */}
          <div className="flex h-12 items-center justify-between px-8 pt-1 text-sm font-semibold text-foreground">
            <span>9:41</span>
            <span className="absolute top-3 left-1/2 h-7 w-28 -translate-x-1/2 rounded-full bg-foreground" />
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-4 rounded-[3px] border border-foreground/70" />
            </span>
          </div>
          <div
            className="relative overflow-hidden"
            style={{ width: PHONE.width, height: PHONE.height - 48 }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
