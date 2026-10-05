import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { continueRender, delayRender } from 'remotion';

/**
 * Onde estão os botões da tela desenhada, pra o cursor tocar no lugar certo. Mede depois que as
 * letras carregam (a largura das opções depende delas) e segura o render até ter a medida.
 * As medidas são do layout (offsetLeft/offsetTop), então ignoram as animações de transform.
 */
export type Anchor = { x: number; y: number; width: number; height: number };

function offsetWithin(element: HTMLElement, container: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = element;
  while (node && node !== container) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

export function useAnchors() {
  const container = useRef<HTMLDivElement>(null);
  const elements = useRef(new Map<string, HTMLElement>());
  const [anchors, setAnchors] = useState<Record<string, Anchor>>({});
  const [handle] = useState(() => delayRender('Medindo os botões da tela'));

  useLayoutEffect(() => {
    let done = false;
    void document.fonts.ready.then(() => {
      if (done) return;
      const root = container.current;
      const found: Record<string, Anchor> = {};
      if (root) {
        for (const [name, element] of elements.current) {
          const { x, y } = offsetWithin(element, root);
          found[name] = { x, y, width: element.offsetWidth, height: element.offsetHeight };
        }
      }
      setAnchors(found);
      continueRender(handle);
    });
    return () => {
      done = true;
    };
  }, [handle]);

  const mark = useCallback(
    (name: string) => (element: HTMLElement | null) => {
      if (element) elements.current.set(name, element);
    },
    [],
  );

  /** O meio do elemento (ou um ponto dentro dele: 0.5, 0.5 é o centro). */
  const point = useCallback(
    (name: string, fx = 0.5, fy = 0.5) => {
      const anchor = anchors[name];
      return anchor
        ? { x: anchor.x + anchor.width * fx, y: anchor.y + anchor.height * fy }
        : { x: 0, y: 0 };
    },
    [anchors],
  );

  return { container, mark, point, ready: Object.keys(anchors).length > 0 };
}
