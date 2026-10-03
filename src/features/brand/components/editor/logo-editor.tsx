'use client';

import {
  CopyIcon,
  MaximizeIcon,
  MinusIcon,
  PlusIcon,
  Redo2Icon,
  Trash2Icon,
  Undo2Icon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { nodMascot } from '@/components/brand/mascot';
import { cn } from '@/lib/utils';
import {
  duplicateElement,
  elementLabel,
  findElement,
  NUDGE,
  NUDGE_LARGE,
  record,
  redo,
  removeElement,
  replaceElement,
  undo,
  type History,
  elementSize,
  type Size,
} from '../../logo/editor';
import { loadLogoFontsInBrowser } from '../../logo/fonts.client';
import { SCENE_SIZE, type LogoScene, type SceneElement } from '../../logo/scene';
import type { LogoFonts } from '../../logo/scene-render';
import { saveLogoScene } from '../../server/actions';
import { EditorCanvas } from './editor-canvas';
import { LAYERS_TITLE_ID, LayersPanel } from './layers-panel';
import { PropertiesPanel } from './properties-panel';
import { SaveBar } from './save-bar';

/** O que a tela mostra do salvamento automático. */
export type SaveState = 'saved' | 'saving' | 'error';

/** O centro dentro da tela. */
const clampToCanvas = (value: number) => Math.min(SCENE_SIZE, Math.max(0, value));

/** Quanto esperar depois da última mudança pra salvar (não a cada pixel do arraste). */
const AUTOSAVE_DELAY = 900;

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

type LogoEditorProps = {
  /** A cena salva, ou a do estúdio guiado convertida (configToScene). */
  initialScene: LogoScene;
  /** O nome da loja, pros textos que seguem o nome. */
  name: string;
  /** Veio da revisão: "Salvar e continuar" volta pra ela. */
  editing: boolean;
  /** O estúdio guiado ("Modo fácil"). */
  easyHref: string;
};

/**
 * O editor livre do logo: camadas à esquerda, o quadro no meio (selecionar, arrastar, mudar o
 * tamanho e girar com as alças) e o elemento selecionado à direita. Tudo também pelo teclado:
 * as camadas escolhem o elemento, as setas movem, Delete apaga, Ctrl+Z desfaz. Cada mudança é
 * salva sozinha; "Salvar e continuar" segue pro próximo passo.
 */
export function LogoEditor({ initialScene, name, editing, easyHref }: LogoEditorProps) {
  const [scene, setScene] = useState(initialScene);
  const [history, setHistory] = useState<History>({ past: [], future: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fonts, setFonts] = useState<LogoFonts | null>(null);
  const [fontsFailed, setFontsFailed] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(ZOOMS.indexOf(1));
  const [announcement, setAnnouncement] = useState('');
  // O que já está salvo no servidor: diferente da cena na tela, falta salvar.
  const [savedScene, setSavedScene] = useState(initialScene);
  const [saveFailed, setSaveFailed] = useState(false);
  // Um gesto (arrastar, deslizar) vira uma entrada só no histórico: a cena de antes dele.
  const gestureStart = useRef<LogoScene | null>(null);
  const [gesturing, setGesturing] = useState(false);

  useEffect(() => {
    let active = true;
    loadLogoFontsInBrowser()
      .then((loaded) => active && setFonts(loaded))
      .catch(() => active && setFontsFailed(true));
    return () => {
      active = false;
    };
  }, []);

  // Salva sozinho um pouco depois da última mudança (nunca no meio de um arraste).
  useEffect(() => {
    if (scene === savedScene || gesturing) return;
    const timer = setTimeout(() => {
      saveLogoScene(JSON.stringify(scene))
        .then((result) => {
          setSaveFailed(Boolean(result?.error));
          if (!result?.error) setSavedScene(scene);
        })
        .catch(() => setSaveFailed(true));
    }, AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  }, [scene, savedScene, gesturing]);
  const saveState: SaveState = saveFailed ? 'error' : scene === savedScene ? 'saved' : 'saving';

  const sizes = useMemo(() => {
    const map = new Map<string, Size>();
    if (!fonts) return map;
    for (const element of scene.elements) map.set(element.id, elementSize(element, name, fonts));
    return map;
  }, [scene, fonts, name]);

  const selected = findElement(scene, selectedId);

  /** Uma mudança de uma vez (um clique, uma tecla): entra no histórico. */
  const commit = useCallback(
    (next: LogoScene) => {
      setHistory((current) => record(current, scene));
      setScene(next);
    },
    [scene],
  );

  const beginGesture = useCallback(() => {
    gestureStart.current = scene;
    setGesturing(true);
  }, [scene]);

  /** Durante o gesto: muda na hora, sem entrar no histórico. */
  const live = useCallback((next: LogoScene) => setScene(next), []);

  const endGesture = useCallback(() => {
    const start = gestureStart.current;
    gestureStart.current = null;
    setGesturing(false);
    if (start && start !== scene) {
      setHistory((current) => record(current, start));
      nodMascot();
    }
  }, [scene]);

  const updateSelected = useCallback(
    (patch: Partial<SceneElement>, mode: 'commit' | 'live' = 'commit') => {
      if (!selected) return;
      const next = replaceElement(scene, { ...selected, ...patch } as SceneElement);
      if (mode === 'live') live(next);
      else commit(next);
    },
    [selected, scene, commit, live],
  );

  function select(id: string | null) {
    setSelectedId(id);
    const element = findElement(scene, id);
    setAnnouncement(element ? `${elementLabel(element)} selecionado` : 'Nada selecionado');
  }

  function removeSelected() {
    if (!selected) return;
    commit(removeElement(scene, selected.id));
    setSelectedId(null);
    setAnnouncement(`${elementLabel(selected)} apagado. Ctrl+Z desfaz.`);
    // O botão da camada sumiu: o foco vai pro título das camadas, não pro começo da página.
    document.getElementById(LAYERS_TITLE_ID)?.focus();
  }

  function duplicateSelected() {
    if (!selected) return;
    const result = duplicateElement(scene, selected.id, name);
    if (!result) {
      setAnnouncement('O logo já tem elementos demais.');
      return;
    }
    commit(result.scene);
    setSelectedId(result.id);
    setAnnouncement(`${elementLabel(selected)} duplicado`);
  }

  function undoLast() {
    const result = undo(history, scene);
    if (!result) return;
    setHistory(result.history);
    setScene(result.scene);
    setAnnouncement('Desfeito');
  }

  function redoLast() {
    const result = redo(history, scene);
    if (!result) return;
    setHistory(result.history);
    setScene(result.scene);
    setAnnouncement('Refeito');
  }

  function nudge(dx: number, dy: number) {
    if (!selected) return;
    // Pelo teclado, sem encaixe: ela quer o passo exato que pediu.
    commit(
      replaceElement(scene, {
        ...selected,
        x: clampToCanvas(selected.x + dx),
        y: clampToCanvas(selected.y + dy),
      }),
    );
  }

  function onKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    // Menus e janelas usam as setas pra navegar (o menu da conta, por exemplo).
    if (target.closest?.('[role="menu"], [role="listbox"], [role="dialog"]')) return;
    const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName);
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (mod && key === 'z') {
      event.preventDefault();
      if (event.shiftKey) redoLast();
      else undoLast();
      return;
    }
    if (mod && key === 'y') {
      event.preventDefault();
      redoLast();
      return;
    }
    if (typing || !selected) return;
    if (mod && key === 'd') {
      event.preventDefault();
      duplicateSelected();
      return;
    }
    const step = event.shiftKey ? NUDGE_LARGE : NUDGE;
    const moves: Record<string, [number, number]> = {
      arrowleft: [-step, 0],
      arrowright: [step, 0],
      arrowup: [0, -step],
      arrowdown: [0, step],
    };
    const move = moves[key];
    if (move) {
      event.preventDefault();
      nudge(...move);
    } else if (key === 'delete' || key === 'backspace') {
      event.preventDefault();
      removeSelected();
    } else if (key === 'escape') {
      select(null);
    }
  }

  // Os atalhos valem na página toda enquanto o editor está aberto (menos nos campos): depois de
  // apagar, o foco pode não estar mais dentro dele, e Ctrl+Z ainda tem que desfazer.
  const keyHandler = useRef(onKeyDown);
  useEffect(() => {
    keyHandler.current = onKeyDown;
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => keyHandler.current(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  const zoom = ZOOMS[zoomIndex] ?? 1;

  return (
    <div className="flex flex-col gap-4">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <div className="grid grid-cols-[240px_minmax(0,1fr)_300px] items-start gap-5 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <LayersPanel
          scene={scene}
          selectedId={selectedId}
          onSelect={select}
          className="sticky top-4"
        />

        <section aria-label="Quadro do logo" className="flex min-w-0 flex-col gap-3">
          <div
            role="toolbar"
            aria-label="Ferramentas"
            className="flex flex-wrap items-center gap-1 rounded-2xl border border-border bg-card px-2 py-1.5 shadow-sm"
          >
            <ToolButton
              label="Desfazer (Ctrl+Z)"
              onClick={undoLast}
              disabled={!history.past.length}
            >
              <Undo2Icon />
            </ToolButton>
            <ToolButton
              label="Refazer (Ctrl+Shift+Z)"
              onClick={redoLast}
              disabled={!history.future.length}
            >
              <Redo2Icon />
            </ToolButton>
            <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
            <ToolButton
              label="Diminuir o zoom"
              onClick={() => setZoomIndex((index) => Math.max(0, index - 1))}
              disabled={zoomIndex === 0}
            >
              <MinusIcon />
            </ToolButton>
            <output
              aria-label="Zoom"
              className="w-14 text-center text-sm font-semibold tabular-nums"
            >
              {Math.round(zoom * 100)}%
            </output>
            <ToolButton
              label="Aumentar o zoom"
              onClick={() => setZoomIndex((index) => Math.min(ZOOMS.length - 1, index + 1))}
              disabled={zoomIndex === ZOOMS.length - 1}
            >
              <PlusIcon />
            </ToolButton>
            <ToolButton
              label="Ajustar à tela"
              onClick={() => setZoomIndex(ZOOMS.indexOf(1))}
              disabled={zoom === 1}
            >
              <MaximizeIcon />
            </ToolButton>
            <span className="flex-1" />
            <ToolButton label="Duplicar (Ctrl+D)" onClick={duplicateSelected} disabled={!selected}>
              <CopyIcon />
            </ToolButton>
            <ToolButton label="Apagar (Delete)" onClick={removeSelected} disabled={!selected}>
              <Trash2Icon />
            </ToolButton>
          </div>

          <EditorCanvas
            scene={scene}
            name={name}
            fonts={fonts}
            fontsFailed={fontsFailed}
            sizes={sizes}
            selectedId={selectedId}
            zoom={zoom}
            onSelect={select}
            onBeginGesture={beginGesture}
            onLive={live}
            onEndGesture={endGesture}
          />
          <p className="text-sm text-pretty text-muted-foreground">
            Toque num elemento pra escolher. Arraste pra mover, use as bolinhas dos cantos pra mudar
            o tamanho e a de cima pra girar. Pelo teclado: escolha nas camadas e use as setas.
          </p>
        </section>

        <PropertiesPanel
          scene={scene}
          selected={selected}
          size={selected ? sizes.get(selected.id) : undefined}
          onChange={updateSelected}
          onCommitScene={commit}
          onBeginGesture={beginGesture}
          onEndGesture={endGesture}
          onRemove={removeSelected}
          className="sticky top-4"
        />
      </div>

      <SaveBar scene={scene} editing={editing} easyHref={easyHref} saveState={saveState} />
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'grid size-11 place-items-center rounded-xl text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid disabled:text-muted-foreground disabled:opacity-50 [&_svg]:size-5',
      )}
    >
      {children}
    </button>
  );
}
