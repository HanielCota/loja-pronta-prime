import {
  Flower2Icon,
  HouseIcon,
  LampIcon,
  NotebookPenIcon,
  PencilIcon,
  SofaIcon,
  SparklesIcon,
  HeartIcon,
  StarIcon,
  CrownIcon,
  LeafIcon,
  GemIcon,
  type LucideIcon,
} from 'lucide-react';
import { useId } from 'react';
import { draftOf, mixColor, nameLines } from '@/features/brand/logo-studio/draft';
import type { LogoPicks } from '@/features/brand/logo-studio/model';
import type { LogoSymbolId } from '@/features/brand/logo-studio/options';
import { brandFamily } from '../fonts';

/**
 * O rascunho do logo, igual ao do estúdio (src/features/brand/logo-studio/components/
 * draft-logo.tsx): as cores, a letra e o desenho vêm das mesmas funções puras do app (draftOf).
 * Só a parte de desenhar foi copiada, porque a do app carrega as letras por uma rota do Next.
 */

/** Os desenhos que aparecem no vídeo (os mesmos ícones do app). */
const ICONS: Partial<Record<LogoSymbolId, LucideIcon>> = {
  casa: HouseIcon,
  flor: Flower2Icon,
  lapis: PencilIcon,
  sofa: SofaIcon,
  brilho: SparklesIcon,
  caderno: NotebookPenIcon,
  luminaria: LampIcon,
  coracao: HeartIcon,
  estrela: StarIcon,
  coroa: CrownIcon,
  folha: LeafIcon,
  joia: GemIcon,
};

const NAME_WIDTH = 340;

export function DraftLogo({
  picks,
  storeName,
  className,
}: {
  picks: LogoPicks;
  storeName: string;
  className?: string;
}) {
  const id = `rascunho${useId().replace(/[^\w-]/g, '')}`;
  const draft = draftOf(picks);
  const { font, symbol, volume } = draft;
  const lines = nameLines(font.upper ? storeName.toLocaleUpperCase('pt-BR') : storeName);
  const longest = Math.max(...lines.map((line) => line.length), 1);
  const base = (symbol ? 60 : 80) / (lines.length === 2 ? 1.2 : 1);
  const size = Math.min(base, NAME_WIDTH / (longest * font.width + font.tracking / 10));
  const lineHeight = size * 1.12;
  const nameTop = symbol ? 290 : 200 - ((lines.length - 1) * lineHeight) / 2;
  const shadow = volume ? `url(#${id}-sombra)` : undefined;
  const Icon = symbol?.kind === 'icon' ? ICONS[symbol.icon] : undefined;

  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-volume`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mixColor(draft.ink, '#FFFFFF', 0.3)} />
          <stop offset="1" stopColor={mixColor(draft.ink, '#000000', 0.25)} />
        </linearGradient>
        <filter id={`${id}-sombra`} x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodOpacity="0.28" />
        </filter>
      </defs>
      <rect width="400" height="400" fill={draft.background} />
      {symbol ? (
        <g filter={shadow}>
          <circle
            cx="200"
            cy="150"
            r="82"
            fill={volume ? `url(#${id}-volume)` : draft.badge}
            stroke={volume ? 'none' : draft.accent}
            strokeWidth="5"
            strokeDasharray={symbol.kind === 'icon' ? undefined : '10 10'}
          />
          {Icon ? (
            <Icon
              x={148}
              y={98}
              width={104}
              height={104}
              color={volume ? draft.background : draft.ink}
              strokeWidth={1.6}
            />
          ) : (
            <text
              x="200"
              y="158"
              textAnchor="middle"
              fontSize="22"
              fontWeight="600"
              fill={volume ? draft.background : draft.ink}
              style={{ fontFamily: brandFamily(null) }}
            >
              {symbol.kind === 'own' ? 'seu desenho' : 'desenho'}
            </text>
          )}
          {volume ? (
            <ellipse cx="172" cy="104" rx="30" ry="14" fill="#FFFFFF" opacity="0.28" />
          ) : null}
        </g>
      ) : null}
      <text
        x="200"
        y={nameTop}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size.toFixed(1)}
        fontWeight={font.weight}
        letterSpacing={font.tracking}
        fill={draft.ink}
        filter={shadow}
        style={{ fontFamily: brandFamily(font.id) }}
      >
        {lines.map((line, index) => (
          <tspan key={index} x="200" dy={index === 0 ? 0 : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    </svg>
  );
}
