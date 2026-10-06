export type ContentPreviewKind = 'text' | 'video' | 'link' | 'file' | 'image';

/** Entrega à tela de leitura só os campos que ela precisa mostrar, sem chaves internas do arquivo. */
export function contentPreviewData(
  kind: ContentPreviewKind,
  data: unknown,
): Record<string, string> {
  if (typeof data !== 'object' || data === null) return {};

  const fields = {
    text: ['text'],
    video: ['provider', 'videoId', 'note'],
    link: ['url', 'label', 'note'],
    file: ['fileName', 'contentType', 'attachedTo'],
    image: ['alt'],
  } satisfies Record<ContentPreviewKind, string[]>;

  const values = data as Record<string, unknown>;
  const preview: Record<string, string> = {};

  for (const field of fields[kind]) {
    const value = values[field];
    if (typeof value !== 'string') continue;
    if (field === 'url') {
      const safeUrl = toSafeWebUrl(value);
      if (safeUrl) preview.url = safeUrl;
      continue;
    }
    preview[field] = value;
  }

  return preview;
}

function toSafeWebUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
      return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}
