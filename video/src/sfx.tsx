import { Audio } from '@remotion/media';
import { Sequence, staticFile } from 'remotion';

/**
 * Um efeito sonoro no quadro `at` (relativo à cena). Os arquivos saem de scripts/make-audio.ts.
 * O volume padrão fica baixo: o efeito acompanha a imagem, não compete com a trilha.
 */
export function Sfx({ name, at, volume = 0.5 }: { name: string; at: number; volume?: number }) {
  return (
    <Sequence from={Math.round(at)} layout="none" name={`som: ${name}`}>
      <Audio src={staticFile(`audio/${name}.wav`)} volume={volume} />
    </Sequence>
  );
}
