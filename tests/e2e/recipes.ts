import type {
  PersistedLibraryV1,
  RecipeDocumentV1,
} from "../../src/domain/types";

export const MINIMAL_RECIPE: RecipeDocumentV1 = {
  schemaVersion: 1,
  id: "recipe-minimal-toast",
  title: "One-slice toast",
  baseServings: 1,
  outputLabel: "toast",
  prepNotes: [],
  ingredients: [
    {
      id: "ingredient-bread",
      name: "bread",
      quantity: { value: 1, unit: "slice", scalable: true },
      alternateMeasurements: [{ value: 30, unit: "g" }],
      visualStyle: "dry",
    },
  ],
  steps: [
    {
      id: "step-toast",
      label: "Toast",
      inputs: [{ kind: "ingredient", id: "ingredient-bread" }],
    },
  ],
  finalStepId: "step-toast",
};

const deepIngredients = Array.from({ length: 8 }, (_, index) => ({
  id: `ingredient-deep-${index + 1}`,
  name:
    index === 0
      ? "slowly toasted aromatic seed mixture with a deliberately long name"
      : `layer ingredient ${index + 1}`,
  quantity: { value: index + 1, unit: "tbsp", scalable: true },
  alternateMeasurements: [{ value: (index + 1) * 12, unit: "g" }],
  note: index === 0 ? "Keep separate until the first operation" : undefined,
  visualStyle: "auto" as const,
}));

const deepSteps = Array.from({ length: 8 }, (_, index) => ({
  id: `step-deep-${index + 1}`,
  label: index === 7 ? "Finish and plate" : `Transform layer ${index + 1}`,
  details: "Work carefully until the texture is even and fully combined.",
  inputs:
    index === 0
      ? [{ kind: "ingredient" as const, id: deepIngredients[0].id }]
      : [
          { kind: "step" as const, id: `step-deep-${index}` },
          { kind: "ingredient" as const, id: deepIngredients[index].id },
        ],
}));

export const DEEP_RECIPE: RecipeDocumentV1 = {
  schemaVersion: 1,
  id: "recipe-deep-layout",
  title:
    "Layered pantry supper with a long but bounded title for resilient diagram testing",
  baseServings: 4,
  outputLabel: "layered pantry supper",
  prepNotes: [
    "Arrange every measured ingredient before beginning the first operation.",
    "Use a wide work surface so each preparation remains easy to identify.",
  ],
  ingredients: deepIngredients,
  steps: deepSteps,
  finalStepId: "step-deep-8",
};

export function persistedLibraryFor(
  recipe: RecipeDocumentV1,
): PersistedLibraryV1 {
  return {
    schemaVersion: 1,
    activeRecipeId: recipe.id,
    recipes: [recipe],
    view: "flow",
    theme: "light",
    servingsByRecipe: { [recipe.id]: recipe.baseServings },
    updatedAt: 1,
    originId: "e2e-fixture",
  };
}
