import { z } from 'zod';

const safeWebUrl = z.url().refine((value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}, 'Digite um link que comece com http:// ou https://.');

export const lessonEditSchema = z.object({
  lessonId: z.uuid(),
  title: z.string().trim().min(1, 'Digite o título da aula.').max(180),
  description: z
    .string()
    .trim()
    .max(1200)
    .transform((value) => value || null),
  blocks: z
    .array(
      z.discriminatedUnion('kind', [
        z.object({
          id: z.preprocess((value) => (value === '' ? undefined : value), z.uuid().optional()),
          kind: z.literal('text'),
          text: z.string().trim().min(1).max(12000),
        }),
        z.object({
          id: z.preprocess((value) => (value === '' ? undefined : value), z.uuid().optional()),
          kind: z.literal('link'),
          label: z.string().trim().min(1).max(180),
          url: safeWebUrl,
        }),
        z.object({
          id: z.preprocess((value) => (value === '' ? undefined : value), z.uuid().optional()),
          kind: z.literal('video'),
          provider: z.literal('pandavideo'),
          // Campo vazio mantém o espaço da aula sem inventar uma URL. A publicação valida o ID.
          videoId: z.union([z.literal(''), z.uuid()]),
        }),
        z.object({
          id: z.preprocess((value) => (value === '' ? undefined : value), z.uuid().optional()),
          kind: z.literal('file'),
          fileName: z.string().trim().min(1).max(160),
        }),
        z.object({
          id: z.preprocess((value) => (value === '' ? undefined : value), z.uuid().optional()),
          kind: z.literal('image'),
          alt: z.string().trim().min(1).max(300),
        }),
      ]),
    )
    .max(100),
});

export type LessonEditInput = z.infer<typeof lessonEditSchema>;

/** Valida campos editáveis e impede links com protocolos que podem executar código. */
export function parseLessonEdit(input: unknown) {
  return lessonEditSchema.safeParse(input);
}
