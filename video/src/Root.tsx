import { Composition } from 'remotion';
import { Video } from './Video';
import { DURATION, FPS } from './timeline';
import './style.css';

/** As duas versões: horizontal (página de vendas, YouTube) e vertical (Reels, Stories, TikTok). */
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
    </>
  );
}
