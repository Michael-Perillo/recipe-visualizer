import {
  createContext,
  type Dispatch,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { DEFAULT_RECIPE } from "../data/defaultRecipe";
import { cloneRecipe, createBlankRecipe, makeId } from "../domain/recipe";
import { persistedLibrarySchema } from "../domain/schema";
import type {
  DiagramView,
  MobilePanel,
  PersistedLibraryV1,
  RecipeDocumentV1,
  Theme,
} from "../domain/types";

const STORAGE_KEY = "recipe-visualizer:library:v1";

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
  | { type: "toggle-editor" };

type SaveStatus = "saving" | "saved" | "unavailable";

type AppContextValue = AppState & {
  activeRecipe: RecipeDocumentV1;
  servings: number;
  saveStatus: SaveStatus;
  dispatch: Dispatch<AppAction>;
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

function getInitialState(): AppState {
  const fallback: AppState = {
    activeRecipeId: DEFAULT_RECIPE.id,
    recipes: [DEFAULT_RECIPE],
    view: "flow",
    theme: getSystemTheme(),
    servingsByRecipe: { [DEFAULT_RECIPE.id]: DEFAULT_RECIPE.baseServings },
    mobilePanel: "preview",
    editorCollapsed: false,
  };

  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = persistedLibrarySchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return fallback;
    const library = parsed.data;
    const activeRecipeId = library.recipes.some(
      (recipe) => recipe.id === library.activeRecipeId,
    )
      ? library.activeRecipeId
      : library.recipes[0].id;

    return {
      ...library,
      activeRecipeId,
      mobilePanel: "preview",
      editorCollapsed: false,
    };
  } catch {
    return fallback;
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
    case "set-servings":
      return {
        ...state,
        servingsByRecipe: {
          ...state.servingsByRecipe,
          [action.recipeId]: Math.max(1, action.servings),
        },
      };
    case "set-mobile-panel":
      return { ...state, mobilePanel: action.panel };
    case "toggle-editor":
      return { ...state, editorCollapsed: !state.editorCollapsed };
    default:
      return state;
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");

  const activeRecipe =
    state.recipes.find((recipe) => recipe.id === state.activeRecipeId) ??
    state.recipes[0];
  const servings =
    state.servingsByRecipe[activeRecipe.id] ?? activeRecipe.baseServings;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", state.theme === "dark");
    document.documentElement.dataset.theme = state.theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", state.theme === "dark" ? "#11120f" : "#f4f1e9");
  }, [state.theme]);

  useEffect(() => {
    const statusTimer = window.setTimeout(() => setSaveStatus("saving"), 0);
    const timer = window.setTimeout(() => {
      const persisted: PersistedLibraryV1 = {
        schemaVersion: 1,
        activeRecipeId: state.activeRecipeId,
        recipes: state.recipes,
        view: state.view,
        theme: state.theme,
        servingsByRecipe: state.servingsByRecipe,
      };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
        setSaveStatus("saved");
      } catch {
        setSaveStatus("unavailable");
      }
    }, 320);
    return () => {
      window.clearTimeout(statusTimer);
      window.clearTimeout(timer);
    };
  }, [
    state.activeRecipeId,
    state.recipes,
    state.servingsByRecipe,
    state.theme,
    state.view,
  ]);

  const value = useMemo(
    () => ({
      ...state,
      activeRecipe,
      servings,
      saveStatus,
      dispatch,
    }),
    [activeRecipe, saveStatus, servings, state],
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

export { STORAGE_KEY };
