'use client';

import { CircleHelpIcon, Redo2Icon, RotateCcwIcon, SparklesIcon, Undo2Icon } from 'lucide-react';
import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import { nodMascot } from '@/components/brand/mascot';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  addElement,
  addVariation,
  backdropColor,
  duplicateElement,
  elementLabel,
  findElement,
  mainColor,
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
import { checkLogo, type LogoIssue } from '../../logo/checks';
import type { LogoConfig } from '../../logo/config';
import { loadLogoFontsInBrowser } from '../../logo/fonts.client';
import { configToScene } from '../../logo/from-config';
import type { SceneIconId } from '../../logo/icons';
import { MAX_VARIATIONS, SCENE_SIZE, type LogoScene, type SceneElement } from '../../logo/scene';
import type { LogoFonts } from '../../logo/scene-render';
import { saveLogoScene } from '../../server/actions';
import { EditorCanvas } from './editor-canvas';
import { AddDrawings, AddTexts } from './add-panels';
import { CheckDialog } from './check-dialog';
import { HelpDialog } from './help-dialog';
import { IdeasPanel } from './ideas-panel';
import { LayersPanel } from './layers-panel';
import { PropertiesPanel } from './properties-panel';
import { PreviewDialog } from './preview-dialog';
import { SaveBar } from './save-bar';
import { MainIconPicker, StylePanel, TemplatesPanel } from './style-tab';
import { TOOLS, ToolRail, type ToolId } from './tool-rail';
import { sceneDataUrl, VariationsStrip } from './variations-strip';

/** O que a tela mostra do salvamento automático. */
export type SaveState = 'saved' | 'saving' | 'error';

/** O centro dentro da tela. */
const clampToCanvas = (value: number) => Math.min(SCENE_SIZE, Math.max(0, value));

/** Quanto esperar depois da última mudança pra salvar (não a cada pixel do arraste). */
const AUTOSAVE_DELAY = 900;

/** O painel do menu: o foco volta pra ele quando o conteúdo troca. */
const PANEL_ID = 'painel-do-logo';

type LogoEditorProps = {
  /** A cena salva, ou o modelo escolhido virado cena (configToScene). */
  initialScene: LogoScene;
  /** As outras versões guardadas. */
  initialVariations: LogoScene[];
  /** O nome da loja, pros textos que seguem o nome. */
  name: string;
  /** Veio da revisão: "Salvar e continuar" volta pra ela. */
  editing: boolean;
  /** Desenhos que combinam com as categorias dela ("Recomendados"). */
  recommended: SceneIconId[];
  /** Os modelos do estúdio, pra recomeçar de um. */
  templates: LogoConfig[];
  /** Logos inteiros prontos, montados com as respostas dela ("Ideias prontas"). */
  ideas: LogoConfig[];
};

/**
 * O editor do logo, estilo Canva e pensado pra quem tem pouca prática: à esquerda, o menu (Estilo,
 * Modelos, Desenhos, Textos, Partes, Versões, cada um com o nome escrito) e o painel do item
 * escolhido; à direita, o logo grande com Desfazer, Refazer e "Ver como fica" em cima e o botão
 * de seguir embaixo. Abre no Estilo. Tocar numa parte do logo mostra só ela no painel, com
 * "Pronto" pra voltar. Tudo também pelo teclado: as partes escolhem, as setas movem, Delete apaga,
 * Ctrl+Z desfaz. Cada mudança é salva sozinha.
 */
export function LogoEditor({
  initialScene,
  initialVariations,
  name,
  editing,
  recommended,
  templates,
  ideas,
}: LogoEditorProps) {
  const [scene, setScene] = useState(initialScene);
  const [variations, setVariations] = useState(initialVariations);
  const [previewing, setPreviewing] = useState(false);
  const [helping, setHelping] = useState(false);
  const [tool, setTool] = useState<ToolId>('estilo');
  const [history, setHistory] = useState<History>({ past: [], future: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fonts, setFonts] = useState<LogoFonts | null>(null);
  const [fontsFailed, setFontsFailed] = useState(false);
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

  // A conferência antes de seguir: só calcula com a janela aberta (e de novo a cada conserto).
  const [checking, setChecking] = useState(false);
  const formId = useId();
  const measure = useCallback(
    (element: SceneElement) =>
      fonts ? elementSize(element, name, fonts) : { width: 0, height: 0 },
    [fonts, name],
  );
  const issues = useMemo(
    () => (checking && fonts ? checkLogo(scene, measure) : []),
    [checking, fonts, scene, measure],
  );

  /** "Gostei, continuar": com algo pra arrumar, abre a conferência em vez de seguir. */
  function beforeContinue(): boolean {
    if (!fonts || !checkLogo(scene, measure).length) return true;
    setChecking(true);
    return false;
  }

  function fixIssue(issue: LogoIssue) {
    if (!issue.fix) return;
    commit(issue.fix.apply(scene));
    setAnnouncement(`${issue.fix.label}: feito. Desfazer volta.`);
  }

  function fixAllIssues() {
    // Um depois do outro, em cima do resultado do anterior: uma mudança só no histórico.
    const fixed = issues.reduce((current, issue) => issue.fix?.apply(current) ?? current, scene);
    commit(fixed);
    setAnnouncement('Tudo arrumado. Desfazer volta.');
  }

  /** "Recomeçar do zero": o logo volta a ser o primeiro modelo (Desfazer traz o de antes). */
  function restart() {
    const first = templates[0];
    if (!first || !fonts) return;
    commit(configToScene(first, name, fonts));
    setSelectedId(null);
    setAnnouncement('Logo recomeçado do primeiro modelo. Desfazer traz o de antes.');
    nodMascot();
  }

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
    const element = findElement(scene, id);
    setAnnouncement(element ? `${elementLabel(element)} selecionado` : 'Nada selecionado');
  }

  function removeSelected() {
    if (!selected) return;
    commit(removeElement(scene, selected.id));
    setSelectedId(null);
    setAnnouncement(`${elementLabel(selected)} apagado. Desfazer traz de volta.`);
    // O painel da parte sumiu: o foco vai pro painel, não pro começo da página.
    focusPanel();
  }

  function add(element: NewElement, label: string) {
    const result = addElement(scene, element);
    if (!result) {
      setAnnouncement('O logo já tem elementos demais. Apague algum pra pôr outro.');
      return;
    }
    commit(result.scene);
    setSelectedId(result.id);
    setAnnouncement(`${label} adicionado no meio do logo`);
    nodMascot();
  }

  /** Uma escolha da aba Estilo (cor, fundo, letra, desenho, formato): muda o logo todo. */
  function applyStyle(next: LogoScene, message: string) {
    commit(next);
    setAnnouncement(`${message}. Desfazer volta.`);
    nodMascot();
  }

  /** Troca pra uma versão guardada; o histórico recomeça (desfazer não mistura as versões). */
  function chooseVariation(index: number) {
    const result = switchVariation(scene, variations, index);
    if (!result) return;
    setScene(result.scene);
    setVariations(result.variations);
    setHistory({ past: [], future: [] });
    setSelectedId(null);
    setAnnouncement(`Versão ${index + 1} no quadro. A de antes ficou guardada no lugar dela.`);
  }

  function newVariation() {
    const next = addVariation(scene, variations, MAX_VARIATIONS);
    if (!next) return;
    setVariations(next);
    setAnnouncement('Cópia guardada. Pode mexer à vontade: a de antes está nas versões guardadas.');
  }

  function removeVariation(index: number) {
    setVariations(variations.filter((_, i) => i !== index));
    setAnnouncement(`Versão ${index + 1} apagada`);
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

  /** Um item do menu: solta a parte escolhida (se tinha) e mostra o painel dele. */
  function chooseTool(next: ToolId) {
    setTool(next);
    setSelectedId(null);
  }

  /** Solta a parte escolhida e volta pro painel do menu. */
  function done() {
    select(null);
    focusPanel();
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

  return (
    <div
      data-logo-editor
      className="grid grid-cols-1 gap-4 lg:min-h-[max(540px,calc(100dvh-14rem))] lg:grid-cols-[minmax(0,500px)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_auto] lg:gap-x-8 xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)]"
    >
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {/* No celular, o logo (com os botões de cima) fica preso no topo enquanto ela rola as
          escolhas embaixo. */}
      <section
        aria-label="Quadro do logo"
        className="sticky -top-px z-20 -mx-4 flex min-w-0 flex-col gap-3 bg-background/95 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:static lg:col-start-2 lg:row-start-1 lg:m-0 lg:min-h-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
      >
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <ToolButton onClick={undoLast} disabled={!history.past.length} shortcut="Control+Z">
            <Undo2Icon aria-hidden="true" />
            Desfazer
          </ToolButton>
          <ToolButton
            onClick={redoLast}
            disabled={!history.future.length}
            shortcut="Control+Shift+Z"
          >
            <Redo2Icon aria-hidden="true" />
            {/* No celular, só a setinha (o nome continua pro leitor de tela): tudo cabe numa
                linha. Desfazer, o mais usado, fica escrito. */}
            <span className="max-sm:sr-only">Refazer</span>
          </ToolButton>
          <ToolButton onClick={() => setPreviewing(true)} disabled={!fonts}>
            {/* O logo de verdade, pequeno e redondo como na Shopee, mudando junto com o quadro. */}
            <LiveAvatar scene={scene} name={name} fonts={fonts} />
            Ver como fica
          </ToolButton>
          {/* A ajuda é mais do mouse e do teclado: no celular, os três de cima cabem numa linha. */}
          <ToolButton onClick={() => setHelping(true)} className="max-sm:hidden">
            <CircleHelpIcon aria-hidden="true" />
            Ajuda
          </ToolButton>
        </div>
        <EditorCanvas
          scene={scene}
          name={name}
          fonts={fonts}
          fontsFailed={fontsFailed}
          sizes={sizes}
          selectedId={selectedId}
          onSelect={select}
          onBeginGesture={beginGesture}
          onLive={live}
          onEndGesture={endGesture}
        />
      </section>

      {/* O menu e o painel dele, um cartão só (como no Canva). No computador, à esquerda, na
          altura da janela (o painel rola por dentro). A altura do editor é mínima, não fixa: com
          zoom ou alto contraste, o lado do logo cresce e empurra, em vez de passar por cima. */}
      <div className="flex min-w-0 flex-col overflow-hidden rounded-card bg-card shadow-card lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:grid lg:h-[max(540px,calc(100dvh-14rem))] lg:grid-cols-[104px_minmax(0,1fr)] lg:self-start forced-colors:border forced-colors:border-[CanvasText]">
        <div className="border-b border-border p-2 lg:overflow-y-auto lg:border-r lg:border-b-0">
          <ToolRail value={tool} onChange={chooseTool} />
        </div>
        <div
          id={PANEL_ID}
          tabIndex={-1}
          className="flex min-h-0 flex-col gap-6 p-5 outline-none lg:overflow-y-auto lg:p-7"
        >
          {selected ? (
            <PropertiesPanel
              scene={scene}
              selected={selected}
              size={sizes.get(selected.id)}
              backdrop={backdropColor(scene, selected.id, sizes)}
              onChange={updateSelected}
              onCommitScene={commit}
              onBeginGesture={beginGesture}
              onEndGesture={endGesture}
              onRemove={removeSelected}
              onDuplicate={duplicateSelected}
              onDone={done}
            />
          ) : (
            <>
              <h2 className="text-title font-semibold">
                {TOOLS.find((item) => item.id === tool)?.label}
              </h2>
              {tool === 'estilo' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      chooseTool('modelos');
                      focusPanel();
                    }}
                    className="-mt-2 flex min-h-14 items-center gap-3 rounded-2xl bg-primary-soft px-4 text-left text-body font-semibold text-link transition-[background-color,transform] duration-100 outline-none hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.98] motion-reduce:active:scale-100 forced-colors:border-2 forced-colors:border-[ButtonText]"
                  >
                    <SparklesIcon aria-hidden="true" className="size-5 shrink-0" />
                    Me mostra ideias prontas
                  </button>
                  <StylePanel scene={scene} name={name} fonts={fonts} onStyle={applyStyle} />
                </>
              ) : null}
              {tool === 'modelos' ? (
                <>
                  <section aria-labelledby="ideias-titulo" className="flex flex-col gap-4">
                    <h3 id="ideias-titulo" className="-mt-2 text-body font-semibold">
                      Ideias prontas pra você
                    </h3>
                    <IdeasPanel ideas={ideas} name={name} fonts={fonts} onPick={applyStyle} />
                  </section>
                  <section aria-labelledby="formatos-titulo" className="flex flex-col gap-4">
                    <h3 id="formatos-titulo" className="text-body font-semibold">
                      Só mudar o formato
                    </h3>
                    <TemplatesPanel
                      scene={scene}
                      name={name}
                      fonts={fonts}
                      templates={templates}
                      onStyle={applyStyle}
                    />
                  </section>
                  <button
                    type="button"
                    onClick={restart}
                    disabled={!fonts}
                    className="inline-flex min-h-12 items-center justify-center gap-2 self-center rounded-full px-5 text-body font-semibold text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:opacity-50"
                  >
                    <RotateCcwIcon aria-hidden="true" className="size-5" />
                    Recomeçar do zero
                  </button>
                </>
              ) : null}
              {tool === 'desenhos' ? (
                <>
                  <MainIconPicker scene={scene} recommended={recommended} onStyle={applyStyle} />
                  <h3 className="-mb-3 text-body font-semibold">Pôr mais um desenho</h3>
                  <AddDrawings color={mainColor(scene)} onAdd={add} />
                </>
              ) : null}
              {tool === 'textos' ? (
                <AddTexts scene={scene} color={mainColor(scene)} onAdd={add} />
              ) : null}
              {tool === 'partes' ? <LayersPanel scene={scene} onSelect={select} /> : null}
              {tool === 'ia' ? (
                // Lugar guardado pra criar o logo com IA (ainda não existe): diz isso com
                // clareza e leva pro que já ajuda hoje, as ideias prontas.
                <>
                  <p className="-mt-3 inline-flex w-fit items-center rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-link forced-colors:border forced-colors:border-[CanvasText]">
                    Em breve
                  </p>
                  <p className="text-body text-pretty text-muted-foreground">
                    Aqui você vai poder contar como é a sua loja e receber logos feitos pela
                    inteligência artificial.
                  </p>
                  <Button
                    type="button"
                    variant="soft"
                    onClick={() => {
                      chooseTool('modelos');
                      focusPanel();
                    }}
                  >
                    <SparklesIcon aria-hidden="true" />
                    Enquanto isso, ver ideias prontas
                  </Button>
                </>
              ) : null}
              {tool === 'versoes' ? (
                <VariationsStrip
                  scene={scene}
                  variations={variations}
                  name={name}
                  fonts={fonts}
                  onChoose={chooseVariation}
                  onAdd={newVariation}
                  onRemove={removeVariation}
                />
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* No celular, preso embaixo da tela: o botão de seguir está sempre à mão. */}
      <div className="sticky bottom-0 z-20 -mx-4 bg-background/95 px-4 pt-2 pb-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:static lg:col-start-2 lg:row-start-2 lg:mx-auto lg:w-full lg:max-w-[560px] lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <SaveBar
          scene={scene}
          variations={variations}
          editing={editing}
          saveState={saveState}
          formId={formId}
          onContinue={beforeContinue}
        />
      </div>

      <HelpDialog open={helping} onClose={() => setHelping(false)} />
      <CheckDialog
        open={checking}
        issues={issues}
        formId={formId}
        onFix={fixIssue}
        onFixAll={fixAllIssues}
        onClose={() => setChecking(false)}
      />
      <PreviewDialog
        open={previewing}
        src={previewing && fonts ? sceneDataUrl(scene, name, fonts) : null}
        storeName={name}
        onClose={() => setPreviewing(false)}
      />
    </div>
  );
}

/**
 * O logo pequeno e redondo, como a Shopee mostra na lista de lojas. Atualiza junto com o quadro,
 * sem atrasar o arraste (o desenho fica pra quando a tela estiver livre).
 */
function LiveAvatar({
  scene,
  name,
  fonts,
}: {
  scene: LogoScene;
  name: string;
  fonts: LogoFonts | null;
}) {
  const deferred = useDeferredValue(scene);
  const src = useMemo(
    () => (fonts ? sceneDataUrl(deferred, name, fonts) : null),
    [deferred, name, fonts],
  );
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={28}
      height={28}
      className="size-7 shrink-0 rounded-full ring-1 ring-border"
    />
  ) : (
    <span aria-hidden="true" className="size-7 shrink-0 rounded-full bg-muted" />
  );
}

/** Põe o foco no painel (depois que o conteúdo dele trocou), pro leitor de tela e o teclado. */
function focusPanel() {
  requestAnimationFrame(() => document.getElementById(PANEL_ID)?.focus({ preventScroll: true }));
}

/** Um botão em cima do logo, com o nome escrito (não só o ícone). */
function ToolButton({
  onClick,
  disabled,
  shortcut,
  className,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  /** O atalho do teclado, pro leitor de tela. */
  shortcut?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-keyshortcuts={shortcut}
      className={cn(
        'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full bg-card px-3 text-body font-semibold text-foreground shadow-card transition-[background-color,transform] duration-100 outline-none hover:bg-primary-soft hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.97] disabled:opacity-50 disabled:shadow-none disabled:hover:bg-card disabled:hover:text-foreground motion-reduce:active:scale-100 forced-colors:border forced-colors:border-[ButtonText] [&_svg]:size-5',
        className,
      )}
    >
      {children}
    </button>
  );
}
