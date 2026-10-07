const PANDA_PLAYER_ORIGIN = 'https://player-vz-dbb97dad-52b.tv.pandavideo.com.br';
const VIDEO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** O admin pode colar o link do player ou o ID, mas o banco guarda somente o ID. */
export function pandaVideoId(value: string): string | null {
  const input = value.trim();
  if (VIDEO_ID.test(input)) return input;
  try {
    const url = new URL(input);
    const id = url.searchParams.get('v');
    if (
      url.origin !== PANDA_PLAYER_ORIGIN ||
      url.pathname !== '/embed/' ||
      url.username ||
      url.password
    )
      return null;
    return id && VIDEO_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Usa o player da conta conferida, sem aceitar endereços externos no conteúdo da aula. */
export function pandaVideoEmbedUrl(data: Record<string, unknown>): string | null {
  if (data.provider !== 'pandavideo' || typeof data.videoId !== 'string') return null;
  const id = pandaVideoId(data.videoId);
  if (!id) return null;
  // A aula só começa quando a aluna escolhe reproduzir, inclusive com animações reduzidas.
  return `${PANDA_PLAYER_ORIGIN}/embed/?v=${id}&autoplay=false`;
}

export type PandaVideoImportDecision = 'insert' | 'fill' | 'ready' | 'conflict';

/** Repetir a importação não troca vídeos editados no admin nem escolhe entre vários blocos. */
export function pandaVideoImportDecision(
  videos: ReadonlyArray<{ data: Record<string, unknown> }>,
  videoId: string,
): PandaVideoImportDecision {
  if (!pandaVideoEmbedUrl({ provider: 'pandavideo', videoId })) return 'conflict';
  if (videos.length === 0) return 'insert';
  if (videos.length !== 1) return 'conflict';
  const data = videos[0]!.data;
  if (data.provider !== 'pandavideo') return 'conflict';
  if (data.videoId === '') return 'fill';
  return data.videoId === videoId ? 'ready' : 'conflict';
}
