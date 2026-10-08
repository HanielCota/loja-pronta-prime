import { revalidatePath, revalidateTag } from 'next/cache';

export const SLL_CONTENT_TAG = 'sll-published-content';
export const SLL_CONTENT_SECONDS = 300;

/** Publicar ou retirar conteúdo precisa valer na próxima leitura, inclusive nas etapas. */
export function revalidateSllContent() {
  revalidateTag(SLL_CONTENT_TAG, { expire: 0 });
  revalidatePath('/sll', 'layout');
}
