import path from 'node:path';
import type { WebpackOverrideFn } from '@remotion/bundler';
import { enableTailwind } from '@remotion/tailwind-v4';

/**
 * O vídeo usa o código do app (cores do logo, rosto do mascote, ideias de nome) pelo mesmo
 * atalho `@/`, pra mostrar o produto de verdade. O `next/image` vira um substituto: o vídeo só
 * precisa das medidas do mascote, não do otimizador de imagens do Next.
 */
// A pasta do vídeo: os comandos rodam de dentro dela (o Remotion lê este arquivo como CommonJS,
// sem import.meta).
const here = process.cwd();

export const webpackOverride: WebpackOverrideFn = (config) => {
  const withTailwind = enableTailwind(config);
  return {
    ...withTailwind,
    output: {
      ...withTailwind.output,
      // As imagens vêm da pasta do app, fora de video/. O nome por caminho do Studio sairia
      // da pasta do pacote e devolveria HTML no lugar do PNG; o hash mantém tudo dentro dele.
      assetModuleFilename: 'assets/[contenthash][ext]',
    },
    resolve: {
      ...withTailwind.resolve,
      alias: {
        ...withTailwind.resolve?.alias,
        '@': path.join(here, '..', 'src'),
        'next/image': path.join(here, 'src', 'stubs', 'next-image.ts'),
      },
    },
  };
};
