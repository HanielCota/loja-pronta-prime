/**
 * Substituto do `next/image` no vídeo: o arquivo de medidas do mascote (art.ts) importa daqui,
 * mas o vídeo não usa o otimizador do Next (as imagens entram direto pelo <Img> do Remotion).
 */
export type StaticImageData = { src: string; height: number; width: number };
export function getImageProps(_options: unknown) {
  return { props: { srcSet: '' } };
}
