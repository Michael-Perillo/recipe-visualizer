import { describe, expect, it } from "vitest";
import { DEFAULT_RECIPE } from "../data/defaultRecipe";
import {
  buildRecipeGraph,
  formatAmount,
  formatIngredientQuantity,
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
      visualStyle: "auto",
    };
    const scaled = scaleIngredient(ingredient, 4, 6);
    expect(scaled.quantity.value).toBe(0.75);
    expect(formatIngredientQuantity(scaled)).toBe("3/4 cup");

    const salt: Ingredient = {
      id: "salt",
      name: "salt",
      quantity: { text: "to taste", scalable: false },
      visualStyle: "auto",
    };
    expect(scaleIngredient(salt, 4, 6)).toBe(salt);
    expect(formatIngredientQuantity(salt)).toBe("to taste");
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
    expect(resolveIngredientStyle(ingredient("cocoa powder"))).toBe("featured");
    expect(resolveIngredientStyle(ingredient("mushrooms"))).toBe("neutral");
    expect(resolveIngredientStyle(ingredient("milk", "", "dry"))).toBe("dry");
  });
});

describe("recipe graph validation and layout", () => {
  it("accepts and resolves the default recipe", () => {
    expect(validateRecipe(DEFAULT_RECIPE)).toEqual([]);
    const graph = buildRecipeGraph(DEFAULT_RECIPE);
    expect(graph).not.toBeNull();
    expect(graph?.maxDepth).toBe(5);
    expect(graph?.ingredientOrder.map((ingredient) => ingredient.id)).toEqual([
      "ingredient-butter",
      "ingredient-vanilla",
      "ingredient-espresso",
      "ingredient-sugar",
      "ingredient-eggs",
      "ingredient-flour",
      "ingredient-cocoa",
      "ingredient-soda",
      "ingredient-salt",
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
});
