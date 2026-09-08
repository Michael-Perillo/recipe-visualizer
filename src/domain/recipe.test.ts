import { describe, expect, it } from "vitest";
import { DEFAULT_RECIPE } from "../data/defaultRecipe";
import {
  buildRecipeGraph,
  formatAlternateMeasurements,
  formatAmount,
  formatIngredientQuantity,
  formatStepTiming,
  formatTiming,
  isIngredientFeatured,
  normalizeRecipeStepOrder,
  resolveIngredientStyle,
  scaleIngredient,
  validateRecipe,
} from "./recipe";
import type { Ingredient, RecipeDocumentV1 } from "./types";

describe("quantity formatting and scaling", () => {
  it("formats common kitchen fractions", () => {
    expect(formatAmount(1 / 3)).toBe("1/3");
    expect(formatAmount(0.375)).toBe("3/8");
    expect(formatAmount(1.5)).toBe("1 1/2");
    expect(formatAmount(2)).toBe("2");
  });

  it("scales only numeric scalable quantities", () => {
    const ingredient: Ingredient = {
      id: "flour",
      name: "flour",
      quantity: { value: 0.5, unit: "cup", scalable: true },
      alternateMeasurements: [{ value: 80, unit: "g" }],
      visualStyle: "auto",
    };
    const scaled = scaleIngredient(ingredient, 4, 6);
    expect(scaled.quantity.value).toBe(0.75);
    expect(formatIngredientQuantity(scaled)).toBe("3/4 cup");
    expect(scaled.alternateMeasurements?.[0].value).toBe(120);
    expect(formatAlternateMeasurements(scaled)).toBe("120 g");

    const salt: Ingredient = {
      id: "salt",
      name: "salt",
      quantity: { text: "to taste", scalable: false },
      visualStyle: "auto",
    };
    expect(scaleIngredient(salt, 4, 6)).toBe(salt);
    expect(formatIngredientQuantity(salt)).toBe("to taste");
  });

  it("renders scaled alternate conversions as compact decimals", () => {
    const butter = scaleIngredient(
      DEFAULT_RECIPE.ingredients[0],
      DEFAULT_RECIPE.baseServings,
      2,
    );

    expect(formatIngredientQuantity(butter)).toBe("2 oz");
    expect(formatAlternateMeasurements(butter)).toBe("57.5 g");
  });
});

describe("operation timing", () => {
  it("formats exact and ranged timings in every supported unit", () => {
    expect(formatTiming({ minimum: 30, unit: "seconds" })).toBe("30 sec");
    expect(
      formatTiming({ minimum: 1, maximum: 2, unit: "minutes" }),
    ).toBe("1–2 min");
    expect(formatTiming({ minimum: 1.5, unit: "hours" })).toBe("1.5 hr");
  });

  it("prefers structured timing and falls back to legacy minutes", () => {
    const step = DEFAULT_RECIPE.steps[0];
    expect(formatStepTiming(step)).toBe("30 sec");
    expect(
      formatStepTiming({ ...step, timing: undefined, durationMinutes: 12 }),
    ).toBe("12 min");
    expect(
      formatStepTiming({ ...step, durationMinutes: 99 }),
    ).toBe("30 sec");
  });
});

describe("ingredient style inference", () => {
  const ingredient = (
    name: string,
    unit = "",
    visualStyle: Ingredient["visualStyle"] = "auto",
  ): Ingredient => ({
    id: name,
    name,
    quantity: { value: 1, unit, scalable: true },
    visualStyle,
  });

  it("infers semantic line styles and honors overrides", () => {
    expect(resolveIngredientStyle(ingredient("bread flour"))).toBe("dry");
    expect(resolveIngredientStyle(ingredient("whole milk"))).toBe("liquid");
    expect(resolveIngredientStyle(ingredient("cocoa powder"))).toBe("dry");
    expect(resolveIngredientStyle(ingredient("espresso"))).toBe("liquid");
    expect(resolveIngredientStyle(ingredient("mushrooms"))).toBe("neutral");
    expect(resolveIngredientStyle(ingredient("milk", "", "dry"))).toBe("dry");
    const legacyFeatured = ingredient("cocoa powder", "", "featured");
    expect(resolveIngredientStyle(legacyFeatured)).toBe("dry");
    expect(isIngredientFeatured(legacyFeatured)).toBe(true);
    expect(
      isIngredientFeatured({ ...ingredient("cocoa powder"), featured: true }),
    ).toBe(true);
  });
});

describe("recipe graph validation and layout", () => {
  it("accepts and resolves the default recipe", () => {
    expect(validateRecipe(DEFAULT_RECIPE)).toEqual([]);
    const graph = buildRecipeGraph(DEFAULT_RECIPE);
    expect(graph).not.toBeNull();
    expect(graph?.maxDepth).toBe(6);
    expect(graph?.ingredientOrder.map((ingredient) => ingredient.id)).toEqual([
      "ingredient-flour",
      "ingredient-cocoa",
      "ingredient-soda",
      "ingredient-salt",
      "ingredient-butter",
      "ingredient-sugar",
      "ingredient-espresso",
      "ingredient-eggs",
      "ingredient-vanilla",
    ]);
    expect(graph?.stepOrder.map((step) => step.id)).toEqual([
      "step-whisk-dry",
      "step-melt",
      "step-whisk-sugar",
      "step-whisk-eggs",
      "step-fold",
      "step-bake",
      "step-cool",
    ]);
    expect(
      DEFAULT_RECIPE.steps.find((step) => step.id === "step-fold")?.inputs,
    ).toEqual([
      { kind: "step", id: "step-whisk-dry" },
      { kind: "step", id: "step-whisk-eggs" },
    ]);
    expect(graph?.stepRanges.get("step-bake")).toEqual({ start: 0, end: 8 });
  });

  it("detects reused and disconnected inputs", () => {
    const recipe: RecipeDocumentV1 = {
      ...DEFAULT_RECIPE,
      steps: DEFAULT_RECIPE.steps.map((step, index) =>
        index === 1
          ? {
              ...step,
              inputs: [
                ...step.inputs,
                { kind: "ingredient", id: "ingredient-butter" },
              ],
            }
          : step,
      ),
    };
    expect(validateRecipe(recipe).some((issue) => issue.code === "reused-input")).toBe(
      true,
    );
    expect(buildRecipeGraph(recipe)).toBeNull();
  });

  it("detects circular operation dependencies", () => {
    const recipe: RecipeDocumentV1 = {
      schemaVersion: 1,
      id: "cycle",
      title: "Cycle",
      baseServings: 2,
      outputLabel: "nothing",
      prepNotes: [],
      ingredients: [],
      steps: [
        {
          id: "a",
          label: "A",
          inputs: [{ kind: "step", id: "b" }],
        },
        {
          id: "b",
          label: "B",
          inputs: [{ kind: "step", id: "a" }],
        },
      ],
      finalStepId: "a",
    };
    expect(validateRecipe(recipe).some((issue) => issue.code === "cycle")).toBe(
      true,
    );
  });

  it("rejects invalid numeric values before persistence", () => {
    const recipe: RecipeDocumentV1 = {
      ...DEFAULT_RECIPE,
      ingredients: DEFAULT_RECIPE.ingredients.map((ingredient, index) =>
        index === 0
          ? {
              ...ingredient,
              quantity: { ...ingredient.quantity, value: -1 },
            }
          : ingredient,
      ),
      steps: DEFAULT_RECIPE.steps.map((step, index) =>
        index === 0
          ? {
              ...step,
              timing: undefined,
              durationMinutes: Number.POSITIVE_INFINITY,
            }
          : step,
      ),
    };

    const codes = validateRecipe(recipe).map((issue) => issue.code);
    expect(codes).toContain("ingredient-amount-range");
    expect(codes).toContain("duration-range");
    expect(buildRecipeGraph(recipe)).toBeNull();
  });

  it("normalizes valid imported steps into dependency-first order", () => {
    const reversed: RecipeDocumentV1 = {
      ...DEFAULT_RECIPE,
      steps: [...DEFAULT_RECIPE.steps].reverse(),
    };

    expect(validateRecipe(reversed)).toEqual([]);
    expect(normalizeRecipeStepOrder(reversed).steps.map((step) => step.id)).toEqual(
      DEFAULT_RECIPE.steps.map((step) => step.id),
    );
  });

  it("canonicalizes structured timing over legacy minutes", () => {
    const recipe: RecipeDocumentV1 = {
      ...DEFAULT_RECIPE,
      steps: DEFAULT_RECIPE.steps.map((step, index) =>
        index === 0 ? { ...step, durationMinutes: 90 } : step,
      ),
    };

    const normalized = normalizeRecipeStepOrder(recipe);
    expect(normalized.steps[0].timing).toEqual({
      minimum: 30,
      unit: "seconds",
    });
    expect(normalized.steps[0].durationMinutes).toBeUndefined();
  });
});
