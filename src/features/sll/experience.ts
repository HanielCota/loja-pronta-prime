import type { ExpertId } from '@/config/experts';
import { contentPreviewData, type ContentPreviewKind } from '@/features/admin/content-preview';

/** A aula comum fica em cache; a variante só é aplicada depois de conferir o acesso da pessoa. */
export function expertContentData(
  kind: ContentPreviewKind,
  data: unknown,
  expert: ExpertId,
  publishedVideoId: string | null | undefined,
) {
  const original = contentPreviewData(kind, data);
  if (kind !== 'video') return original;
  if (publishedVideoId) return { ...original, provider: 'pandavideo', videoId: publishedVideoId };
  if (expert === 'pri') return original;
  return { provider: 'pandavideo', videoId: '' };
}
