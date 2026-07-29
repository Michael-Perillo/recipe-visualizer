export type NodeRef = {
  kind: "ingredient" | "step";
  id: string;
};

export type Quantity = {
  value?: number;
  unit?: string;
  text?: string;
  scalable: boolean;
};

export type IngredientStyle =
  | "auto"
  | "dry"
  | "liquid"
  | "featured"
  | "neutral";

export type ResolvedIngredientStyle = Exclude<IngredientStyle, "auto">;

export type Ingredient = {
  id: string;
  name: string;
  quantity: Quantity;
  note?: string;
  visualStyle: IngredientStyle;
};

export type RecipeStep = {
  id: string;
  label: string;
  details?: string;
  inputs: NodeRef[];
  durationMinutes?: number;
  temperature?: string;
};

export type RecipeDocumentV1 = {
  schemaVersion: 1;
  id: string;
  title: string;
  baseServings: number;
  outputLabel: string;
  prepNotes: string[];
  ingredients: Ingredient[];
  steps: RecipeStep[];
  finalStepId: string;
};

export type DiagramView = "matrix" | "flow";
export type Theme = "light" | "dark";
export type MobilePanel = "editor" | "preview";

export type ValidationIssue = {
  code: string;
  message: string;
  path?: string;
};

export type LeafRange = {
  start: number;
  end: number;
};

export type RecipeGraph = {
  recipe: RecipeDocumentV1;
  ingredientOrder: Ingredient[];
  stepOrder: RecipeStep[];
  stepDepths: Map<string, number>;
  stepRanges: Map<string, LeafRange>;
  consumers: Map<string, string>;
  maxDepth: number;
};

export type PersistedLibraryV1 = {
  schemaVersion: 1;
  activeRecipeId: string;
  recipes: RecipeDocumentV1[];
  view: DiagramView;
  theme: Theme;
  servingsByRecipe: Record<string, number>;
};

export const INGREDIENT_STYLE_LABELS: Record<IngredientStyle, string> = {
  auto: "Auto",
  dry: "Dry / arrow",
  liquid: "Liquid / wave",
  featured: "Featured / coil",
  neutral: "Neutral / line",
};
