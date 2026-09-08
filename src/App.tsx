import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Copy,
  DatabaseBackup,
  Download,
  FileDown,
  FileJson,
  FilePlus2,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  RefreshCcw,
  Sun,
  Trash2,
  Upload,
  WandSparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { type ChangeEvent, type RefObject, useRef, useState } from "react";
import { RecipeDiagram } from "./components/diagram/RecipeDiagram";
import { RecipeEditor } from "./components/RecipeEditor";
import { DEFAULT_RECIPE } from "./data/defaultRecipe";
import { SegmentedControl, StatusBadge } from "./components/ui";
import { RECIPE_LIMITS, normalizeServings } from "./domain/limits";
import { normalizeRecipeStepOrder, validateRecipe } from "./domain/recipe";
import { recipeDocumentSchema } from "./domain/schema";
import {
  buildExportName,
  downloadPng,
  downloadRecoveryJson,
  downloadRecipeJson,
  downloadSvg,
  composeRecipeExport,
} from "./lib/export";
import { AppStateProvider, useAppState } from "./state/AppState";

function AppLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--rv-ink)] text-[var(--rv-accent)] dark:bg-[var(--rv-accent)] dark:text-[var(--rv-accent-ink)]">
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
    saveStatus === "demo"
      ? "Demo · not saved"
      : saveStatus === "saved"
        ? "Saved locally"
        : saveStatus === "saving"
          ? "Saving…"
          : "Local save unavailable";
  return (
    <div className="hidden md:block">
      <StatusBadge
        aria-live="polite"
        tone={saveStatus === "unavailable" ? "warning" : "neutral"}
      >
        {saveStatus === "saved" ? (
          <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
        ) : saveStatus !== "demo" ? (
          <span className="size-2 animate-pulse rounded-full bg-amber-500" />
        ) : null}
        {label}
      </StatusBadge>
    </div>
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
    if (recipes.length >= RECIPE_LIMITS.recipes) {
      setImportError(
        `This browser library already has the maximum of ${RECIPE_LIMITS.recipes} recipes.`,
      );
      return;
    }
    if (file.size > RECIPE_LIMITS.importBytes) {
      setImportError("Recipe JSON files must be smaller than 1 MB.");
      return;
    }
    try {
      const parsed = recipeDocumentSchema.safeParse(
        JSON.parse(await file.text()),
      );
      if (!parsed.success) {
        setImportError("That file is not a Recipe Visualizer v1 document.");
        return;
      }
      const issues = validateRecipe(parsed.data);
      if (issues.length > 0) {
        setImportError(
          `That recipe cannot be imported: ${issues
            .slice(0, 3)
            .map((issue) => issue.message)
            .join(" ")}`,
        );
        return;
      }
      setImportError("");
      dispatch({
        type: "import-recipe",
        recipe: normalizeRecipeStepOrder(parsed.data),
      });
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
              onClick={() => {
                const issues = validateRecipe(activeRecipe);
                if (issues.length > 0) {
                  setImportError(
                    `Fix this recipe before exporting it: ${issues[0].message}`,
                  );
                  return;
                }
                downloadRecipeJson(activeRecipe);
              }}
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
            {activeRecipe.id === DEFAULT_RECIPE.id ? (
              <button
                type="button"
                className="menu-item"
                onClick={(event) => {
                  if (
                    !window.confirm(
                      "Replace this saved brownie recipe with the detailed seven-step example? Export your current recipe first if you want to keep it.",
                    )
                  )
                    return;
                  dispatch({
                    type: "replace-active",
                    recipe: structuredClone(DEFAULT_RECIPE),
                  });
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                }}
              >
                <RefreshCcw className="size-4" />
                Restore brownie example
              </button>
            ) : null}
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
          className="header-icon hidden xl:grid"
          aria-label={
            editorCollapsed ? "Open recipe editor" : "Close recipe editor"
          }
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

function DataSafetyNotices() {
  const {
    recoveryNotice,
    hasExternalConflict,
    dismissRecovery,
    resetLocalData,
    useExternalChanges,
    keepLocalChanges,
  } = useAppState();

  if (!recoveryNotice && !hasExternalConflict) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[90] mx-auto flex max-w-2xl flex-col gap-2">
      {recoveryNotice ? (
        <section
          role="alert"
          className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-2xl dark:border-amber-500/30 dark:bg-amber-950 dark:text-amber-50"
        >
          <div className="flex items-start gap-3">
            <DatabaseBackup className="mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black">Saved data needed recovery</p>
              <p className="mt-1 text-xs font-semibold leading-relaxed">
                {recoveryNotice.salvagedRecipes > 0
                  ? `${recoveryNotice.salvagedRecipes} structurally valid recipe${
                      recoveryNotice.salvagedRecipes === 1 ? " was" : "s were"
                    } recovered.`
                  : "The app opened a safe default library."}{" "}
                {recoveryNotice.backupAvailable
                  ? "The original data is preserved in this browser."
                  : "Browser storage was unavailable, so the original data has not been overwritten."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {recoveryNotice.raw ? (
                  <button
                    type="button"
                    className="min-h-9 rounded-xl bg-stone-950 px-3 text-xs font-black text-white dark:bg-lime-300 dark:text-stone-950"
                    onClick={() => downloadRecoveryJson(recoveryNotice.raw!)}
                  >
                    Download recovery JSON
                  </button>
                ) : null}
                <button
                  type="button"
                  className="min-h-9 rounded-xl border border-current/20 px-3 text-xs font-black"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Reset local Recipe Visualizer data? Download the recovery JSON first if you may need it.",
                      )
                    ) {
                      resetLocalData();
                    }
                  }}
                >
                  Reset local data
                </button>
                <button
                  type="button"
                  className="min-h-9 px-2 text-xs font-black"
                  onClick={dismissRecovery}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {hasExternalConflict ? (
        <section
          role="alert"
          className="rounded-2xl border border-sky-300 bg-sky-50 p-4 text-sky-950 shadow-2xl dark:border-sky-500/30 dark:bg-sky-950 dark:text-sky-50"
        >
          <div className="flex items-start gap-3">
            <RefreshCcw className="mt-0.5 size-5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-black">
                Another tab changed this library
              </p>
              <p className="mt-1 text-xs font-semibold">
                Choose which complete browser copy to keep. Changes are not
                merged.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="min-h-9 rounded-xl bg-stone-950 px-3 text-xs font-black text-white dark:bg-lime-300 dark:text-stone-950"
                  onClick={useExternalChanges}
                >
                  Load other tab
                </button>
                <button
                  type="button"
                  className="min-h-9 rounded-xl border border-current/20 px-3 text-xs font-black"
                  onClick={keepLocalChanges}
                >
                  Keep this tab
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
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
  const { activeRecipe, view, theme, servings, dispatch } = useAppState();
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
      const exported = await composeRecipeExport(
        svgRef.current,
        activeRecipe,
        theme,
      );
      if (format === "svg") {
        await downloadSvg(exported, filename);
      } else {
        await downloadPng(exported, filename);
      }
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : "The export could not be created.",
      );
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="rv-toolbar px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          label="Visualization style"
          value={view}
          options={[
            { value: "matrix", label: "Matrix", testId: "matrix-view" },
            { value: "flow", label: "Flow", testId: "flow-view" },
          ]}
          onChange={(view) => dispatch({ type: "set-view", view })}
        />

        <div className="rv-control-group">
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
                  ? "bg-[var(--rv-accent)] text-[var(--rv-accent-ink)]"
                  : "text-[var(--rv-muted)] hover:bg-[var(--rv-surface)]"
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
            max={RECIPE_LIMITS.servings}
            step="1"
            aria-label="Custom servings"
            title="Custom servings"
            className="h-8 w-12 rounded-lg border border-black/10 bg-transparent px-1 text-center text-xs font-black outline-none focus:border-lime-500 dark:border-white/10"
            value={servings}
            onChange={(event) => {
              const next = normalizeServings(event.target.value);
              if (next === undefined) return;
              dispatch({
                type: "set-servings",
                recipeId: activeRecipe.id,
                servings: next,
              });
            }}
          />
        </div>

        <div className="rv-control-group ml-auto">
          <button
            type="button"
            className="toolbar-icon"
            aria-label="Zoom out"
            title="Zoom out"
            onClick={() => setZoom(Math.max(50, zoom - 10))}
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
            title="Reset map to readable size"
            onClick={() => setZoom(100)}
          >
            <RotateCcw className="size-4" />
          </button>
        </div>

        <details className="relative">
          <summary
            className={`rv-button list-none ${
              canExport ? "rv-button--primary" : "cursor-not-allowed opacity-45"
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
              Download PNG · up to 2×
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
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-stone-950 px-4 text-sm font-black text-white dark:bg-lime-300 dark:text-stone-950 xl:hidden"
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
      data-testid="diagram-scroll-area"
      aria-label="Scrollable recipe diagram"
      tabIndex={0}
      className="thin-scrollbar h-full min-h-0 overflow-auto overscroll-contain p-3 sm:p-6"
    >
      <RecipeDiagram
        recipe={activeRecipe}
        servings={servings}
        theme={theme}
        view={view}
        svgRef={svgRef}
        zoom={zoom}
      />
    </div>
  );
}

export function Workspace() {
  const { mobilePanel, editorCollapsed, dispatch, theme } = useAppState();
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(100);

  return (
    <div
      className={`rv-theme rv-workspace ${theme === "dark" ? "dark" : ""} flex h-full min-h-0 flex-col overflow-hidden`}
    >
      <header className="rv-header relative z-50 flex min-h-[64px] shrink-0 items-center gap-3 px-3 sm:px-4">
        <AppLogo />
        <div className="hidden h-7 w-px bg-black/10 sm:block dark:bg-white/10" />
        <LibraryControls />
      </header>
      <DataSafetyNotices />

      <nav
        aria-label="Mobile workspace view"
        className="grid shrink-0 grid-cols-2 border-b border-black/[0.07] bg-white p-1.5 dark:border-white/[0.07] dark:bg-stone-950 xl:hidden"
      >
        {(["editor", "preview"] as const).map((panel) => (
          <button
            key={panel}
            type="button"
            aria-pressed={mobilePanel === panel}
            className={`min-h-10 rounded-lg text-xs font-extrabold capitalize ${
              mobilePanel === panel
                ? "bg-[var(--rv-accent)] text-[var(--rv-accent-ink)]"
                : "text-stone-600 dark:text-stone-400"
            }`}
            onClick={() => dispatch({ type: "set-mobile-panel", panel })}
          >
            {panel}
          </button>
        ))}
      </nav>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          aria-label="Recipe editor"
          className={`rv-editor thin-scrollbar h-full shrink-0 overflow-y-auto overscroll-contain border-r transition-[width] duration-300 ${
            mobilePanel === "editor" ? "block w-full" : "hidden"
          } ${
            editorCollapsed
              ? "xl:block xl:w-0 xl:overflow-hidden xl:border-r-0"
              : "xl:block xl:w-[420px]"
          }`}
        >
          <div className="w-full xl:w-[420px]">
            <RecipeEditor />
          </div>
        </aside>

        <main
          aria-label="Recipe visualization preview"
          className={`rv-canvas app-grid min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
            mobilePanel === "preview" ? "flex" : "hidden"
          } xl:flex`}
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
