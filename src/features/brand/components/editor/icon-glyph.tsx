import { ICON_VIEWBOX, iconPaths, type IconWeight, type SceneIconId } from '../../logo/icons';

/**
 * Um desenho do logo como miniatura (nas listas do editor), na cor do texto em volta. Só desenho:
 * o nome vai no botão que contém ele.
 */
export function IconGlyph({
  id,
  weight = 'bold',
  className = 'size-7',
}: {
  id: SceneIconId;
  weight?: IconWeight;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
      className={className}
      fill="currentColor"
    >
      {iconPaths(id, weight).map(({ d, opacity }, index) => (
        <path key={index} d={d} opacity={opacity} />
      ))}
    </svg>
  );
}
