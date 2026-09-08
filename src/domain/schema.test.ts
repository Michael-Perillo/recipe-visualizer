import { describe, expect, it } from "vitest";
import { DEFAULT_RECIPE } from "../data/defaultRecipe";
import {
  persistedLibrarySchema,
  recipeDocumentSchema,
} from "./schema";

describe("recipe document compatibility", () => {
  it("accepts legacy v1 documents without alternate measurements", () => {
    const legacy = {
      ...DEFAULT_RECIPE,
      ingredients: DEFAULT_RECIPE.ingredients.map((ingredient) => {
        const legacyIngredient = { ...ingredient };
        delete legacyIngredient.alternateMeasurements;
        delete legacyIngredient.featured;
        return legacyIngredient;
      }),
      steps: DEFAULT_RECIPE.steps.map((step, index) => {
        const legacyStep = { ...step };
        delete legacyStep.timing;
        delete legacyStep.tool;
        delete legacyStep.setting;
        delete legacyStep.cue;
        return index === 5
          ? { ...legacyStep, durationMinutes: 35 }
          : legacyStep;
      }),
    };

    expect(recipeDocumentSchema.safeParse(legacy).success).toBe(true);
  });

  it("accepts valid structured timing in seconds, minutes, and hours", () => {
    for (const timing of [
      { minimum: 30, unit: "seconds" as const },
      { minimum: 1, maximum: 2, unit: "minutes" as const },
      { minimum: 1.5, unit: "hours" as const },
    ]) {
      const recipe = {
        ...DEFAULT_RECIPE,
        steps: DEFAULT_RECIPE.steps.map((step, index) =>
          index === 0 ? { ...step, timing } : step,
        ),
      };
      expect(recipeDocumentSchema.safeParse(recipe).success).toBe(true);
    }
  });

  it("rejects reversed, non-finite, excessive, and overlong instruction data", () => {
    const invalidTimings = [
      { minimum: 2, maximum: 1, unit: "minutes" as const },
      { minimum: Number.POSITIVE_INFINITY, unit: "seconds" as const },
      { minimum: 200, unit: "hours" as const },
    ];

    for (const timing of invalidTimings) {
      const recipe = {
        ...DEFAULT_RECIPE,
        steps: DEFAULT_RECIPE.steps.map((step, index) =>
          index === 0 ? { ...step, timing } : step,
        ),
      };
      expect(recipeDocumentSchema.safeParse(recipe).success).toBe(false);
    }

    const overlong = {
      ...DEFAULT_RECIPE,
      steps: DEFAULT_RECIPE.steps.map((step, index) =>
        index === 0 ? { ...step, tool: "x".repeat(41) } : step,
      ),
    };
    expect(recipeDocumentSchema.safeParse(overlong).success).toBe(false);
  });

  it("canonicalizes structured timing over a conflicting legacy duration", () => {
    const recipe = {
      ...DEFAULT_RECIPE,
      steps: DEFAULT_RECIPE.steps.map((step, index) =>
        index === 0
          ? { ...step, durationMinutes: Number.POSITIVE_INFINITY }
          : step,
      ),
    };
    const parsed = recipeDocumentSchema.safeParse(recipe);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.steps[0].timing).toEqual({
        minimum: 30,
        unit: "seconds",
      });
      expect(parsed.data.steps[0].durationMinutes).toBeUndefined();
    }
  });

  it("accepts legacy persisted libraries without synchronization metadata", () => {
    const legacyLibrary = {
      schemaVersion: 1,
      activeRecipeId: DEFAULT_RECIPE.id,
      recipes: [DEFAULT_RECIPE],
      view: "flow",
      theme: "light",
      servingsByRecipe: { [DEFAULT_RECIPE.id]: 4 },
    };

    expect(persistedLibrarySchema.safeParse(legacyLibrary).success).toBe(true);
  });
});
