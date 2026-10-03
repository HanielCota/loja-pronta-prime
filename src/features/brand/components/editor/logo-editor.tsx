'use client';

import {
  CircleDashedIcon,
  CircleHelpIcon,
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
  addElement,
  addVariation,
  backdropColor,
  duplicateElement,
  elementLabel,
  findElement,
  NUDGE,
  NUDGE_LARGE,
  record,
  redo,
  removeElement,
  replaceElement,
  switchVariation,
  undo,
  type History,
  type NewElement,
  elementSize,
  type Size,
} from '../../logo/editor';
import type { LogoConfig } from '../../logo/config';
import { loadLogoFontsInBrowser } from '../../logo/fonts.client';
import { configToScene } from '../../logo/from-config';
import type { SceneIconId } from '../../logo/icons';
import { MAX_VARIATIONS, SCENE_SIZE, type LogoScene, type SceneElement } from '../../logo/scene';
import type { LogoFonts } from '../../logo/scene-render';
import { saveLogoScene } from '../../server/actions';
import { EditorCanvas } from './editor-canvas';
import { LAYERS_TITLE_ID } from './layers-panel';
import { LEFT_PANEL_ID, LeftPanel } from './left-panel';
import { PropertiesPanel } from './properties-panel';
import { HelpDialog } from './help-dialog';
import { PreviewDialog } from './preview-dialog';
import { SaveBar } from './save-bar';
import { sceneDataUrl, VariationsStrip } from './variations-strip';

/** O que a tela mostra do salvamento automático. */
export type SaveState = 'saved' | 'saving' | 'error';

/** O centro dentro da tela. */
const clampToCanvas = (value: number) => Math.min(SCENE_SIZE, Math.max(0, value));

/** Quanto esperar depois da última mudança pra salvar (não a cada pixel do arraste). */
const AUTOSAVE_DELAY = 900;

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

/** No celular, o que aparece embaixo do quadro. */
const MOBILE_TABS = [
  { id: 'adicionar', label: 'Adicionar' },
  { id: 'editar', label: 'Editar' },
] as const;
type MobileTab = (typeof MOBILE_TABS)[number]['id'];

type LogoEditorProps = {
  /** A cena salva, ou a do estúdio guiado convertida (configToScene). */
  initialScene: LogoScene;
  /** As outras versões guardadas. */
  initialVariations: LogoScene[];
  /** O nome da loja, pros textos que seguem o nome. */
  name: string;
  /** Veio da revisão: "Salvar e continuar" volta pra ela. */
  editing: boolean;
  /** O estúdio guiado ("Modo fácil"). */
  easyHref: string;
  /** Desenhos que combinam com as categorias dela ("Recomendados"). */
  recommended: SceneIconId[];
  /** Os modelos do estúdio, pra recomeçar de um. */
  templates: LogoConfig[];
};

/**
 * O editor livre do logo, no computador e no celular: camadas à esquerda, o quadro no meio (selecionar, arrastar, mudar o
 * tamanho e girar com as alças) e o elemento selecionado à direita. Tudo também pelo teclado:
 * as camadas escolhem o elemento, as setas movem, Delete apaga, Ctrl+Z desfaz. Cada mudança é
 * salva sozinha; "Salvar e continuar" segue pro próximo passo.
 */
export function LogoEditor({
  initialScene,
  initialVariations,
  name,
  editing,
  easyHref,
  recommended,
  templates,
}: LogoEditorProps) {
  const [scene, setScene] = useState(initialScene);
  const [variations, setVariations] = useState(initialVariations);
  const [previewing, setPreviewing] = useState(false);
  const [helping, setHelping] = useState(false);
  const [showCircle, setShowCircle] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('adicionar');
  const [history, setHistory] = useState<History>({ past: [], future: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fonts, setFonts] = useState<LogoFonts | null>(null);
  const [fontsFailed, setFontsFailed] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(ZOOMS.indexOf(1));
  const [announcement, setAnnouncement] = useState('');
  // O que já está salvo no servidor: diferente da cena na tela, falta salvar.
  const [savedScene, setSavedScene] = useState(initialScene);
  const [savedVariations, setSavedVariations] = useState(initialVariations);
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
    if ((scene === savedScene && variations === savedVariations) || gesturing) return;
    const timer = setTimeout(() => {
      saveLogoScene(JSON.stringify(scene), JSON.stringify(variations))
        .then((result) => {
          setSaveFailed(Boolean(result?.error));
          if (result?.error) return;
          setSavedScene(scene);
          setSavedVariations(variations);
        })
        .catch(() => setSaveFailed(true));
    }, AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  }, [scene, variations, savedScene, savedVariations, gesturing]);
  const saved = scene === savedScene && variations === savedVariations;
  const saveState: SaveState = saveFailed ? 'error' : saved ? 'saved' : 'saving';

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

  /**
   * Começo de uma mudança contínua. `holdSave`: segura o salvamento até o fim (arrastar, deslizar);
   * digitar um texto não segura, pra nada se perder se ela sair da página no meio.
   */
  const beginGesture = useCallback(
    (holdSave = true) => {
      gestureStart.current = scene;
      setGesturing(holdSave);
    },
    [scene],
  );

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
    // No celular, escolher um elemento abre o painel dele.
    if (id) setMobileTab('editar');
    const element = findElement(scene, id);
    setAnnouncement(element ? `${elementLabel(element)} selecionado` : 'Nada selecionado');
  }

  function removeSelected() {
    if (!selected) return;
    commit(removeElement(scene, selected.id));
    setSelectedId(null);
    setMobileTab('adicionar');
    setAnnouncement(`${elementLabel(selected)} apagado. Ctrl+Z desfaz.`);
    // O botão da camada sumiu: o foco vai pro título das camadas, não pro começo da página.
    (document.getElementById(LAYERS_TITLE_ID) ?? document.getElementById(LEFT_PANEL_ID))?.focus();
  }

  function add(element: NewElement, label: string) {
    const result = addElement(scene, element);
    if (!result) {
      setAnnouncement('O logo já tem elementos demais. Apague algum pra pôr outro.');
      return;
    }
    commit(result.scene);
    setSelectedId(result.id);
    setMobileTab('editar');
    setAnnouncement(`${label} adicionado no meio do logo`);
    nodMascot();
  }

  function applyTemplate(template: LogoConfig) {
    if (!fonts) return;
    commit(configToScene(template, name, fonts));
    setSelectedId(null);
    setAnnouncement('Modelo aplicado. Ctrl+Z desfaz.');
  }

  /** Troca pra uma versão guardada; o histórico recomeça (desfazer não mistura as versões). */
  function chooseVariation(index: number) {
    const result = switchVariation(scene, variations, index);
    if (!result) return;
    setScene(result.scene);
    setVariations(result.variations);
    setHistory({ past: [], future: [] });
    setSelectedId(null);
    setAnnouncement(`Variação ${index + 1} no quadro. A anterior ficou guardada no lugar dela.`);
  }

  function newVariation() {
    const next = addVariation(scene, variations, MAX_VARIATIONS);
    if (!next) return;
    setVariations(next);
    setAnnouncement('Cópia guardada. Pode mexer à vontade: a de antes está nas variações.');
  }

  function removeVariation(index: number) {
    setVariations(variations.filter((_, i) => i !== index));
    setAnnouncement(`Variação ${index + 1} apagada`);
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
    if (target.closest?.('[role="menu"], [role="listbox"], [role="dialog"], dialog')) return;
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
    <div data-logo-editor className="flex flex-col gap-4">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {/* Computador: três colunas (adicionar, quadro, elemento). Celular: o quadro preso no topo
          e, embaixo, "Adicionar" ou "Editar" (escolher um elemento abre o "Editar"). */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[272px_minmax(0,1fr)_300px] lg:gap-5 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        <section
          aria-label="Quadro do logo"
          className="sticky -top-px z-20 -mx-4 flex min-w-0 flex-col gap-2 bg-background/95 px-4 pt-2 pb-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:static lg:col-start-2 lg:row-start-1 lg:m-0 lg:gap-3 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
        >
          <div
            role="toolbar"
            aria-label="Ferramentas"
            className="flex flex-wrap items-center gap-1 rounded-2xl border border-border bg-card px-2 py-1 shadow-sm lg:py-1.5"
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
            {/* No celular, o zoom é com os dedos (do navegador): os botões ficam no computador. */}
            <span className="hidden items-center gap-1 lg:flex">
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
            </span>
            <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
            <ToolButton
              label="Mostrar o círculo da Shopee"
              onClick={() => setShowCircle((value) => !value)}
              pressed={showCircle}
            >
              <CircleDashedIcon />
            </ToolButton>
            <ToolButton label="Ajuda: como usar o editor" onClick={() => setHelping(true)}>
              <CircleHelpIcon />
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
            showCircle={showCircle}
            onSelect={select}
            onBeginGesture={beginGesture}
            onLive={live}
            onEndGesture={endGesture}
          />
        </section>

        <fieldset className="lg:hidden">
          <legend className="sr-only">Mostrar embaixo do logo</legend>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/[0.06] p-1">
            {MOBILE_TABS.map((tab) => (
              <label
                key={tab.id}
                className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg text-body font-semibold text-muted-foreground has-checked:bg-card has-checked:text-foreground has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-ring has-focus-visible:outline-solid forced-colors:has-checked:border-2 forced-colors:has-checked:border-[Highlight]"
              >
                <input
                  type="radio"
                  name="painel-celular"
                  value={tab.id}
                  checked={mobileTab === tab.id}
                  onChange={() => setMobileTab(tab.id)}
                  className="sr-only"
                />
                {tab.label}
              </label>
            ))}
          </div>
        </fieldset>

        <LeftPanel
          scene={scene}
          selectedId={selectedId}
          onSelect={select}
          onAdd={add}
          recommended={recommended}
          templates={templates}
          onApplyTemplate={applyTemplate}
          className={cn(
            'lg:sticky lg:top-4 lg:col-start-1 lg:row-span-2 lg:row-start-1',
            mobileTab !== 'adicionar' && 'max-lg:hidden',
          )}
        />

        <PropertiesPanel
          scene={scene}
          selected={selected}
          size={selected ? sizes.get(selected.id) : undefined}
          backdrop={selected ? backdropColor(scene, selected.id, sizes) : scene.background}
          onChange={updateSelected}
          onCommitScene={commit}
          onBeginGesture={beginGesture}
          onEndGesture={endGesture}
          onRemove={removeSelected}
          className={cn(
            'lg:sticky lg:top-4 lg:col-start-3 lg:row-span-2 lg:row-start-1',
            mobileTab !== 'editar' && 'max-lg:hidden',
          )}
        />

        <div className="flex flex-col gap-3 lg:col-start-2 lg:row-start-2">
          <VariationsStrip
            scene={scene}
            variations={variations}
            name={name}
            fonts={fonts}
            onChoose={chooseVariation}
            onAdd={newVariation}
            onRemove={removeVariation}
          />
          <p className="text-sm text-pretty text-muted-foreground">
            Toque num elemento pra escolher. Arraste pra mover, use as bolinhas dos cantos pra mudar
            o tamanho e a de cima pra girar (no celular, dá também com dois dedos). Pelo teclado:
            escolha nas camadas e use as setas.
          </p>
        </div>
      </div>

      <SaveBar
        scene={scene}
        variations={variations}
        editing={editing}
        easyHref={easyHref}
        saveState={saveState}
        onPreview={() => setPreviewing(true)}
      />
      <HelpDialog open={helping} onClose={() => setHelping(false)} />
      <PreviewDialog
        open={previewing}
        src={previewing && fonts ? sceneDataUrl(scene, name, fonts) : null}
        storeName={name}
        onClose={() => setPreviewing(false)}
      />
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  disabled,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Botão que liga e desliga (como o círculo da Shopee). */
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'grid size-11 place-items-center rounded-xl text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid disabled:text-muted-foreground disabled:opacity-50 aria-pressed:bg-primary-soft aria-pressed:text-link [&_svg]:size-5',
      )}
    >
      {children}
    </button>
  );
}
