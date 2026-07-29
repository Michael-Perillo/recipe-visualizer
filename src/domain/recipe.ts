import type {
  Ingredient,
  LeafRange,
  NodeRef,
  RecipeDocumentV1,
  RecipeGraph,
  RecipeStep,
  ResolvedIngredientStyle,
  ValidationIssue,
} from "./types";

const FRACTION_CANDIDATES = [
  [1, 8],
  [1, 6],
  [1, 4],
  [1, 3],
  [3, 8],
  [1, 2],
  [5, 8],
  [2, 3],
  [3, 4],
  [5, 6],
  [7, 8],
] as const;

export function makeId(prefix = "item"): string {
  const value =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${value}`;
}

export function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value) < 0.0001) return "0";

  const roundedInteger = Math.round(value);
  if (Math.abs(value - roundedInteger) < 0.012) {
    return String(roundedInteger);
  }

  const whole = Math.floor(value);
  const remainder = value - whole;
  let best: readonly [number, number] | undefined;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const candidate of FRACTION_CANDIDATES) {
    const decimal = candidate[0] / candidate[1];
    const delta = Math.abs(remainder - decimal);
    if (delta < bestDelta) {
      best = candidate;
      bestDelta = delta;
    }
  }

  if (best && bestDelta < 0.02) {
    const fraction = `${best[0]}/${best[1]}`;
    return whole > 0 ? `${whole} ${fraction}` : fraction;
  }

  return Number(value.toFixed(2)).toString();
}

export function scaleIngredient(
  ingredient: Ingredient,
  baseServings: number,
  targetServings: number,
): Ingredient {
  if (
    !ingredient.quantity.scalable ||
    ingredient.quantity.value === undefined
  ) {
    return ingredient;
  }

  return {
    ...ingredient,
    quantity: {
      ...ingredient.quantity,
      value:
        ingredient.quantity.value * (targetServings / Math.max(baseServings, 1)),
    },
  };
}

export function formatIngredientQuantity(ingredient: Ingredient): string {
  const { quantity } = ingredient;
  if (!quantity.scalable && quantity.text?.trim()) {
    return quantity.text.trim();
  }

  const amount =
    quantity.value === undefined ? "" : formatAmount(quantity.value);
  return [amount, quantity.unit?.trim()].filter(Boolean).join(" ");
}

export function resolveIngredientStyle(
  ingredient: Ingredient,
): ResolvedIngredientStyle {
  if (ingredient.visualStyle !== "auto") return ingredient.visualStyle;

  const value = `${ingredient.name} ${ingredient.note ?? ""}`.toLowerCase();
  const unit = ingredient.quantity.unit?.toLowerCase().trim() ?? "";

  if (
    /(cocoa|coffee|espresso|chocolate|matcha|saffron|spice blend)/.test(value)
  ) {
    return "featured";
  }

  if (
    /(flour|sugar|salt|baking soda|baking powder|yeast|oat|rice|starch|crumb)/.test(
      value,
    )
  ) {
    return "dry";
  }

  if (
    /(water|milk|cream|oil|juice|extract|egg|butter|broth|stock|vinegar|wine|syrup)/.test(
      value,
    ) ||
    /^(ml|l|fl oz|fluid ounce|fluid ounces)$/.test(unit)
  ) {
    return "liquid";
  }

  return "neutral";
}

export function validateRecipe(recipe: RecipeDocumentV1): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ingredientIds = new Set<string>();
  const stepIds = new Set<string>();
  const allIds = new Set<string>();

  if (!recipe.title.trim()) {
    issues.push({ code: "title", message: "Give this recipe a title." });
  }
  if (!recipe.outputLabel.trim()) {
    issues.push({
      code: "output",
      message: "Name the dish produced by the final operation.",
    });
  }
  if (!(recipe.baseServings > 0)) {
    issues.push({
      code: "servings",
      message: "Base servings must be greater than zero.",
    });
  }
  if (recipe.ingredients.length === 0) {
    issues.push({
      code: "ingredients",
      message: "Add at least one ingredient.",
    });
  }
  if (recipe.steps.length === 0) {
    issues.push({ code: "steps", message: "Add at least one operation." });
  }

  for (const ingredient of recipe.ingredients) {
    if (allIds.has(ingredient.id)) {
      issues.push({
        code: "duplicate-id",
        message: "Every ingredient and operation needs a unique ID.",
      });
    }
    allIds.add(ingredient.id);
    ingredientIds.add(ingredient.id);
    if (!ingredient.name.trim()) {
      issues.push({
        code: "ingredient-name",
        message: "Every ingredient needs a name.",
        path: ingredient.id,
      });
    }
    if (
      ingredient.quantity.scalable &&
      ingredient.quantity.value === undefined
    ) {
      issues.push({
        code: "ingredient-amount",
        message: `${ingredient.name || "An ingredient"} needs a numeric amount.`,
        path: ingredient.id,
      });
    }
  }

  for (const step of recipe.steps) {
    if (allIds.has(step.id)) {
      issues.push({
        code: "duplicate-id",
        message: "Every ingredient and operation needs a unique ID.",
      });
    }
    allIds.add(step.id);
    stepIds.add(step.id);
    if (!step.label.trim()) {
      issues.push({
        code: "step-label",
        message: "Every operation needs an action label.",
        path: step.id,
      });
    }
    if (step.inputs.length === 0) {
      issues.push({
        code: "step-input",
        message: `${step.label || "An operation"} needs at least one input.`,
        path: step.id,
      });
    }
    if (new Set(step.inputs.map((input) => input.id)).size !== step.inputs.length) {
      issues.push({
        code: "duplicate-input",
        message: `${step.label || "An operation"} uses the same input twice.`,
        path: step.id,
      });
    }
  }

  if (!stepIds.has(recipe.finalStepId)) {
    issues.push({
      code: "final-step",
      message: "Choose which operation produces the final dish.",
    });
  }

  const consumerCounts = new Map<string, number>();
  for (const id of allIds) consumerCounts.set(id, 0);

  for (const step of recipe.steps) {
    for (const input of step.inputs) {
      const exists =
        input.kind === "ingredient"
          ? ingredientIds.has(input.id)
          : stepIds.has(input.id);
      if (!exists) {
        issues.push({
          code: "missing-input",
          message: `${step.label || "An operation"} references an input that no longer exists.`,
          path: step.id,
        });
        continue;
      }
      if (input.id === step.id) {
        issues.push({
          code: "self-input",
          message: "An operation cannot use itself as an input.",
          path: step.id,
        });
      }
      consumerCounts.set(input.id, (consumerCounts.get(input.id) ?? 0) + 1);
    }
  }

  for (const ingredient of recipe.ingredients) {
    const count = consumerCounts.get(ingredient.id) ?? 0;
    if (count === 0) {
      issues.push({
        code: "unused-ingredient",
        message: `${ingredient.name || "An ingredient"} is not used by an operation.`,
        path: ingredient.id,
      });
    } else if (count > 1) {
      issues.push({
        code: "reused-input",
        message: `${ingredient.name || "An ingredient"} is used more than once. Split it into separate quantities.`,
        path: ingredient.id,
      });
    }
  }

  for (const step of recipe.steps) {
    const count = consumerCounts.get(step.id) ?? 0;
    if (step.id === recipe.finalStepId && count > 0) {
      issues.push({
        code: "consumed-final",
        message: "The selected final operation is consumed by another operation.",
        path: step.id,
      });
    } else if (step.id !== recipe.finalStepId && count === 0) {
      issues.push({
        code: "orphan-step",
        message: `${step.label || "An operation"} does not flow into the final dish.`,
        path: step.id,
      });
    } else if (count > 1) {
      issues.push({
        code: "reused-step",
        message: `${step.label || "An operation"} feeds more than one later operation.`,
        path: step.id,
      });
    }
  }

  const stepById = new Map(recipe.steps.map((step) => [step.id, step]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  let hasCycle = false;

  function visit(stepId: string) {
    if (visiting.has(stepId)) {
      hasCycle = true;
      return;
    }
    if (visited.has(stepId)) return;
    const step = stepById.get(stepId);
    if (!step) return;
    visiting.add(stepId);
    for (const input of step.inputs) {
      if (input.kind === "step") visit(input.id);
    }
    visiting.delete(stepId);
    visited.add(stepId);
  }

  visit(recipe.finalStepId);
  if (hasCycle) {
    issues.push({
      code: "cycle",
      message: "Operations cannot form a circular dependency.",
    });
  }
  if (visited.size !== recipe.steps.length && recipe.steps.length > 0) {
    issues.push({
      code: "disconnected",
      message: "Every operation must connect to the final dish.",
    });
  }

  return uniqueIssues(issues);
}

function uniqueIssues(issues: ValidationIssue[]): ValidationIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.path ?? ""}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildRecipeGraph(recipe: RecipeDocumentV1): RecipeGraph | null {
  if (validateRecipe(recipe).length > 0) return null;

  const ingredientById = new Map(
    recipe.ingredients.map((ingredient) => [ingredient.id, ingredient]),
  );
  const stepById = new Map(recipe.steps.map((step) => [step.id, step]));
  const ingredientOrder: Ingredient[] = [];
  const stepOrder: RecipeStep[] = [];
  const stepDepths = new Map<string, number>();
  const stepRanges = new Map<string, LeafRange>();
  const consumers = new Map<string, string>();

  for (const step of recipe.steps) {
    for (const input of step.inputs) consumers.set(input.id, step.id);
  }

  function walk(ref: NodeRef): LeafRange {
    if (ref.kind === "ingredient") {
      const ingredient = ingredientById.get(ref.id)!;
      const index = ingredientOrder.length;
      ingredientOrder.push(ingredient);
      return { start: index, end: index };
    }

    const step = stepById.get(ref.id)!;
    const ranges = step.inputs.map(walk);
    const range = {
      start: Math.min(...ranges.map((item) => item.start)),
      end: Math.max(...ranges.map((item) => item.end)),
    };
    stepRanges.set(step.id, range);
    stepOrder.push(step);
    return range;
  }

  walk({ kind: "step", id: recipe.finalStepId });

  function getDepth(stepId: string): number {
    const cached = stepDepths.get(stepId);
    if (cached) return cached;
    const step = stepById.get(stepId)!;
    const depth =
      1 +
      Math.max(
        0,
        ...step.inputs.map((input) =>
          input.kind === "step" ? getDepth(input.id) : 0,
        ),
      );
    stepDepths.set(stepId, depth);
    return depth;
  }

  const maxDepth = getDepth(recipe.finalStepId);
  for (const step of recipe.steps) getDepth(step.id);

  return {
    recipe,
    ingredientOrder,
    stepOrder,
    stepDepths,
    stepRanges,
    consumers,
    maxDepth,
  };
}

export function cloneRecipe(
  recipe: RecipeDocumentV1,
  title = `${recipe.title} copy`,
): RecipeDocumentV1 {
  const idMap = new Map<string, string>();
  for (const ingredient of recipe.ingredients) {
    idMap.set(ingredient.id, makeId("ingredient"));
  }
  for (const step of recipe.steps) {
    idMap.set(step.id, makeId("step"));
  }

  return {
    ...recipe,
    id: makeId("recipe"),
    title,
    ingredients: recipe.ingredients.map((ingredient) => ({
      ...ingredient,
      id: idMap.get(ingredient.id)!,
      quantity: { ...ingredient.quantity },
    })),
    steps: recipe.steps.map((step) => ({
      ...step,
      id: idMap.get(step.id)!,
      inputs: step.inputs.map((input) => ({
        ...input,
        id: idMap.get(input.id) ?? input.id,
      })),
    })),
    finalStepId: idMap.get(recipe.finalStepId) ?? "",
    prepNotes: [...recipe.prepNotes],
  };
}

export function createBlankRecipe(): RecipeDocumentV1 {
  return {
    schemaVersion: 1,
    id: makeId("recipe"),
    title: "Untitled recipe",
    baseServings: 4,
    outputLabel: "",
    prepNotes: [],
    ingredients: [],
    steps: [],
    finalStepId: "",
  };
}
