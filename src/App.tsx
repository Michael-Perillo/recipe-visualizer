import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Copy,
  Download,
  FileDown,
  FileJson,
  FilePlus2,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  Sun,
  Trash2,
  Upload,
  WandSparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  type ChangeEvent,
  type RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { FlowDiagram } from "./components/diagram/FlowDiagram";
import { MatrixDiagram } from "./components/diagram/MatrixDiagram";
import { RecipeEditor } from "./components/RecipeEditor";
import { validateRecipe } from "./domain/recipe";
import { recipeDocumentSchema } from "./domain/schema";
import {
  buildExportName,
  downloadPng,
  downloadRecipeJson,
  downloadSvg,
} from "./lib/export";
import { AppStateProvider, useAppState } from "./state/AppState";

function AppLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-stone-950 text-lime-300 shadow-[0_8px_24px_rgba(0,0,0,0.18)] dark:bg-lime-300 dark:text-stone-950">
        <span className="absolute left-1.5 top-1.5 size-1.5 rounded-full bg-current" />
        <span className="absolute bottom-1.5 right-1.5 size-1.5 rounded-full bg-current" />
        <WandSparkles className="size-5" />
      </div>
      <div className="hidden sm:block">
        <p className="text-sm font-black leading-none tracking-[-0.035em]">
          Recipe Visualizer
        </p>
        <p className="mt-1 text-[9px] font-extrabold uppercase tracking-[0.19em] text-stone-600 dark:text-stone-400">
          Cook in diagrams
        </p>
      </div>
    </div>
  );
}

function SaveIndicator() {
  const { saveStatus } = useAppState();
  const label =
    saveStatus === "saved"
      ? "Saved locally"
      : saveStatus === "saving"
        ? "Saving…"
        : "Local save unavailable";
  return (
    <span
      aria-live="polite"
      className="hidden items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-stone-600 md:flex dark:bg-white/[0.06] dark:text-stone-400"
    >
      {saveStatus === "saved" ? (
        <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <span className="size-2 animate-pulse rounded-full bg-amber-500" />
      )}
      {label}
    </span>
  );
}

function LibraryControls() {
  const {
    activeRecipe,
    activeRecipeId,
    recipes,
    theme,
    editorCollapsed,
    dispatch,
  } = useAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState("");

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = recipeDocumentSchema.safeParse(
        JSON.parse(await file.text()),
      );
      if (!parsed.success) {
        setImportError("That file is not a Recipe Visualizer v1 document.");
        return;
      }
      setImportError("");
      dispatch({ type: "import-recipe", recipe: parsed.data });
    } catch {
      setImportError("The selected file is not valid JSON.");
    }
  };

  const deleteRecipe = () => {
    if (
      window.confirm(
        `Delete “${activeRecipe.title}” from this browser? Export it as JSON first if you want a backup.`,
      )
    ) {
      dispatch({ type: "delete-active" });
    }
  };

  return (
    <>
      <div className="flex min-w-0 items-center gap-1.5">
        <label className="relative min-w-0">
          <span className="sr-only">Active recipe</span>
          <BookOpen className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
          <select
            aria-label="Active recipe"
            value={activeRecipeId}
            onChange={(event) =>
              dispatch({ type: "set-active", recipeId: event.target.value })
            }
            className="h-10 max-w-48 appearance-none truncate rounded-xl border border-black/[0.08] bg-white pl-9 pr-8 text-xs font-extrabold outline-none focus:border-lime-500 focus:ring-4 focus:ring-lime-400/20 dark:border-white/10 dark:bg-white/[0.055] sm:max-w-60"
          >
            {recipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.title || "Untitled recipe"}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-stone-400" />
        </label>

        <button
          type="button"
          className="header-icon"
          aria-label="New recipe"
          title="New recipe"
          onClick={() => dispatch({ type: "new-recipe" })}
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          className="header-icon hidden sm:grid"
          aria-label="Duplicate recipe"
          title="Duplicate recipe"
          onClick={() => dispatch({ type: "duplicate-active" })}
        >
          <Copy className="size-4" />
        </button>
        <details className="relative">
          <summary
            className="header-icon list-none"
            aria-label="Recipe file menu"
            title="Recipe file menu"
          >
            <FileDown className="size-4" />
          </summary>
          <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-black/10 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-stone-900">
            <button
              type="button"
              className="menu-item"
              onClick={() => downloadRecipeJson(activeRecipe)}
            >
              <FileJson className="size-4" />
              Export recipe JSON
            </button>
            <button
              type="button"
              className="menu-item"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              Import recipe JSON
            </button>
            <button
              type="button"
              className="menu-item sm:hidden"
              onClick={() => dispatch({ type: "duplicate-active" })}
            >
              <Copy className="size-4" />
              Duplicate recipe
            </button>
            <div className="my-1 h-px bg-black/[0.07] dark:bg-white/[0.08]" />
            <button
              type="button"
              className="menu-item text-red-600 dark:text-red-400"
              onClick={deleteRecipe}
            >
              <Trash2 className="size-4" />
              Delete from browser
            </button>
          </div>
        </details>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      {importError ? (
        <div
          role="alert"
          className="fixed right-4 top-20 z-[70] flex max-w-sm items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800 shadow-xl dark:border-red-500/30 dark:bg-red-950 dark:text-red-100"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          {importError}
          <button
            type="button"
            className="ml-auto"
            aria-label="Dismiss import error"
            onClick={() => setImportError("")}
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="ml-auto flex items-center gap-1.5">
        <SaveIndicator />
        <button
          type="button"
          className="header-icon hidden lg:grid"
          aria-label={editorCollapsed ? "Open recipe editor" : "Close recipe editor"}
          title={editorCollapsed ? "Open editor" : "Close editor"}
          onClick={() => dispatch({ type: "toggle-editor" })}
        >
          {editorCollapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
        <button
          type="button"
          className="header-icon"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          onClick={() =>
            dispatch({
              type: "set-theme",
              theme: theme === "dark" ? "light" : "dark",
            })
          }
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </button>
      </div>
    </>
  );
}

function PreviewToolbar({
  zoom,
  setZoom,
  svgRef,
}: {
  zoom: number;
  setZoom: (value: number) => void;
  svgRef: RefObject<SVGSVGElement | null>;
}) {
  const {
    activeRecipe,
    view,
    theme,
    servings,
    dispatch,
  } = useAppState();
  const issues = validateRecipe(activeRecipe);
  const canExport = issues.length === 0;
  const [exporting, setExporting] = useState<"svg" | "png" | null>(null);
  const [exportError, setExportError] = useState("");

  const runExport = async (format: "svg" | "png") => {
    if (!svgRef.current || issues.length > 0) return;
    setExporting(format);
    setExportError("");
    try {
      const filename = buildExportName(
        activeRecipe,
        view,
        servings,
        theme,
        format,
      );
      if (format === "svg") {
        await downloadSvg(svgRef.current, filename);
      } else {
        await downloadPng(svgRef.current, filename);
      }
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "The export could not be created.",
      );
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="border-b border-black/[0.07] bg-white/90 px-3 py-2.5 backdrop-blur-xl dark:border-white/[0.07] dark:bg-stone-950/90 sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex rounded-xl bg-stone-100 p-1 dark:bg-white/[0.06]"
          aria-label="Visualization style"
        >
          {(["matrix", "flow"] as const).map((candidate) => (
            <button
              key={candidate}
              type="button"
              data-testid={`${candidate}-view`}
              aria-pressed={view === candidate}
              className={`min-h-9 rounded-lg px-3 text-xs font-extrabold capitalize transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-400/25 ${
                view === candidate
                  ? "bg-stone-950 text-white shadow-sm dark:bg-lime-300 dark:text-stone-950"
                  : "text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"
              }`}
              onClick={() => dispatch({ type: "set-view", view: candidate })}
            >
              {candidate}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-black/[0.07] bg-white p-1 dark:border-white/[0.08] dark:bg-white/[0.03]">
          <span className="hidden px-2 text-[9px] font-black uppercase tracking-[0.14em] text-stone-600 dark:text-stone-400 sm:inline">
            Serves
          </span>
          {[2, 4, 6].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`Show ${value} servings`}
              aria-pressed={servings === value}
              className={`size-8 rounded-lg text-xs font-black transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-400/25 ${
                servings === value
                  ? "bg-lime-300 text-stone-950"
                  : "text-stone-600 hover:bg-stone-100 dark:hover:bg-white/[0.07]"
              }`}
              onClick={() =>
                dispatch({
                  type: "set-servings",
                  recipeId: activeRecipe.id,
                  servings: value,
                })
              }
            >
              {value}
            </button>
          ))}
          <input
            type="number"
            min="1"
            step="1"
            aria-label="Custom servings"
            title="Custom servings"
            className="h-8 w-12 rounded-lg border border-black/10 bg-transparent px-1 text-center text-xs font-black outline-none focus:border-lime-500 dark:border-white/10"
            value={servings}
            onChange={(event) =>
              dispatch({
                type: "set-servings",
                recipeId: activeRecipe.id,
                servings: Math.max(1, Number(event.target.value) || 1),
              })
            }
          />
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-xl border border-black/[0.07] bg-white p-1 dark:border-white/[0.08] dark:bg-white/[0.03]">
          <button
            type="button"
            className="toolbar-icon"
            aria-label="Zoom out"
            title="Zoom out"
            onClick={() => setZoom(Math.max(70, zoom - 10))}
          >
            <ZoomOut className="size-4" />
          </button>
          <span className="min-w-10 text-center text-[10px] font-black text-stone-600 dark:text-stone-400">
            {zoom}%
          </span>
          <button
            type="button"
            className="toolbar-icon"
            aria-label="Zoom in"
            title="Zoom in"
            onClick={() => setZoom(Math.min(160, zoom + 10))}
          >
            <ZoomIn className="size-4" />
          </button>
          <button
            type="button"
            className="toolbar-icon"
            aria-label="Reset zoom"
            title="Fit diagram"
            onClick={() => setZoom(100)}
          >
            <RotateCcw className="size-4" />
          </button>
        </div>

        <details className="relative">
          <summary
            className={`flex min-h-10 list-none items-center gap-2 rounded-xl px-3 text-xs font-black transition ${
              canExport
                ? "bg-stone-950 text-white hover:bg-stone-800 dark:bg-lime-300 dark:text-stone-950 dark:hover:bg-lime-200"
                : "cursor-not-allowed bg-stone-200 text-stone-400 dark:bg-white/[0.05] dark:text-stone-600"
            }`}
            aria-label="Export visualization"
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">
              {exporting ? `Making ${exporting.toUpperCase()}…` : "Export"}
            </span>
            <ChevronDown className="size-3" />
          </summary>
          <div className="absolute right-0 top-12 z-40 w-52 rounded-2xl border border-black/10 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-stone-900">
            <button
              type="button"
              className="menu-item"
              disabled={!canExport || exporting !== null}
              onClick={() => void runExport("svg")}
            >
              <FileDown className="size-4" />
              Download SVG
            </button>
            <button
              type="button"
              className="menu-item"
              disabled={!canExport || exporting !== null}
              onClick={() => void runExport("png")}
            >
              <Download className="size-4" />
              Download PNG · 2×
            </button>
          </div>
        </details>
      </div>
      {exportError ? (
        <p role="alert" className="mt-2 text-xs font-bold text-red-600">
          {exportError}
        </p>
      ) : null}
    </div>
  );
}

function DiagramCanvas({
  svgRef,
  zoom,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
  zoom: number;
}) {
  const { activeRecipe, servings, theme, view, dispatch } = useAppState();
  const issues = validateRecipe(activeRecipe);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [fitWidth, setFitWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const scrollArea = scrollAreaRef.current;
    const artboard = svgRef.current;
    if (!scrollArea || !artboard) return;

    const updateFitWidth = () => {
      const viewBox = (artboard.getAttribute("viewBox") ?? "")
        .split(/\s+/)
        .map(Number);
      const [, , artboardWidth, artboardHeight] = viewBox;
      if (
        !Number.isFinite(artboardWidth) ||
        !Number.isFinite(artboardHeight) ||
        artboardWidth <= 0 ||
        artboardHeight <= 0
      ) {
        return;
      }

      const styles = window.getComputedStyle(scrollArea);
      const horizontalPadding =
        Number.parseFloat(styles.paddingLeft) +
        Number.parseFloat(styles.paddingRight);
      const verticalPadding =
        Number.parseFloat(styles.paddingTop) +
        Number.parseFloat(styles.paddingBottom);
      const availableWidth = Math.max(
        1,
        scrollArea.clientWidth - horizontalPadding,
      );
      const availableHeight = Math.max(
        1,
        scrollArea.clientHeight - verticalPadding,
      );
      const nextFitWidth = Math.max(
        1,
        Math.floor(
          Math.min(
            availableWidth,
            availableHeight * (artboardWidth / artboardHeight),
          ),
        ),
      );
      setFitWidth((current) =>
        current === nextFitWidth ? current : nextFitWidth,
      );
    };

    updateFitWidth();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateFitWidth);
    observer.observe(scrollArea);
    return () => observer.disconnect();
  }, [
    activeRecipe.id,
    activeRecipe.ingredients.length,
    activeRecipe.steps.length,
    svgRef,
    view,
  ]);

  if (issues.length > 0) {
    return (
      <div className="grid min-h-full place-items-center p-6">
        <div className="max-w-md rounded-[2rem] border border-amber-300/80 bg-amber-50 p-7 text-center shadow-xl shadow-amber-900/5 dark:border-amber-400/20 dark:bg-amber-500/10">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-200 text-amber-950 dark:bg-amber-300">
            <FilePlus2 className="size-7" />
          </span>
          <h2 className="mt-5 text-xl font-black tracking-tight">
            Connect the recipe first
          </h2>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-stone-600 dark:text-stone-300">
            {issues[0].message} The diagram will update live as the structure
            becomes valid.
          </p>
          <button
            type="button"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-stone-950 px-4 text-sm font-black text-white dark:bg-lime-300 dark:text-stone-950 lg:hidden"
            onClick={() =>
              dispatch({ type: "set-mobile-panel", panel: "editor" })
            }
          >
            Open editor
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollAreaRef}
      data-testid="diagram-scroll-area"
      aria-label="Scrollable recipe diagram"
      tabIndex={0}
      className="thin-scrollbar h-full min-h-0 overflow-auto p-3 sm:p-6"
    >
      <div
        className="diagram-paper mx-auto origin-top transition-[width] duration-200"
        style={{
          width:
            fitWidth === null
              ? "100%"
              : `${Math.max(1, fitWidth * (zoom / 100))}px`,
        }}
      >
        {view === "matrix" ? (
          <MatrixDiagram
            recipe={activeRecipe}
            servings={servings}
            theme={theme}
            svgRef={svgRef}
          />
        ) : (
          <FlowDiagram
            recipe={activeRecipe}
            servings={servings}
            theme={theme}
            svgRef={svgRef}
          />
        )}
      </div>
    </div>
  );
}

function Workspace() {
  const { mobilePanel, editorCollapsed, dispatch } = useAppState();
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(100);

  return (
    <div className="flex h-dvh min-h-[620px] flex-col overflow-hidden bg-[#f4f1e9] text-stone-950 dark:bg-[#11120f] dark:text-stone-50">
      <header className="relative z-50 flex min-h-[64px] shrink-0 items-center gap-3 border-b border-black/[0.07] bg-[#f4f1e9]/95 px-3 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#11120f]/95 sm:px-4">
        <AppLogo />
        <div className="hidden h-7 w-px bg-black/10 sm:block dark:bg-white/10" />
        <LibraryControls />
      </header>

      <nav
        aria-label="Mobile workspace view"
        className="grid shrink-0 grid-cols-2 border-b border-black/[0.07] bg-white p-1.5 dark:border-white/[0.07] dark:bg-stone-950 lg:hidden"
      >
        {(["editor", "preview"] as const).map((panel) => (
          <button
            key={panel}
            type="button"
            aria-pressed={mobilePanel === panel}
            className={`min-h-10 rounded-xl text-xs font-black capitalize ${
              mobilePanel === panel
                ? "bg-stone-950 text-white dark:bg-lime-300 dark:text-stone-950"
                : "text-stone-600 dark:text-stone-400"
            }`}
            onClick={() =>
              dispatch({ type: "set-mobile-panel", panel })
            }
          >
            {panel}
          </button>
        ))}
      </nav>

      <div className="flex min-h-0 flex-1">
        <aside
          aria-label="Recipe editor"
          className={`thin-scrollbar h-full shrink-0 overflow-y-auto border-r border-black/[0.07] bg-[#ebe8df] transition-[width] duration-300 dark:border-white/[0.07] dark:bg-[#171813] ${
            mobilePanel === "editor" ? "block w-full" : "hidden"
          } ${
            editorCollapsed
              ? "lg:block lg:w-0 lg:overflow-hidden lg:border-r-0"
              : "lg:block lg:w-[420px]"
          }`}
        >
          <div className="w-full lg:w-[420px]">
            <RecipeEditor />
          </div>
        </aside>

        <main
          aria-label="Recipe visualization preview"
          className={`app-grid min-w-0 flex-1 flex-col bg-[#e8e5dc] dark:bg-[#0e0f0c] ${
            mobilePanel === "preview" ? "flex" : "hidden"
          } lg:flex`}
        >
          <PreviewToolbar zoom={zoom} setZoom={setZoom} svgRef={svgRef} />
          <div className="min-h-0 flex-1">
            <DiagramCanvas svgRef={svgRef} zoom={zoom} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <Workspace />
    </AppStateProvider>
  );
}
