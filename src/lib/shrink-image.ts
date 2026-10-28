/**
 * Reduz a imagem que ela escolheu pra no máximo 1024px antes de mandar (uma foto do celular tem
 * vários MB; o logo aceita até 1 MB por envio e a foto de perfil, até 5 MB). WebP mantém o fundo transparente; se ainda
 * ficar grande, vai em JPEG. Imagem que o navegador não abre: `null`.
 */

const MAX_SIDE = 1024;
const MAX_BYTES = 950 * 1024;

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function shrinkImage(file: File): Promise<Blob | null> {
  let bitmap: ImageBitmap | undefined;
  let canvas: HTMLCanvasElement | undefined;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    // Release the original decoded image before encoding the smaller canvas.
    bitmap.close();
    bitmap = undefined;
    for (const [type, quality] of [
      ['image/webp', 0.92],
      ['image/jpeg', 0.88],
      ['image/jpeg', 0.75],
    ] as const) {
      const blob = await toBlob(canvas, type, quality);
      if (blob && blob.size <= MAX_BYTES) return blob;
    }
    return null;
  } catch {
    return null;
  } finally {
    bitmap?.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
