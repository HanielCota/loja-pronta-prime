import { z } from 'zod';
import { pandaVideoId } from '@/features/sll/panda-video';
import { toSafeWebUrl } from '@/lib/urls';

const safeWebUrl = z
  .url()
  .refine(
    (value) => toSafeWebUrl(value) !== undefined,
    'Digite um link que comece com http:// ou https://.',
  );

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
          note: z.string().trim().max(3000).default(''),
        }),
        z.object({
          id: z.preprocess((value) => (value === '' ? undefined : value), z.uuid().optional()),
          kind: z.literal('video'),
          provider: z.literal('pandavideo'),
          // O formulário aceita o link, mas nenhum endereço externo é salvo como vídeo.
          videoId: z
            .string()
            .trim()
            .transform((value) => pandaVideoId(value) ?? value)
            .pipe(z.union([z.literal(''), z.uuid()])),
          note: z.string().trim().max(3000).default(''),
        }),
        z.object({
          id: z.preprocess((value) => (value === '' ? undefined : value), z.uuid().optional()),
          kind: z.literal('file'),
          fileName: z.string().trim().min(1).max(160),
          attachedTo: z.union([z.literal(''), z.uuid()]).default(''),
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
