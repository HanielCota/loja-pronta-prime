import { Composition } from 'remotion';
import { Reel } from './reel/Reel';
import { REEL_DURATION } from './reel/timeline';
import { Video } from './Video';
import { DURATION, FPS } from './timeline';
import './style.css';

/**
 * A apresentação em duas versões, horizontal (página de vendas, YouTube) e vertical (Reels,
 * Stories, TikTok), e o vídeo curto de 30 segundos, só do app no celular.
 */
export function Root() {
  return (
    <>
      <Composition
        id="Apresentacao16x9"
        component={Video}
        durationInFrames={DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Apresentacao9x16"
        component={Video}
        durationInFrames={DURATION}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="Celular30s"
        component={Reel}
        durationInFrames={REEL_DURATION}
        fps={FPS}
        width={1080}
        height={1920}
      />
    </>
  );
}
