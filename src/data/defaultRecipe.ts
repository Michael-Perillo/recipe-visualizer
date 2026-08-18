import type { RecipeDocumentV1 } from "../domain/types";

export const DEFAULT_RECIPE: RecipeDocumentV1 = {
  schemaVersion: 1,
  id: "recipe-espresso-brownies",
  title: "Espresso Brownies",
  baseServings: 4,
  outputLabel: "fudgy brownies",
  prepNotes: [
    "Butter and flour an 8×8-in pan",
    "Preheat oven to 350°F (170°C)",
  ],
  ingredients: [
    {
      id: "ingredient-butter",
      name: "unsalted butter",
      quantity: { value: 4, unit: "oz", scalable: true },
      alternateMeasurements: [{ value: 115, unit: "g" }],
      visualStyle: "liquid",
    },
    {
      id: "ingredient-sugar",
      name: "sugar",
      quantity: { value: 1, unit: "cup", scalable: true },
      alternateMeasurements: [{ value: 200, unit: "g" }],
      visualStyle: "dry",
    },
    {
      id: "ingredient-vanilla",
      name: "vanilla extract",
      quantity: { value: 0.25, unit: "tsp", scalable: true },
      alternateMeasurements: [{ value: 2.5, unit: "mL" }],
      visualStyle: "liquid",
    },
    {
      id: "ingredient-espresso",
      name: "fresh brewed espresso",
      quantity: { value: 1, unit: "shot", scalable: true },
      alternateMeasurements: [
        { value: 4, unit: "Tbsp" },
        { value: 60, unit: "mL" },
      ],
      visualStyle: "featured",
    },
    {
      id: "ingredient-eggs",
      name: "large eggs",
      quantity: { value: 2, unit: "", scalable: true },
      alternateMeasurements: [{ value: 100, unit: "g" }],
      visualStyle: "liquid",
    },
    {
      id: "ingredient-flour",
      name: "all-purpose flour",
      quantity: { value: 0.5, unit: "cup", scalable: true },
      alternateMeasurements: [{ value: 80, unit: "g" }],
      visualStyle: "dry",
    },
    {
      id: "ingredient-cocoa",
      name: "cocoa powder",
      quantity: { value: 1 / 3, unit: "cup", scalable: true },
      alternateMeasurements: [{ value: 80, unit: "g" }],
      visualStyle: "featured",
    },
    {
      id: "ingredient-soda",
      name: "baking soda",
      quantity: { value: 0.25, unit: "tsp", scalable: true },
      alternateMeasurements: [{ value: 1.3, unit: "g" }],
      visualStyle: "dry",
    },
    {
      id: "ingredient-salt",
      name: "table salt",
      quantity: { value: 0.25, unit: "tsp", scalable: true },
      alternateMeasurements: [{ value: 1.5, unit: "g" }],
      visualStyle: "dry",
    },
  ],
  steps: [
    {
      id: "step-melt",
      label: "Melt",
      details: "Melt gently until glossy",
      inputs: [
        { kind: "ingredient", id: "ingredient-butter" },
        { kind: "ingredient", id: "ingredient-vanilla" },
        { kind: "ingredient", id: "ingredient-espresso" },
      ],
    },
    {
      id: "step-mix-sugar",
      label: "Mix",
      details: "Whisk until the sugar dissolves",
      inputs: [
        { kind: "step", id: "step-melt" },
        { kind: "ingredient", id: "ingredient-sugar" },
      ],
    },
    {
      id: "step-mix-eggs",
      label: "Mix",
      details: "Beat in the eggs",
      inputs: [
        { kind: "step", id: "step-mix-sugar" },
        { kind: "ingredient", id: "ingredient-eggs" },
      ],
    },
    {
      id: "step-fold",
      label: "Fold in",
      details: "Stop when no dry streaks remain",
      inputs: [
        { kind: "step", id: "step-mix-eggs" },
        { kind: "ingredient", id: "ingredient-flour" },
        { kind: "ingredient", id: "ingredient-cocoa" },
        { kind: "ingredient", id: "ingredient-soda" },
        { kind: "ingredient", id: "ingredient-salt" },
      ],
    },
    {
      id: "step-bake",
      label: "Bake",
      details: "Cool before slicing",
      inputs: [{ kind: "step", id: "step-fold" }],
      durationMinutes: 35,
      temperature: "350°F / 170°C",
    },
  ],
  finalStepId: "step-bake",
};
