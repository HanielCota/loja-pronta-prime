import { useCurrentFrame } from 'remotion';
import { cn } from '@/lib/utils';
import { useLayout } from '../layout';
import { ramp } from '../motion';
import { LINES, type Line } from '../narration';

/**
 * A legenda da fala, embaixo: o trecho que a voz está dizendo, com as palavras acendendo no
 * tempo da voz (as que ainda vão ser ditas ficam apagadas). Frases longas vão em pedaços de até
 * `MAX_CHARS` letras, pra legenda nunca passar de duas linhas.
 */
const MAX_CHARS = 44;
/** A partir de quantas letras uma vírgula já fecha o pedaço. */
const COMMA_AFTER = 18;

/** Os pedaços da fala, cada um com as suas palavras. */
function chunks(line: Line) {
  const out: Line['words'][] = [];
  let current: Line['words'] = [];
  let size = 0;
  for (const word of line.words) {
    if (current.length && size + word.word.length + 1 > MAX_CHARS) {
      out.push(current);
      current = [];
      size = 0;
    }
    current.push(word);
    size += word.word.length + 1;
    // A pontuação fecha o pedaço: a legenda acompanha a respiração da voz.
    if (
      (/[.?!:]$/.test(word.word) && size > 16) ||
      (word.word.endsWith(',') && size > COMMA_AFTER)
    ) {
      out.push(current);
      current = [];
      size = 0;
    }
  }
  if (current.length) out.push(current);
  return out;
}

const PIECES = LINES.filter((line) => !line.onScreen).flatMap((line) => chunks(line));

export function Subtitle() {
  const frame = useCurrentFrame();
  const { portrait } = useLayout();
  const index = PIECES.findIndex((piece, k) => {
    const next = PIECES[k + 1];
    const end = Math.min(piece.at(-1)!.until + 18, next ? next[0]!.from : Infinity);
    return frame >= piece[0]!.from - 3 && frame < end;
  });
  const piece = PIECES[index];
  if (!piece) return null;
  const appear = ramp(frame, piece[0]!.from - 3, piece[0]!.from + 3);

  return (
    <div
      className="absolute inset-x-0 flex justify-center"
      style={{ bottom: portrait ? 330 : 36, padding: portrait ? '0 70px' : '0 200px' }}
    >
      <p
        className="rounded-3xl bg-foreground/85 text-center font-semibold text-balance text-background"
        style={{
          fontSize: portrait ? 46 : 40,
          lineHeight: 1.25,
          padding: portrait ? '14px 30px' : '12px 28px',
          opacity: appear,
          transform: `translateY(${(1 - appear) * 10}px)`,
        }}
      >
        {piece.map((word, k) => (
          <span key={k} className={cn(frame < word.from && 'text-background/45')}>
            {word.word}
            {k < piece.length - 1 ? ' ' : ''}
          </span>
        ))}
      </p>
    </div>
  );
}
