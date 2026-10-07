/** Monta um embed Panda somente para um host de player explicitamente configurado. */
export function pandaVideoEmbedUrl(videoId: string, playerHost?: string): string | null {
  if (!isUuid(videoId) || !playerHost) return null;

  try {
    const url = new URL(playerHost);
    if (
      url.protocol !== 'https:' ||
      !/^player-vz-[a-z0-9-]+\.tv\.pandavideo\.com\.br$/i.test(url.hostname)
    )
      return null;

    return `${url.origin}/embed/?v=${encodeURIComponent(videoId)}`;
  } catch {
    return null;
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
