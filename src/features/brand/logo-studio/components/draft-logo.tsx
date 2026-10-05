import { useId } from 'react';
import { BRAND_PATH } from '../../steps';
import { draftOf, mixColor, nameLines } from '../draft';
import type { LogoPicks } from '../model';
import { LOGO_LETTERING_IDS, type LogoLetteringId } from '../options';
import { SYMBOL_ICONS } from './symbol-icons';

/** A família de cada letra no rascunho (o arquivo vem da rota marca/fontes). */
const familyOf = (id: LogoLetteringId | null) =>
  id ? `'Logo ${id}', var(--font-sans)` : 'var(--font-sans)';

/** As letras do rascunho: vai uma vez na página do estúdio. */
export function DraftFonts() {
  return (
    <style>
      {LOGO_LETTERING_IDS.map(
        (id) =>
          `@font-face{font-family:'Logo ${id}';src:url('${BRAND_PATH}/fontes/${id}') format('woff');font-display:swap}`,
      ).join('')}
    </style>
  );
}

/** Onde cabe o nome (de 400 de largura, sobra margem dos dois lados). */
const NAME_WIDTH = 340;

/**
 * O rascunho do logo, em SVG: o desenho numa bolinha (ou o lugar dele) e o nome embaixo, nas
 * cores, na letra e no fundo escolhidos. `label`: o que o leitor de tela ouve (sem ele, o
 * rascunho é só enfeite e fica escondido).
 */
export function DraftLogo({
  picks,
  storeName,
  label,
  className,
}: {
  picks: LogoPicks;
  storeName: string;
  label?: string;
  className?: string;
}) {
  // Só letras e números: o id vai dentro de url(#...), onde ":" e "«" atrapalham.
  const id = `rascunho${useId().replace(/[^\w-]/g, '')}`;
  const draft = draftOf(picks);
  const { font, symbol, volume } = draft;
  const lines = nameLines(font.upper ? storeName.toLocaleUpperCase('pt-BR') : storeName);
  const longest = Math.max(...lines.map((line) => line.length), 1);
  const base = (symbol ? 60 : 80) / (lines.length === 2 ? 1.2 : 1);
  const size = Math.min(base, NAME_WIDTH / (longest * font.width + font.tracking / 10));
  const lineHeight = size * 1.12;
  // Com desenho, o nome fica embaixo; sem, no meio.
  const nameTop = symbol ? 290 : 200 - ((lines.length - 1) * lineHeight) / 2;
  const shadow = volume ? `url(#${id}-sombra)` : undefined;
  const Icon = symbol?.kind === 'icon' ? SYMBOL_ICONS[symbol.icon] : null;

  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
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
              style={{ fontFamily: 'var(--font-sans)' }}
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
        style={{ fontFamily: familyOf(font.id) }}
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
