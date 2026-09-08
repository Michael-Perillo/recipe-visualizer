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

const boundedMethod = Array.from(
  { length: 30 },
  () => "Work carefully until the texture is even and fully combined.",
)
  .join(" ")
  .slice(0, 240);
const boundedCue = Array.from(
  { length: 35 },
  () => "Look for a clearly defined visual change before continuing.",
)
  .join(" ")
  .slice(0, 240);
const boundedPrepNote = Array.from(
  { length: 30 },
  () => "Arrange each measured ingredient before beginning the first operation.",
)
  .join(" ")
  .slice(0, 240);

const deepSteps = Array.from({ length: 8 }, (_, index) => ({
  id: `step-deep-${index + 1}`,
  label: index === 7 ? "Finish and plate" : `Transform layer ${index + 1}`,
  details:
    index === 0
      ? boundedMethod
      : "Work carefully until the texture is even and fully combined.",
  timing: {
    minimum: index + 1,
    maximum: index + 2,
    unit: "minutes" as const,
  },
  tool: "Wide mixing bowl",
  setting: index % 2 === 0 ? "Gentle" : "Brisk",
  cue:
    index === 0
      ? boundedCue
      : "Continue when the texture is even and fully combined.",
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
    boundedPrepNote,
    "Use a wide work surface so each preparation remains easy to identify.",
    "Keep a clean towel and heat-safe resting place within reach before starting.",
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
