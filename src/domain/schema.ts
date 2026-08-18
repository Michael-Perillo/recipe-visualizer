import { z } from "zod";
import { RECIPE_LIMITS } from "./limits";

const nodeRefSchema = z.object({
  kind: z.enum(["ingredient", "step"]),
  id: z.string().min(1).max(RECIPE_LIMITS.title),
});

const quantitySchema = z.object({
  value: z
    .number()
    .finite()
    .nonnegative()
    .max(RECIPE_LIMITS.amount)
    .optional(),
  unit: z.string().max(RECIPE_LIMITS.shortText).optional(),
  text: z.string().max(RECIPE_LIMITS.longText).optional(),
  scalable: z.boolean(),
});

const measurementSchema = z.object({
  value: z.number().finite().nonnegative().max(RECIPE_LIMITS.amount),
  unit: z.string().max(RECIPE_LIMITS.shortText),
});

const ingredientSchema = z.object({
  id: z.string().min(1).max(RECIPE_LIMITS.title),
  name: z.string().max(RECIPE_LIMITS.ingredientName),
  quantity: quantitySchema,
  alternateMeasurements: z
    .array(measurementSchema)
    .max(RECIPE_LIMITS.alternateMeasurements)
    .optional(),
  note: z.string().max(RECIPE_LIMITS.longText).optional(),
  visualStyle: z.enum(["auto", "dry", "liquid", "featured", "neutral"]),
});

const recipeStepSchema = z.object({
  id: z.string().min(1).max(RECIPE_LIMITS.title),
  label: z.string().max(RECIPE_LIMITS.stepLabel),
  details: z.string().max(RECIPE_LIMITS.longText).optional(),
  inputs: z.array(nodeRefSchema).max(RECIPE_LIMITS.ingredients),
  durationMinutes: z
    .number()
    .finite()
    .nonnegative()
    .max(RECIPE_LIMITS.durationMinutes)
    .optional(),
  temperature: z.string().max(RECIPE_LIMITS.shortText).optional(),
});

export const recipeDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1).max(RECIPE_LIMITS.title),
  title: z.string().max(RECIPE_LIMITS.title),
  baseServings: z
    .number()
    .finite()
    .positive()
    .max(RECIPE_LIMITS.servings),
  outputLabel: z.string().max(RECIPE_LIMITS.outputLabel),
  prepNotes: z
    .array(z.string().max(RECIPE_LIMITS.longText))
    .max(RECIPE_LIMITS.prepNotes),
  ingredients: z.array(ingredientSchema).max(RECIPE_LIMITS.ingredients),
  steps: z.array(recipeStepSchema).max(RECIPE_LIMITS.steps),
  finalStepId: z.string().max(RECIPE_LIMITS.title),
});

export const persistedLibrarySchema = z.object({
  schemaVersion: z.literal(1),
  activeRecipeId: z.string().max(RECIPE_LIMITS.title),
  recipes: z
    .array(recipeDocumentSchema)
    .min(1)
    .max(RECIPE_LIMITS.recipes),
  view: z.enum(["matrix", "flow"]),
  theme: z.enum(["light", "dark"]),
  servingsByRecipe: z.record(
    z.string(),
    z.number().finite().positive().max(RECIPE_LIMITS.servings),
  ),
  updatedAt: z.number().finite().nonnegative().optional(),
  originId: z.string().max(RECIPE_LIMITS.title).optional(),
});
