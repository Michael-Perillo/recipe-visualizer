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

export type Measurement = {
  value: number;
  unit: string;
};

export type TimingUnit = "seconds" | "minutes" | "hours";

export type StepTiming = {
  minimum: number;
  maximum?: number;
  unit: TimingUnit;
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
  alternateMeasurements?: Measurement[];
  note?: string;
  visualStyle: IngredientStyle;
  featured?: boolean;
};

export type RecipeStep = {
  id: string;
  label: string;
  details?: string;
  timing?: StepTiming;
  tool?: string;
  setting?: string;
  cue?: string;
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
  updatedAt?: number;
  originId?: string;
};

export const INGREDIENT_STYLE_LABELS: Record<IngredientStyle, string> = {
  auto: "Auto",
  dry: "Dry / arrow",
  liquid: "Liquid / wave",
  featured: "Featured (legacy)",
  neutral: "Neutral / line",
};

export const INGREDIENT_LINE_STYLE_LABELS: Record<
  Exclude<IngredientStyle, "featured">,
  string
> = {
  auto: "Auto",
  dry: "Dry / arrow",
  liquid: "Liquid / wave",
  neutral: "Neutral / line",
};
