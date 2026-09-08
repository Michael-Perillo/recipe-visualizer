export const RECIPE_LIMITS = {
  recipes: 50,
  ingredients: 40,
  steps: 24,
  prepNotes: 8,
  alternateMeasurements: 2,
  importBytes: 1_000_000,
  title: 100,
  outputLabel: 100,
  ingredientName: 100,
  stepLabel: 100,
  longText: 240,
  shortText: 40,
  amount: 1_000_000_000,
  servings: 10_000,
  durationMinutes: 10_080,
} as const;

export const TIMING_UNIT_MINUTES = {
  seconds: 1 / 60,
  minutes: 1,
  hours: 60,
} as const;

export function normalizeBoundedNumber(
  value: number | string,
  minimum: number,
  maximum: number,
): number | undefined {
  if (value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  if (
    !Number.isFinite(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    return undefined;
  }
  return parsed;
}

export function normalizeAmount(
  value: number | string,
): number | undefined {
  return normalizeBoundedNumber(value, 0, RECIPE_LIMITS.amount);
}

export function normalizeDuration(
  value: number | string,
): number | undefined {
  return normalizeBoundedNumber(value, 0, RECIPE_LIMITS.durationMinutes);
}

export function normalizeTimingValue(
  value: number | string,
  unit: keyof typeof TIMING_UNIT_MINUTES,
): number | undefined {
  const maximum = RECIPE_LIMITS.durationMinutes / TIMING_UNIT_MINUTES[unit];
  return normalizeBoundedNumber(value, 0.01, maximum);
}

export function normalizeServings(
  value: number | string,
): number | undefined {
  return normalizeBoundedNumber(value, 1, RECIPE_LIMITS.servings);
}
