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
        return legacyIngredient;
      }),
    };

    expect(recipeDocumentSchema.safeParse(legacy).success).toBe(true);
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
