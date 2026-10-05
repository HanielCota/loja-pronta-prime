import { useCurrentFrame } from 'remotion';
import { cn } from '@/lib/utils';
import { pop, ramp } from '../motion';

/** A palavra sem pontuação (pra comparar com as de destaque). */
const plain = (word: string) => word.replace(/[.,?!“”]/g, '');

/**
 * O título da cena: as palavras sobem de dentro de uma máscara, uma atrás da outra, e saem
 * juntas pra cima. `emphasis`: palavras em azul (só a que importa, como o azul do app, que é só
 * pra ação).
 */
export function Headline({
  text,
  at,
  until,
  className,
  emphasis = [],
  stagger = 2.5,
}: {
  text: string;
  /** Quadro (da cena) em que a primeira palavra entra. */
  at: number;
  /** Quadro em que o título sai (sem ele, fica até o fim da cena). */
  until?: number;
  className?: string;
  emphasis?: readonly string[];
  stagger?: number;
}) {
  const frame = useCurrentFrame();
  if (frame < at - 1 || (until !== undefined && frame > until + 12)) return null;
  const out = until === undefined ? 0 : ramp(frame, until, until + 10);
  const words = text.split(' ');

  return (
    <p
      className={cn('font-bold text-balance text-foreground', className)}
      style={{
        letterSpacing: '-0.035em',
        lineHeight: 1.08,
        transform: `translateY(${-out * 40}px)`,
        opacity: 1 - out,
      }}
    >
      {words.map((word, index) => {
        const t = pop(frame, at + index * stagger);
        return (
          <span
            key={index}
            // Margem por baixo da máscara: as letras com perna (g, p, ç) não ficam cortadas.
            style={{
              display: 'inline-block',
              overflow: 'hidden',
              verticalAlign: 'top',
              paddingBottom: '0.12em',
              marginBottom: '-0.12em',
            }}
          >
            <span
              className={emphasis.includes(plain(word)) ? 'text-primary' : undefined}
              style={{ display: 'inline-block', transform: `translateY(${(1 - t) * 110}%)` }}
            >
              {word}
              {index < words.length - 1 ? '\u00a0' : ''}
            </span>
          </span>
        );
      })}
    </p>
  );
}
