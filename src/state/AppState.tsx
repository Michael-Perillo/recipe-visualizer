import {
  createContext,
  type Dispatch,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { DEFAULT_RECIPE } from "../data/defaultRecipe";
import { RECIPE_LIMITS, normalizeServings } from "../domain/limits";
import { cloneRecipe, createBlankRecipe, makeId } from "../domain/recipe";
import { persistedLibrarySchema, recipeDocumentSchema } from "../domain/schema";
import type {
  DiagramView,
  MobilePanel,
  PersistedLibraryV1,
  RecipeDocumentV1,
  Theme,
} from "../domain/types";

const STORAGE_KEY = "recipe-visualizer:library:v1";
const RECOVERY_KEY = `${STORAGE_KEY}:recovery`;

type AppState = {
  activeRecipeId: string;
  recipes: RecipeDocumentV1[];
  view: DiagramView;
  theme: Theme;
  servingsByRecipe: Record<string, number>;
  mobilePanel: MobilePanel;
  editorCollapsed: boolean;
};

type AppAction =
  | { type: "set-active"; recipeId: string }
  | { type: "replace-active"; recipe: RecipeDocumentV1 }
  | { type: "new-recipe" }
  | { type: "duplicate-active" }
  | { type: "delete-active" }
  | { type: "import-recipe"; recipe: RecipeDocumentV1 }
  | { type: "set-view"; view: DiagramView }
  | { type: "set-theme"; theme: Theme }
  | { type: "set-servings"; recipeId: string; servings: number }
  | { type: "set-mobile-panel"; panel: MobilePanel }
  | { type: "toggle-editor" }
  | { type: "replace-library"; state: AppState }
  | { type: "reset-library"; state: AppState };

type SaveStatus = "saving" | "saved" | "unavailable" | "demo";

export type RecoveryNotice = {
  raw?: string;
  backupAvailable: boolean;
  salvagedRecipes: number;
};

type AppContextValue = AppState & {
  activeRecipe: RecipeDocumentV1;
  servings: number;
  saveStatus: SaveStatus;
  recoveryNotice: RecoveryNotice | null;
  hasExternalConflict: boolean;
  dispatch: Dispatch<AppAction>;
  dismissRecovery: () => void;
  resetLocalData: () => void;
  useExternalChanges: () => void;
  keepLocalChanges: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

function getSystemTheme(): Theme {
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

function createDefaultState(): AppState {
  return {
    activeRecipeId: DEFAULT_RECIPE.id,
    recipes: [DEFAULT_RECIPE],
    view: "flow",
    theme: getSystemTheme(),
    servingsByRecipe: { [DEFAULT_RECIPE.id]: DEFAULT_RECIPE.baseServings },
    mobilePanel: "preview",
    editorCollapsed: false,
  };
}

function libraryToState(library: PersistedLibraryV1): AppState {
  const activeRecipeId = library.recipes.some(
    (recipe) => recipe.id === library.activeRecipeId,
  )
    ? library.activeRecipeId
    : library.recipes[0].id;

  const servingsByRecipe = Object.fromEntries(
    library.recipes.map((recipe) => [
      recipe.id,
      normalizeServings(library.servingsByRecipe[recipe.id]) ??
        recipe.baseServings,
    ]),
  );

  return {
    activeRecipeId,
    recipes: library.recipes,
    view: library.view,
    theme: library.theme,
    servingsByRecipe,
    mobilePanel: "preview",
    editorCollapsed: false,
  };
}

type InitialBundle = {
  state: AppState;
  recovery: RecoveryNotice | null;
  persistenceEnabled: boolean;
  updatedAt: number;
  shouldPersist: boolean;
};

function salvageLibrary(value: unknown): AppState | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.recipes)) return null;
  const recipes = candidate.recipes
    .slice(0, RECIPE_LIMITS.recipes)
    .flatMap((recipe) => {
      const parsed = recipeDocumentSchema.safeParse(recipe);
      return parsed.success ? [parsed.data] : [];
    });
  if (recipes.length === 0) return null;

  const view = candidate.view === "matrix" ? "matrix" : "flow";
  const theme =
    candidate.theme === "dark" || candidate.theme === "light"
      ? candidate.theme
      : getSystemTheme();
  const activeRecipeId =
    typeof candidate.activeRecipeId === "string" &&
    recipes.some((recipe) => recipe.id === candidate.activeRecipeId)
      ? candidate.activeRecipeId
      : recipes[0].id;
  const rawServings =
    candidate.servingsByRecipe && typeof candidate.servingsByRecipe === "object"
      ? (candidate.servingsByRecipe as Record<string, unknown>)
      : {};

  return {
    activeRecipeId,
    recipes,
    view,
    theme,
    servingsByRecipe: Object.fromEntries(
      recipes.map((recipe) => {
        const savedServings = rawServings[recipe.id];
        return [
          recipe.id,
          normalizeServings(
            typeof savedServings === "number"
              ? savedServings
              : recipe.baseServings,
          ) ?? recipe.baseServings,
        ];
      }),
    ),
    mobilePanel: "preview",
    editorCollapsed: false,
  };
}

function getInitialBundle(): InitialBundle {
  const fallback = createDefaultState();
  if (typeof window === "undefined") {
    return {
      state: fallback,
      recovery: null,
      persistenceEnabled: false,
      updatedAt: 0,
      shouldPersist: false,
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        state: fallback,
        recovery: null,
        persistenceEnabled: true,
        updatedAt: 0,
        shouldPersist: true,
      };
    }
    const json = JSON.parse(raw) as unknown;
    const parsed = persistedLibrarySchema.safeParse(json);
    if (parsed.success) {
      return {
        state: libraryToState(parsed.data),
        recovery: null,
        persistenceEnabled: true,
        updatedAt: parsed.data.updatedAt ?? 0,
        shouldPersist: false,
      };
    }

    let backupAvailable = false;
    try {
      window.localStorage.setItem(RECOVERY_KEY, raw);
      backupAvailable = true;
    } catch {
      backupAvailable = false;
    }
    const salvaged = salvageLibrary(json);
    return {
      state: salvaged ?? fallback,
      recovery: {
        raw,
        backupAvailable,
        salvagedRecipes: salvaged?.recipes.length ?? 0,
      },
      persistenceEnabled: backupAvailable,
      updatedAt: 0,
      shouldPersist: backupAvailable,
    };
  } catch {
    let raw: string | undefined;
    let backupAvailable = false;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY) ?? undefined;
      if (raw !== undefined) {
        window.localStorage.setItem(RECOVERY_KEY, raw);
        backupAvailable = true;
      }
    } catch {
      backupAvailable = false;
    }
    return {
      state: fallback,
      recovery: raw ? { raw, backupAvailable, salvagedRecipes: 0 } : null,
      persistenceEnabled: raw ? backupAvailable : false,
      updatedAt: 0,
      shouldPersist: raw ? backupAvailable : false,
    };
  }
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "set-active":
      if (!state.recipes.some((recipe) => recipe.id === action.recipeId)) {
        return state;
      }
      return {
        ...state,
        activeRecipeId: action.recipeId,
        mobilePanel: "preview",
      };
    case "replace-active":
      return {
        ...state,
        recipes: state.recipes.map((recipe) =>
          recipe.id === state.activeRecipeId ? action.recipe : recipe,
        ),
      };
    case "new-recipe": {
      if (state.recipes.length >= RECIPE_LIMITS.recipes) return state;
      const recipe = createBlankRecipe();
      return {
        ...state,
        recipes: [...state.recipes, recipe],
        activeRecipeId: recipe.id,
        servingsByRecipe: {
          ...state.servingsByRecipe,
          [recipe.id]: recipe.baseServings,
        },
        mobilePanel: "editor",
        editorCollapsed: false,
      };
    }
    case "duplicate-active": {
      if (state.recipes.length >= RECIPE_LIMITS.recipes) return state;
      const active = state.recipes.find(
        (recipe) => recipe.id === state.activeRecipeId,
      );
      if (!active) return state;
      const duplicate = cloneRecipe(active);
      return {
        ...state,
        recipes: [...state.recipes, duplicate],
        activeRecipeId: duplicate.id,
        servingsByRecipe: {
          ...state.servingsByRecipe,
          [duplicate.id]:
            state.servingsByRecipe[active.id] ?? active.baseServings,
        },
        mobilePanel: "editor",
        editorCollapsed: false,
      };
    }
    case "delete-active": {
      const remaining = state.recipes.filter(
        (recipe) => recipe.id !== state.activeRecipeId,
      );
      const recipes = remaining.length > 0 ? remaining : [createBlankRecipe()];
      const activeRecipeId = recipes[0].id;
      const servingsByRecipe = { ...state.servingsByRecipe };
      delete servingsByRecipe[state.activeRecipeId];
      if (!servingsByRecipe[activeRecipeId]) {
        servingsByRecipe[activeRecipeId] = recipes[0].baseServings;
      }
      return {
        ...state,
        recipes,
        activeRecipeId,
        servingsByRecipe,
      };
    }
    case "import-recipe": {
      if (state.recipes.length >= RECIPE_LIMITS.recipes) return state;
      const recipe = state.recipes.some(
        (candidate) => candidate.id === action.recipe.id,
      )
        ? {
            ...action.recipe,
            id: makeId("recipe"),
            title: `${action.recipe.title} imported`,
          }
        : action.recipe;
      return {
        ...state,
        recipes: [...state.recipes, recipe],
        activeRecipeId: recipe.id,
        servingsByRecipe: {
          ...state.servingsByRecipe,
          [recipe.id]: recipe.baseServings,
        },
        mobilePanel: "preview",
      };
    }
    case "set-view":
      return { ...state, view: action.view };
    case "set-theme":
      return { ...state, theme: action.theme };
    case "set-servings": {
      const servings = normalizeServings(action.servings);
      if (servings === undefined) return state;
      return {
        ...state,
        servingsByRecipe: {
          ...state.servingsByRecipe,
          [action.recipeId]: servings,
        },
      };
    }
    case "set-mobile-panel":
      return { ...state, mobilePanel: action.panel };
    case "toggle-editor":
      return { ...state, editorCollapsed: !state.editorCollapsed };
    case "replace-library":
    case "reset-library":
      return action.state;
    default:
      return state;
  }
}

export function AppStateProvider({
  children,
  initialLibrary,
  storage = "local",
}: {
  children: ReactNode;
  /** Isolated examples never read, write, reset, or subscribe to browser storage. */
  storage?: "local" | "memory";
  /** Read once on mount. Remount the provider to load a different fixture. */
  initialLibrary?: PersistedLibraryV1;
}) {
  const [memoryOnly] = useState(storage === "memory");
  const [initial] = useState<InitialBundle>(() =>
    memoryOnly
      ? {
          state: initialLibrary
            ? libraryToState(initialLibrary)
            : createDefaultState(),
          recovery: null,
          persistenceEnabled: false,
          updatedAt: 0,
          shouldPersist: false,
        }
      : getInitialBundle(),
  );
  const [state, baseDispatch] = useReducer(reducer, initial.state);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    memoryOnly
      ? "demo"
      : initial.persistenceEnabled
        ? initial.shouldPersist
          ? "saving"
          : "saved"
        : "unavailable",
  );
  const [recoveryNotice, setRecoveryNotice] = useState<RecoveryNotice | null>(
    initial.recovery,
  );
  const [persistenceEnabled, setPersistenceEnabled] = useState(
    initial.persistenceEnabled,
  );
  const [externalConflict, setExternalConflict] = useState<{
    state: AppState;
    updatedAt: number;
  } | null>(null);
  const stateRef = useRef(state);
  const persistenceEnabledRef = useRef(persistenceEnabled);
  const dirtyRef = useRef(initial.shouldPersist);
  const saveTimerRef = useRef<number | null>(null);
  const skipNextSaveRef = useRef(false);
  const updatedAtRef = useRef(initial.updatedAt);
  const originIdRef = useRef(makeId("tab"));

  const updateSaveStatus = useCallback((status: SaveStatus) => {
    setSaveStatus(status);
  }, []);

  const flushState = useCallback(() => {
    if (!dirtyRef.current || !persistenceEnabledRef.current) return false;
    const updatedAt = Math.max(Date.now(), updatedAtRef.current + 1);
    const current = stateRef.current;
    const persisted: PersistedLibraryV1 = {
      schemaVersion: 1,
      activeRecipeId: current.activeRecipeId,
      recipes: current.recipes,
      view: current.view,
      theme: current.theme,
      servingsByRecipe: current.servingsByRecipe,
      updatedAt,
      originId: originIdRef.current,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
      updatedAtRef.current = updatedAt;
      dirtyRef.current = false;
      updateSaveStatus("saved");
      return true;
    } catch {
      updateSaveStatus("unavailable");
      return false;
    }
  }, [updateSaveStatus]);

  const dispatch = useCallback<Dispatch<AppAction>>(
    (action) => {
      dirtyRef.current = true;
      if (persistenceEnabledRef.current) {
        updateSaveStatus("saving");
      }
      baseDispatch(action);
    },
    [updateSaveStatus],
  );

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    persistenceEnabledRef.current = persistenceEnabled;
  }, [persistenceEnabled]);

  const activeRecipe =
    state.recipes.find((recipe) => recipe.id === state.activeRecipeId) ??
    state.recipes[0];
  const servings =
    state.servingsByRecipe[activeRecipe.id] ?? activeRecipe.baseServings;

  useEffect(() => {
    if (memoryOnly) return;
    document.documentElement.classList.toggle("dark", state.theme === "dark");
    document.documentElement.dataset.theme = state.theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", state.theme === "dark" ? "#11120f" : "#f4f1e9");
  }, [memoryOnly, state.theme]);

  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (!dirtyRef.current) return;
    if (!persistenceEnabled) return;
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      flushState();
    }, 320);
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [
    flushState,
    persistenceEnabled,
    state.activeRecipeId,
    state.recipes,
    state.servingsByRecipe,
    state.theme,
    state.view,
  ]);

  useEffect(() => {
    const flushPendingState = () => {
      if (document.visibilityState === "hidden") flushState();
    };
    const handlePageHide = () => flushState();
    document.addEventListener("visibilitychange", flushPendingState);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", flushPendingState);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [flushState]);

  useEffect(() => {
    if (memoryOnly) return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const parsed = persistedLibrarySchema.safeParse(
          JSON.parse(event.newValue),
        );
        if (!parsed.success) return;
        const incoming = parsed.data;
        if (incoming.originId === originIdRef.current) return;
        const incomingUpdatedAt = incoming.updatedAt ?? Date.now();
        if (incomingUpdatedAt <= updatedAtRef.current) return;
        const incomingState = libraryToState(incoming);
        if (dirtyRef.current) {
          setExternalConflict({
            state: incomingState,
            updatedAt: incomingUpdatedAt,
          });
          return;
        }
        updatedAtRef.current = incomingUpdatedAt;
        dirtyRef.current = false;
        skipNextSaveRef.current = true;
        stateRef.current = incomingState;
        baseDispatch({ type: "replace-library", state: incomingState });
        updateSaveStatus("saved");
      } catch {
        // Ignore invalid writes from other tabs; the current library stays safe.
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [memoryOnly, updateSaveStatus]);

  const dismissRecovery = useCallback(() => setRecoveryNotice(null), []);

  const resetLocalData = useCallback(() => {
    if (memoryOnly) {
      baseDispatch({ type: "reset-library", state: createDefaultState() });
      return;
    }
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(RECOVERY_KEY);
      persistenceEnabledRef.current = true;
      setPersistenceEnabled(true);
      setRecoveryNotice(null);
      setExternalConflict(null);
      const next = createDefaultState();
      stateRef.current = next;
      dirtyRef.current = true;
      baseDispatch({ type: "reset-library", state: next });
      updateSaveStatus("saving");
    } catch {
      persistenceEnabledRef.current = false;
      setPersistenceEnabled(false);
      updateSaveStatus("unavailable");
    }
  }, [memoryOnly, updateSaveStatus]);

  const useExternalChanges = useCallback(() => {
    if (!externalConflict) return;
    updatedAtRef.current = externalConflict.updatedAt;
    dirtyRef.current = false;
    skipNextSaveRef.current = true;
    stateRef.current = externalConflict.state;
    baseDispatch({
      type: "replace-library",
      state: externalConflict.state,
    });
    setExternalConflict(null);
    updateSaveStatus("saved");
  }, [externalConflict, updateSaveStatus]);

  const keepLocalChanges = useCallback(() => {
    if (externalConflict) {
      updatedAtRef.current = Math.max(
        updatedAtRef.current,
        externalConflict.updatedAt,
      );
    }
    setExternalConflict(null);
    dirtyRef.current = true;
    updateSaveStatus("saving");
    flushState();
  }, [externalConflict, flushState, updateSaveStatus]);

  const value = useMemo(
    () => ({
      ...state,
      activeRecipe,
      servings,
      saveStatus,
      recoveryNotice,
      hasExternalConflict: externalConflict !== null,
      dispatch,
      dismissRecovery,
      resetLocalData,
      useExternalChanges,
      keepLocalChanges,
    }),
    [
      activeRecipe,
      dismissRecovery,
      dispatch,
      externalConflict,
      keepLocalChanges,
      recoveryNotice,
      resetLocalData,
      saveStatus,
      servings,
      state,
      useExternalChanges,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppState must be used inside AppStateProvider");
  }
  return context;
}

export { RECOVERY_KEY, STORAGE_KEY };
