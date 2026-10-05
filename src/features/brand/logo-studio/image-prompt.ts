import type { LogoBrief } from './model';
import { LOGO_TWEAKS, type LogoTweak } from './tweaks';

/**
 * O pedido da imagem do logo, montado com o resumo das escolhas dela. Em inglês (o modelo de imagem
 * segue melhor), com o nome da loja entre aspas pra ele escrever certinho, e as regras que fazem
 * um logo funcionar na Shopee: quadrado, centralizado, legível pequeno, sem enfeite de foto.
 */
export function logoImagePrompt(brief: LogoBrief, storeName: string, tweak?: LogoTweak): string {
  // Os ajustes guardados e o de agora (sem repetir).
  const tweaks = [...new Set([...(brief.tweaks ?? []), ...(tweak ? [tweak] : [])])];
  const name = storeName.replace(/["\r\n]/g, '').trim();
  const look =
    brief.look === 'realista'
      ? 'Photorealistic, polished 3D emblem style, soft studio lighting, still simple and bold so it reads at small sizes.'
      : 'Clean flat vector illustration style, simple bold shapes, smooth edges, no photographic textures.';
  return [
    `Design a professional square logo for an online store named "${name}".`,
    `Write the store name "${name}" exactly as given, spelled correctly, large and easy to read.`,
    `Symbol or drawing: ${brief.symbol}.`,
    `Colors: ${brief.colors}.`,
    `Lettering style: ${brief.lettering}.`,
    `Feeling it should convey: ${brief.mood}.`,
    `Background: ${brief.background}, filling the whole square.`,
    brief.extras ? `Extra details: ${brief.extras}.` : '',
    ...tweaks.map((id) => LOGO_TWEAKS[id].prompt),
    look,
    'Centered composition with comfortable margins, everything inside a circle-safe area (it will be cropped to a circle as a profile picture).',
    'Must stay legible at 64x64 pixels. No mockup, no hands, no extra words, no watermark, no border frame.',
    'The texts above may be in Portuguese: keep the store name in its original language.',
  ]
    .filter(Boolean)
    .join('\n');
}
