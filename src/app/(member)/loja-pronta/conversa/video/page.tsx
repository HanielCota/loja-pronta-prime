import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { VIDEOS } from '@/config/videos';
import { FocusOnArrival } from '@/features/loja-pronta/components/focus-on-arrival';
import { ConversationLayout } from '@/features/loja-pronta/components/conversation-layout';
import { getOnboarding } from '@/features/loja-pronta/server/conversation';
import {
  CONVERSATION_PATH,
  DONE_PATH,
  QUESTION_COUNT,
  VIDEO_PATH,
} from '@/features/loja-pronta/steps';
import { greetingName } from '@/features/products/names';
import { requireProduct } from '@/features/products/server/access';
import { VideoGate } from '@/features/videos/components/video-gate';
import { getVideo } from '@/features/videos/server/videos';

export const metadata: Metadata = { title: 'Vídeo de orientação' };

const TITLE_ID = 'video-titulo';
const SLOT = 'orientacao';

/**
 * Logo depois de enviar a conversa: o vídeo que explica como a loja vai ficar pronta. Sem vídeo
 * enviado (ou conversa ainda não enviada), a página leva pra onde ela estaria sem ele.
 */
export default async function OrientationVideoPage() {
  const { session } = await requireProduct('loja-pronta', VIDEO_PATH);
  const [{ completedAt }, video] = await Promise.all([
    getOnboarding(session.user.id),
    getVideo(SLOT),
  ]);
  if (!completedAt) redirect(CONVERSATION_PATH);
  if (!video) redirect(DONE_PATH);
  const name = greetingName(session.user);
  const { title, minWatch } = VIDEOS[SLOT];

  return (
    <ConversationLayout
      account={session.user}
      header={{ label: 'Última parte', filled: QUESTION_COUNT, total: QUESTION_COUNT }}
      backHref="/loja-pronta"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1
            id={TITLE_ID}
            tabIndex={-1}
            className="text-title font-semibold text-balance outline-none sm:text-title-lg"
          >
            {name ? `Quase lá, ${name}! Última parte.` : 'Quase lá! Última parte.'}
          </h1>
          <p className="text-body text-pretty text-muted-foreground">
            Neste vídeo você entende como a sua loja vai ficar pronta.
          </p>
        </div>
        <FocusOnArrival targetId={TITLE_ID} />
        <VideoGate
          // O endereço muda quando o vídeo é trocado: o navegador não mostra o antigo.
          src={`/loja-pronta/videos/${SLOT}?v=${video.updatedAt.getTime()}`}
          captions={
            video.captionsKey
              ? `/loja-pronta/videos/${SLOT}?legenda=1&v=${video.updatedAt.getTime()}`
              : undefined
          }
          title={title}
          minWatch={minWatch}
          next={DONE_PATH}
        />
      </div>
    </ConversationLayout>
  );
}
