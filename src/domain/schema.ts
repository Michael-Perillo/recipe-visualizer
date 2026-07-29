import { z } from "zod";

const nodeRefSchema = z.object({
  kind: z.enum(["ingredient", "step"]),
  id: z.string().min(1),
});

const quantitySchema = z.object({
  value: z.number().finite().nonnegative().optional(),
  unit: z.string().optional(),
  text: z.string().optional(),
  scalable: z.boolean(),
});

const ingredientSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  quantity: quantitySchema,
  note: z.string().optional(),
  visualStyle: z.enum(["auto", "dry", "liquid", "featured", "neutral"]),
});

const recipeStepSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  details: z.string().optional(),
  inputs: z.array(nodeRefSchema),
  durationMinutes: z.number().finite().nonnegative().optional(),
  temperature: z.string().optional(),
});

export const recipeDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  title: z.string(),
  baseServings: z.number().finite().positive(),
  outputLabel: z.string(),
  prepNotes: z.array(z.string()),
  ingredients: z.array(ingredientSchema),
  steps: z.array(recipeStepSchema),
  finalStepId: z.string(),
});

export const persistedLibrarySchema = z.object({
  schemaVersion: z.literal(1),
  activeRecipeId: z.string(),
  recipes: z.array(recipeDocumentSchema).min(1),
  view: z.enum(["matrix", "flow"]),
  theme: z.enum(["light", "dark"]),
  servingsByRecipe: z.record(z.string(), z.number().finite().positive()),
});
