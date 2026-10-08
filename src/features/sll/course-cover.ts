/** O nome único do arquivo muda a URL ao publicar outra capa, sem expor a pasta do bucket. */
export function courseCoverVersion(storageKey: string): string {
  return storageKey.split('/').at(-1) ?? storageKey;
}

export function courseCoverSrc(trackId: string, storageKey: string): string {
  return `/api/sll/course-cover/${encodeURIComponent(trackId)}?v=${encodeURIComponent(courseCoverVersion(storageKey))}`;
}
