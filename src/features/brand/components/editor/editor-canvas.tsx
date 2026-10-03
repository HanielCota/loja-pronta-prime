'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  elementLabel,
  findElement,
  replaceElement,
  rotationFromPointer,
  scaleElement,
  snapCenter,
  type Size,
} from '../../logo/editor';
import { SCENE_SIZE, type LogoScene, type SceneElement } from '../../logo/scene';
import { renderElementBody, type LogoFonts } from '../../logo/scene-render';

type Point = { x: number; y: number };

/** O que o ponteiro está fazendo agora (e de onde partiu). */
type Drag =
  | { mode: 'move'; start: Point; element: SceneElement }
  | { mode: 'scale'; start: Point; element: SceneElement }
  | { mode: 'rotate'; element: SceneElement }
  /** Dois dedos no celular: a distância muda o tamanho e o ângulo entre eles gira. */
  | { mode: 'pinch'; element: SceneElement; distance: number; angle: number };

/** Distância e ângulo (em graus) entre os dois primeiros dedos na tela. */
function fingers(points: Map<number, Point>): { distance: number; angle: number } | undefined {
  const [a, b] = [...points.values()];
  if (!a || !b) return undefined;
  return {
    distance: Math.hypot(b.x - a.x, b.y - a.y),
    angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
  };
}

/** Ângulo entre -180 e 180. */
const normalizeAngle = (angle: number) => ((((angle + 180) % 360) + 360) % 360) - 180;

type EditorCanvasProps = {
  scene: LogoScene;
  name: string;
  fonts: LogoFonts | null;
  fontsFailed: boolean;
  sizes: Map<string, Size>;
  selectedId: string | null;
  /** 1 = o quadro na largura da coluna. */
  zoom: number;
  /** Escurece o que fica fora do círculo em que a Shopee mostra o logo. */
  showCircle: boolean;
  onSelect: (id: string | null) => void;
  onBeginGesture: () => void;
  onLive: (scene: LogoScene) => void;
  onEndGesture: () => void;
};

/**
 * O quadro: o logo desenhado pelo mesmo código do servidor (o que ela vê é o que baixa) e, por
 * cima do elemento escolhido, a moldura com as alças. Os gestos só mexem na cena; as regras
 * (encaixe no meio, limites, ângulos) são as do editor.ts.
 */
export function EditorCanvas({
  scene,
  name,
  fonts,
  fontsFailed,
  sizes,
  selectedId,
  zoom,
  showCircle,
  onSelect,
  onBeginGesture,
  onLive,
  onEndGesture,
}: EditorCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [guides, setGuides] = useState({ vertical: false, horizontal: false });
  // Os dedos (ou o mouse) na tela agora, pra reconhecer a pinça com dois dedos.
  const [pointers] = useState(() => new Map<number, Point>());
  // Quantos pixels da tela vale uma unidade do logo: as alças ficam do mesmo tamanho com zoom.
  const [unit, setUnit] = useState(0.6);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setUnit(entry.contentRect.width / SCENE_SIZE);
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  // O desenho de cada elemento só muda quando ele muda (arrastar só troca o lugar).
  const [cache] = useState(() => new Map<string, string>());
  const bodies = useMemo(() => {
    const map = new Map<string, string>();
    if (!fonts) return map;
    for (const element of scene.elements) {
      const key = JSON.stringify({ ...element, x: 0, y: 0, rotation: 0, opacity: 1, name });
      let body = cache.get(key);
      if (!body) {
        body = renderElementBody(element, name, fonts);
        cache.set(key, body);
      }
      map.set(element.id, body);
    }
    return map;
  }, [scene, fonts, name, cache]);

  function toScene(event: PointerEvent): Point {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM()?.inverse();
    if (!svg || !matrix) return { x: 0, y: 0 };
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
    return { x: point.x, y: point.y };
  }

  function start(event: PointerEvent, next: Drag) {
    event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);
    onBeginGesture();
    setDrag(next);
  }

  /** Cada dedo que encosta. O segundo, com um elemento escolhido, vira pinça. */
  function onPointerDownCapture(event: PointerEvent<SVGSVGElement>) {
    pointers.set(event.pointerId, toScene(event));
    const pair = fingers(pointers);
    const element = findElement(scene, selectedId);
    if (pointers.size !== 2 || !pair || !element) return;
    event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);
    if (!drag) onBeginGesture();
    setGuides({ vertical: false, horizontal: false });
    setDrag({ mode: 'pinch', element, ...pair });
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, toScene(event));
    if (!drag) return;
    const pointer = toScene(event);
    const { element } = drag;
    let next: SceneElement;
    if (drag.mode === 'pinch') {
      const pair = fingers(pointers);
      if (!pair || drag.distance <= 0) return;
      next = {
        ...scaleElement(element, pair.distance / drag.distance),
        rotation: Math.round(normalizeAngle(element.rotation + pair.angle - drag.angle) * 10) / 10,
      };
    } else if (drag.mode === 'move') {
      const snapped = snapCenter(
        element.x + pointer.x - drag.start.x,
        element.y + pointer.y - drag.start.y,
      );
      setGuides(snapped.guides);
      next = { ...element, x: snapped.x, y: snapped.y };
    } else if (drag.mode === 'scale') {
      const from = Math.hypot(drag.start.x - element.x, drag.start.y - element.y);
      const to = Math.hypot(pointer.x - element.x, pointer.y - element.y);
      next = from > 0 ? scaleElement(element, to / from) : element;
    } else {
      next = { ...element, rotation: rotationFromPointer(element, pointer, event.shiftKey) };
    }
    onLive(replaceElement(scene, next));
  }

  function onPointerUp(event: PointerEvent<SVGSVGElement>) {
    pointers.delete(event.pointerId);
    // Na pinça, tirar um dedo já termina (o outro não volta a arrastar sozinho).
    if (!drag || (drag.mode !== 'pinch' && pointers.size > 0)) return;
    setDrag(null);
    setGuides({ vertical: false, horizontal: false });
    onEndGesture();
  }

  const selected = findElement(scene, selectedId);
  const selectedSize = selected ? sizes.get(selected.id) : undefined;
  const handle = 9 / unit;
  // Área de toque das alças: 44px, mesmo com a bolinha menor.
  const handleTouch = 22 / unit;

  return (
    <div className="overflow-auto rounded-card border border-border bg-[#e8e8ed] p-2 [--canvas-max:34dvh] lg:p-4 lg:[--canvas-max:calc(100dvh-420px)] forced-colors:border-[CanvasText]">
      {/* 100% = até 640px; acima disso, o quadro rola. */}
      <div
        className="mx-auto"
        style={{
          // Em 100%, cabe na janela (no computador, com o topo e a barra de salvar à vista; no
          // celular, em até um terço da altura, pra sobrar espaço pros controles); acima, rola.
          width: zoom <= 1 ? `min(${640 * zoom}px, 100%, var(--canvas-max))` : `${640 * zoom}px`,
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SCENE_SIZE} ${SCENE_SIZE}`}
          className="block aspect-square w-full touch-none rounded-lg bg-card shadow-card select-none"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerDownCapture={onPointerDownCapture}
          onPointerDown={() => {
            // Tocar no fundo solta o elemento (mas não o segundo dedo de uma pinça).
            if (!drag && pointers.size <= 1) onSelect(null);
          }}
        >
          <title>{`Seu logo, com ${scene.elements.length} elementos. Use a lista de camadas pra escolher um.`}</title>
          <rect width={SCENE_SIZE} height={SCENE_SIZE} fill={scene.background} />
          {fonts
            ? scene.elements.map((element) => {
                const size = sizes.get(element.id);
                return (
                  <g
                    key={element.id}
                    transform={`translate(${element.x} ${element.y}) rotate(${element.rotation})`}
                    opacity={element.opacity}
                    className="cursor-move"
                    onPointerDown={(event) => {
                      onSelect(element.id);
                      start(event, { mode: 'move', start: toScene(event), element });
                    }}
                  >
                    {/* O desenho vem do motor (contornos e formas gerados aqui, sem nada que
                        ela digitou como texto). */}
                    <g dangerouslySetInnerHTML={{ __html: bodies.get(element.id) ?? '' }} />
                    {size ? (
                      // Área de toque do tamanho da caixa: dá pra pegar entre as letras.
                      <rect
                        x={-size.width / 2}
                        y={-size.height / 2}
                        width={size.width}
                        height={size.height}
                        fill="transparent"
                      />
                    ) : null}
                  </g>
                );
              })
            : null}

          {guides.vertical ? (
            <line
              x1={500}
              y1={0}
              x2={500}
              y2={SCENE_SIZE}
              className="stroke-[#ff2d87]"
              strokeWidth={2 / unit}
            />
          ) : null}
          {guides.horizontal ? (
            <line
              x1={0}
              y1={500}
              x2={SCENE_SIZE}
              y2={500}
              className="stroke-[#ff2d87]"
              strokeWidth={2 / unit}
            />
          ) : null}

          {showCircle ? (
            // O que fica fora do círculo some no perfil da Shopee: escurecido e sem pegar cliques.
            <g aria-hidden="true" pointerEvents="none">
              <path
                d={`M0 0H${SCENE_SIZE}V${SCENE_SIZE}H0Z M${SCENE_SIZE / 2} 0a${SCENE_SIZE / 2} ${SCENE_SIZE / 2} 0 1 0 0.01 0Z`}
                fillRule="evenodd"
                fill="rgb(0 0 0 / 0.45)"
              />
              <circle
                cx={SCENE_SIZE / 2}
                cy={SCENE_SIZE / 2}
                r={SCENE_SIZE / 2 - 1 / unit}
                fill="none"
                stroke="white"
                strokeDasharray={`${8 / unit} ${6 / unit}`}
                strokeWidth={2 / unit}
              />
            </g>
          ) : null}

          {selected && selectedSize ? (
            <g
              transform={`translate(${selected.x} ${selected.y}) rotate(${selected.rotation})`}
              aria-hidden="true"
            >
              <rect
                x={-selectedSize.width / 2}
                y={-selectedSize.height / 2}
                width={selectedSize.width}
                height={selectedSize.height}
                fill="none"
                className="stroke-primary"
                strokeWidth={2 / unit}
                pointerEvents="none"
              />
              <line
                x1={0}
                y1={-selectedSize.height / 2}
                x2={0}
                y2={-selectedSize.height / 2 - 34 / unit}
                className="stroke-primary"
                strokeWidth={2 / unit}
              />
              <g
                className="cursor-grab"
                onPointerDown={(event) => start(event, { mode: 'rotate', element: selected })}
              >
                <circle
                  cx={0}
                  cy={-selectedSize.height / 2 - 34 / unit}
                  r={handleTouch}
                  fill="transparent"
                />
                <circle
                  cx={0}
                  cy={-selectedSize.height / 2 - 34 / unit}
                  r={handle}
                  className="fill-card stroke-primary"
                  strokeWidth={2 / unit}
                />
              </g>
              {[
                [-1, -1],
                [1, -1],
                [1, 1],
                [-1, 1],
              ].map(([sx, sy]) => (
                <g
                  key={`${sx}${sy}`}
                  className={sx === sy ? 'cursor-nwse-resize' : 'cursor-nesw-resize'}
                  onPointerDown={(event) =>
                    start(event, { mode: 'scale', start: toScene(event), element: selected })
                  }
                >
                  <circle
                    cx={(sx! * selectedSize.width) / 2}
                    cy={(sy! * selectedSize.height) / 2}
                    r={handleTouch}
                    fill="transparent"
                  />
                  <circle
                    cx={(sx! * selectedSize.width) / 2}
                    cy={(sy! * selectedSize.height) / 2}
                    r={handle}
                    className="fill-card stroke-primary"
                    strokeWidth={2 / unit}
                  />
                </g>
              ))}
            </g>
          ) : null}
        </svg>
      </div>
      {!fonts ? (
        <output className="mt-3 block text-center text-sm text-muted-foreground">
          {fontsFailed
            ? 'Não conseguimos carregar as letras do logo. Confira a internet e recarregue a página.'
            : 'Carregando o editor…'}
        </output>
      ) : null}
      {selected ? <span className="sr-only">Selecionado: {elementLabel(selected)}</span> : null}
    </div>
  );
}
