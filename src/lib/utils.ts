import { createCn } from 'cn/config';

/**
 * Junta classes e resolve conflitos do Tailwind (a última vence).
 * Conhece os tokens próprios do tema (globals.css) pra resolver conflitos com eles também;
 * sem isso, `text-body` seria confundido com uma cor.
 */
export const cn = createCn({
  extend: {
    theme: {
      radius: ['field', 'card'],
      shadow: ['card'],
      text: ['title', 'title-lg', 'body'],
    },
  },
});
