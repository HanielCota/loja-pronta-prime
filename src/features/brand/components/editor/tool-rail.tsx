'use client';

import {
  GalleryHorizontalEndIcon,
  LayersIcon,
  LayoutTemplateIcon,
  PaletteIcon,
  ShapesIcon,
  TypeIcon,
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
] as const satisfies readonly { id: string; label: string; icon: LucideIcon }[];

export type ToolId = (typeof TOOLS)[number]['id'];

/**
 * O menu do editor, estilo Canva: cada item com o ícone e o nome escrito (não só o desenho). No
 * computador, uma coluna à esquerda do painel; no celular, duas fileiras embaixo do logo (sem
 * rolar de lado, pra nenhum item ficar escondido). São botões de opção: as setas trocam de item.
 */
export function ToolRail({ value, onChange }: { value: ToolId; onChange: (tool: ToolId) => void }) {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Ferramentas do logo</legend>
      <div className="grid grid-cols-3 gap-1 lg:grid-cols-1 lg:gap-1.5">
        {TOOLS.map(({ id, label, icon: Icon }) => (
          <label
            key={id}
            className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl px-2 text-body font-semibold text-muted-foreground transition-colors duration-100 hover:bg-muted hover:text-foreground has-checked:bg-primary-soft has-checked:text-link has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-focus-visible:outline-solid motion-reduce:transition-none lg:min-h-[72px] lg:flex-col lg:gap-1 lg:px-1 lg:text-sm forced-colors:has-checked:border-2 forced-colors:has-checked:border-[Highlight]"
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
