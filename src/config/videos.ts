/**
 * Os vídeos da plataforma: cada um tem um lugar fixo na jornada (o "slot"). O arquivo de cada
 * slot fica no bucket e é trocado pelo painel (por enquanto, pelo script dev:video). Slot sem
 * vídeo enviado: a tela dele simplesmente não aparece.
 *
 * `minWatch`: quanto do vídeo (de 0 a 1) ela assiste antes do "Continuar" liberar ("Pular o
 * vídeo" continua ali, pra quem não pode ver agora).
 */
export const VIDEOS = {
  orientacao: {
    title: 'Vídeo de orientação',
    where: 'No fim da conversa inicial, antes da marca',
    minWatch: 0.75,
  },
  'marca-na-shopee': {
    title: 'Como colocar sua marca na Shopee',
    where: 'No passo a passo de colocar o logo e o texto na loja da Shopee',
    // Ela assiste junto do passo a passo escrito: nada fica travado esperando o vídeo.
    minWatch: 0,
  },
} as const;

export type VideoSlot = keyof typeof VIDEOS;

export function isVideoSlot(value: string): value is VideoSlot {
  return Object.hasOwn(VIDEOS, value);
}

/** Os tipos de vídeo aceitos (os que os navegadores tocam). */
export const VIDEO_TYPES = { 'video/mp4': 'mp4', 'video/webm': 'webm' } as const;

/** Tamanho máximo de um vídeo: uns 10 minutos em boa qualidade. */
export const VIDEO_MAX_BYTES = 500 * 1024 * 1024;
