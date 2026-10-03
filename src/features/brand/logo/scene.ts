import { z } from 'zod';
import { LOGO_FONT_IDS } from './fonts';
import { SCENE_ICON_IDS } from './icons';

/** Tela do logo: quadrada, como a foto de perfil da loja (a Shopee mostra num círculo). */
export const SCENE_SIZE = 1000;

/** Quantos elementos cabem num logo: o bastante pra decorar, pouco pra virar bagunça. */
export const MAX_ELEMENTS = 24;

/** Texto que ela mesma escreve (um slogan curto, "desde 2020"). */
export const CUSTOM_TEXT_MAX = 40;

const hex = z.string().regex(/^#[0-9a-f]{6}$/);
/** Um pouco além da tela: dá pra encostar um elemento na borda e deixar parte pra fora. */
const coordinate = z
  .number()
  .finite()
  .min(-SCENE_SIZE / 2)
  .max(SCENE_SIZE * 1.5);
const length = z
  .number()
  .finite()
  .min(8)
  .max(SCENE_SIZE * 1.5);

/**
 * O que todo elemento tem. `x` e `y` são o centro dele (girar e mudar de tamanho não tiram o
 * elemento do lugar); `rotation` em graus.
 */
const common = {
  id: z.string().regex(/^[a-z0-9-]{1,16}$/),
  x: coordinate,
  y: coordinate,
  rotation: z.number().finite().min(-360).max(360),
  opacity: z.number().min(0.1).max(1),
};

/**
 * Texto: o nome da loja (`name`, segue o nome da marca se ele mudar), a primeira letra dele
 * (`initial`) ou um texto dela (`custom`). Sai como contorno, nunca como texto no SVG. `size` é o
 * tamanho da letra; se o texto não couber em `maxWidth`, a letra diminui. `lines`: em quantas
 * linhas o texto se divide (as palavras são repartidas pra as linhas ficarem parecidas).
 */
const textElement = z.object({
  ...common,
  type: z.literal('text'),
  source: z.enum(['name', 'initial', 'custom']),
  value: z.string().trim().min(1).max(CUSTOM_TEXT_MAX).optional(),
  font: z.enum(LOGO_FONT_IDS),
  color: hex,
  size: z.number().finite().min(12).max(600),
  maxWidth: length,
  lines: z.number().int().min(1).max(3),
  align: z.enum(['center', 'left']),
});

/**
 * Um desenho da lista de ícones num quadrado de `size`: em traço ou, com `filled`, cheio (o
 * traço também pinta o miolo, como um carimbo).
 */
const iconElement = z.object({
  ...common,
  type: z.literal('icon'),
  icon: z.enum(SCENE_ICON_IDS),
  color: hex,
  size: length,
  filled: z.boolean().optional(),
});

/**
 * Forma: círculo cheio, anel (só o contorno, com `stroke` de espessura) ou retângulo de cantos
 * arredondados (`radius`).
 */
const shapeElement = z.object({
  ...common,
  type: z.literal('shape'),
  shape: z.enum(['circle', 'ring', 'rect']),
  color: hex,
  width: length,
  height: length,
  radius: z.number().finite().min(0).max(SCENE_SIZE).optional(),
  stroke: z.number().finite().min(1).max(120).optional(),
});

export const sceneElementSchema = z
  .discriminatedUnion('type', [textElement, iconElement, shapeElement])
  .refine((element) => element.type !== 'text' || element.source !== 'custom' || element.value, {
    message: 'Texto sem conteúdo',
  });

/**
 * O logo como cena (versão 2): o fundo e os elementos, do mais de trás pro mais da frente. É o
 * que o editor livre muda; os logos do estúdio guiado (versão 1, LogoConfig) viram cena com
 * configToScene.
 */
export const logoSceneSchema = z.object({
  version: z.literal(2),
  background: hex,
  elements: z.array(sceneElementSchema).max(MAX_ELEMENTS),
});

export type LogoScene = z.infer<typeof logoSceneSchema>;
export type SceneElement = z.infer<typeof sceneElementSchema>;
export type TextElement = z.infer<typeof textElement>;
export type IconElement = z.infer<typeof iconElement>;
export type ShapeElement = z.infer<typeof shapeElement>;
