import { Audio } from '@remotion/media';
import type { CSSProperties } from 'react';
import { AbsoluteFill, Sequence, interpolate, staticFile } from 'remotion';
import { Subtitle } from './components/subtitle';
import { manrope } from './fonts';
import { LINES } from './narration';
import { APP_DURATION, AppInUse } from './scenes/app';
import { Final } from './scenes/final';
import { Problema, Promessa, Respira } from './scenes/intro';
import { SCENE_START, bars } from './timeline';

/**
 * O vídeo inteiro: abertura, o app em uso e o fecho, com a narração por cima da trilha. Os
 * cortes caem no compasso (SCENE_START); a voz de cada cena entra no seu tempo (NARRATION).
 */
const from = (scene: keyof typeof SCENE_START) => bars(SCENE_START[scene]);

/** O volume da música: de fundo, e mais baixo ainda enquanto a voz fala (com rampas suaves). */
const MUSIC = { alone: 0.45, underVoice: 0.2, ramp: 10 };

function musicVolume(frame: number) {
  let duck = 0;
  for (const line of LINES) {
    duck = Math.max(
      duck,
      interpolate(
        frame,
        [line.from - MUSIC.ramp, line.from, line.until, line.until + MUSIC.ramp * 2],
        [0, 1, 1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      ),
    );
  }
  return MUSIC.alone + (MUSIC.underVoice - MUSIC.alone) * duck;
}

export function Video() {
  return (
    <AbsoluteFill
      className="bg-background font-sans text-foreground antialiased"
      style={{ '--font-manrope': manrope } as CSSProperties}
    >
      <Sequence from={from('problema')} durationInFrames={from('respira')} name="O problema">
        <Problema />
      </Sequence>
      <Sequence
        from={from('respira')}
        durationInFrames={from('promessa') - from('respira')}
        name="Respira"
      >
        <Respira />
      </Sequence>
      <Sequence
        from={from('promessa')}
        durationInFrames={from('conversa') - from('promessa')}
        name="A promessa"
      >
        <Promessa />
      </Sequence>
      <Sequence from={from('conversa')} durationInFrames={APP_DURATION} name="O app em uso">
        <AppInUse />
      </Sequence>
      <Sequence from={from('final')} name="Final">
        <Final />
      </Sequence>

      <Subtitle />
      {LINES.map((line) => (
        <Sequence key={line.scene} from={line.from} layout="none" name={`voz: ${line.scene}`}>
          <Audio src={staticFile(`voice/${line.scene}.wav`)} volume={1} />
        </Sequence>
      ))}
      <Audio src={staticFile('audio/trilha.wav')} volume={musicVolume} />
    </AbsoluteFill>
  );
}
