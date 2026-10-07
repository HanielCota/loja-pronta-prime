import { VIDEOS, type VideoSlot } from '@/config/videos';
import { getVideo } from './videos';

/**
 * O vídeo de um passo a passo, quando já foi enviado pro espaço dele (sem vídeo, nada aparece).
 * Não trava nada: ela assiste junto do passo a passo escrito, ao contrário do VideoGate.
 */
export async function GuideVideo({ slot }: { slot: VideoSlot }) {
  const video = await getVideo(slot);
  if (!video) return null;
  // O endereço muda quando o vídeo é trocado: o navegador não mostra o antigo.
  const src = `/loja-pronta/videos/${slot}?v=${video.updatedAt.getTime()}`;
  return (
    // A legenda vem junto quando foi enviada (o <track> abaixo); a regra não enxerga o "se".
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      src={src}
      title={VIDEOS[slot].title}
      controls
      playsInline
      preload="metadata"
      className="aspect-video w-full rounded-3xl shadow-card"
    >
      {video.captionsKey ? (
        <track kind="captions" src={`${src}&legenda=1`} srcLang="pt-BR" label="Português" default />
      ) : null}
    </video>
  );
}
