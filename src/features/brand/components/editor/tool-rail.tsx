'use client';

import {
  GalleryHorizontalEndIcon,
  LayersIcon,
  LayoutTemplateIcon,
  PaletteIcon,
  ShapesIcon,
  TypeIcon,
  WandSparklesIcon,
  type LucideIcon,
} from 'lucide-react';
import { useId } from 'react';

export const TOOLS = [
  { id: 'estilo', label: 'Estilo', icon: PaletteIcon },
  { id: 'modelos', label: 'Modelos', icon: LayoutTemplateIcon },
  { id: 'desenhos', label: 'Desenhos', icon: ShapesIcon },
  { id: 'textos', label: 'Textos', icon: TypeIcon },
  { id: 'partes', label: 'Partes', icon: LayersIcon },
  { id: 'versoes', label: 'Versões', icon: GalleryHorizontalEndIcon },
  // Ainda não funciona: o painel diz "Em breve" (ver logo-editor).
  { id: 'ia', label: 'IA', icon: WandSparklesIcon },
] as const satisfies readonly { id: string; label: string; icon: LucideIcon }[];

export type ToolId = (typeof TOOLS)[number]['id'];

/**
 * O menu do editor, estilo Canva: cada item com o ícone e o nome escrito (não só o desenho). No
 * computador, uma coluna à esquerda do painel; no celular, em fileiras embaixo do logo (sem rolar
 * de lado, pra nenhum item ficar escondido). São botões de opção: as setas trocam de item.
 */
export function ToolRail({ value, onChange }: { value: ToolId; onChange: (tool: ToolId) => void }) {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Ferramentas do logo</legend>
      {/* No celular bem estreito (320px), três por fileira: com quatro, os nomes se encostam. */}
      <div className="grid grid-cols-3 gap-1 min-[360px]:grid-cols-4 lg:grid-cols-1 lg:gap-1.5">
        {TOOLS.map(({ id, label, icon: Icon }) => (
          <label
            key={id}
            className="flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl px-1 text-sm font-semibold text-muted-foreground transition-colors duration-100 hover:bg-muted hover:text-foreground has-checked:bg-primary-soft has-checked:text-link has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-focus-visible:outline-solid motion-reduce:transition-none lg:min-h-[68px] forced-colors:has-checked:border-2 forced-colors:has-checked:border-[Highlight]"
          >
            <input
              type="radio"
              name={name}
              value={id}
              checked={value === id}
              onChange={() => onChange(id)}
              className="sr-only"
            />
            <Icon aria-hidden="true" className="size-6 shrink-0" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
