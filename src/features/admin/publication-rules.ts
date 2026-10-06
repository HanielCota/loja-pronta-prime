import { toSafeWebUrl } from '@/lib/urls';

export type PublicationBlock = {
  kind: 'text' | 'video' | 'link' | 'file' | 'image';
  data: Record<string, unknown>;
};

/** Diz à administradora o que falta antes de tornar uma aula visível para as alunas. */
export function lessonPublicationIssue(
  title: string,
  description: string | null,
  blocks: PublicationBlock[],
): string | null {
  if (!title.trim()) return 'Escreva o título da aula antes de publicar.';
  if (blocks.length === 0 && !description?.trim())
    return 'Adicione uma descrição ou pelo menos um material à aula.';

  for (const [index, block] of blocks.entries()) {
    const number = index + 1;
    const data = block.data;
    if (block.kind === 'text' && !nonEmpty(data.text))
      return `Preencha o texto ${number} antes de publicar.`;
    if (block.kind === 'video') {
      // O vídeo vazio é um espaço reservado explícito até a hospedagem ser escolhida.
      if (data.videoId !== '' && (data.provider !== 'pandavideo' || !isUuid(data.videoId)))
        return `Confira o vídeo ${number} antes de publicar.`;
    }
    if (block.kind === 'link') {
      if (!nonEmpty(data.label) || !isSafeWebUrl(data.url))
        return `Confira o nome e o endereço do link ${number} antes de publicar.`;
    }
    if (block.kind === 'file') {
      if (!nonEmpty(data.fileName) || !isStoredMaterial(data))
        return `Envie um arquivo válido no material ${number} antes de publicar.`;
    }
    if (block.kind === 'image') {
      if (!nonEmpty(data.alt) || !isStoredMaterial(data))
        return `Envie a imagem e escreva sua descrição no material ${number} antes de publicar.`;
    }
  }

  return null;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isUuid(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function isSafeWebUrl(value: unknown): boolean {
  return nonEmpty(value) && toSafeWebUrl(value) !== undefined;
}

function isStoredMaterial(data: Record<string, unknown>): boolean {
  return (
    typeof data.storageKey === 'string' &&
    data.storageKey.startsWith('sll/learning-content/') &&
    typeof data.contentType === 'string' &&
    typeof data.size === 'number' &&
    data.size > 0
  );
}
