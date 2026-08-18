import {
  ArrowDownToLine,
  ChefHat,
  CirclePlus,
  Flame,
  GitMerge,
  GripVertical,
  ListTree,
  Trash2,
} from "lucide-react";
import {
  RECIPE_LIMITS,
  normalizeAmount,
  normalizeDuration,
  normalizeServings,
} from "../domain/limits";
import { makeId, validateRecipe } from "../domain/recipe";
import type {
  Ingredient,
  IngredientStyle,
  NodeRef,
  RecipeDocumentV1,
  RecipeStep,
} from "../domain/types";
import { INGREDIENT_STYLE_LABELS } from "../domain/types";
import { useAppState } from "../state/AppState";

const fieldClass =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-semibold text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-lime-500 focus:ring-4 focus:ring-lime-400/20 dark:border-white/10 dark:bg-white/[0.055] dark:text-stone-50 dark:placeholder:text-stone-600";
const labelClass =
  "mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.14em] text-stone-600 dark:text-stone-400";

function SectionHeading({
  icon,
  title,
  eyebrow,
}: {
  icon: React.ReactNode;
  title: string;
  eyebrow: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-lime-300 text-stone-950">
        {icon}
      </span>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-stone-600 dark:text-stone-400">
          {eyebrow}
        </p>
        <h2 className="text-base font-extrabold tracking-tight">{title}</h2>
      </div>
    </div>
  );
}

function updateIngredientInRecipe(
  recipe: RecipeDocumentV1,
  ingredientId: string,
  updater: (ingredient: Ingredient) => Ingredient,
): RecipeDocumentV1 {
  return {
    ...recipe,
    ingredients: recipe.ingredients.map((ingredient) =>
      ingredient.id === ingredientId ? updater(ingredient) : ingredient,
    ),
  };
}

function updateStepInRecipe(
  recipe: RecipeDocumentV1,
  stepId: string,
  updater: (step: RecipeStep) => RecipeStep,
): RecipeDocumentV1 {
  return {
    ...recipe,
    steps: recipe.steps.map((step) =>
      step.id === stepId ? updater(step) : step,
    ),
  };
}

function IngredientEditor({
  ingredient,
  index,
  recipe,
  onChange,
}: {
  ingredient: Ingredient;
  index: number;
  recipe: RecipeDocumentV1;
  onChange: (recipe: RecipeDocumentV1) => void;
}) {
  const setIngredient = (updater: (value: Ingredient) => Ingredient) =>
    onChange(updateIngredientInRecipe(recipe, ingredient.id, updater));

  const removeIngredient = () => {
    onChange({
      ...recipe,
      ingredients: recipe.ingredients.filter(
        (candidate) => candidate.id !== ingredient.id,
      ),
      steps: recipe.steps.map((step) => ({
        ...step,
        inputs: step.inputs.filter((input) => input.id !== ingredient.id),
      })),
    });
  };

  return (
    <article className="rounded-2xl border border-black/[0.07] bg-white/80 p-3 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.035]">
      <div className="mb-3 flex items-center gap-2">
        <GripVertical
          className="size-4 text-stone-300 dark:text-stone-600"
          aria-hidden="true"
        />
        <span className="text-xs font-extrabold text-stone-600 dark:text-stone-400">
          {String(index + 1).padStart(2, "0")}
        </span>
        <input
          aria-label={`Ingredient ${index + 1} name`}
          className={`${fieldClass} min-w-0 flex-1`}
          value={ingredient.name}
          maxLength={RECIPE_LIMITS.ingredientName}
          placeholder="Ingredient name"
          onChange={(event) =>
            setIngredient((value) => ({ ...value, name: event.target.value }))
          }
        />
        <button
          type="button"
          aria-label={`Remove ${ingredient.name || `ingredient ${index + 1}`}`}
          className="grid size-10 shrink-0 place-items-center rounded-xl text-stone-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-400/20 dark:hover:bg-red-950/30"
          onClick={removeIngredient}
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-2">
        {ingredient.quantity.scalable ? (
          <label>
            <span className={labelClass}>Amount</span>
            <input
              aria-label={`${ingredient.name || "Ingredient"} amount`}
              className={fieldClass}
              type="number"
              min="0"
              max={RECIPE_LIMITS.amount}
              step="any"
              value={ingredient.quantity.value ?? ""}
              placeholder="1"
              onChange={(event) => {
                const amount =
                  event.target.value === ""
                    ? undefined
                    : normalizeAmount(event.target.value);
                setIngredient((value) => ({
                  ...value,
                  quantity: {
                    ...value.quantity,
                    value: amount,
                  },
                }));
              }}
            />
          </label>
        ) : (
          <label>
            <span className={labelClass}>Quantity text</span>
            <input
              aria-label={`${ingredient.name || "Ingredient"} quantity text`}
              className={fieldClass}
              value={ingredient.quantity.text ?? ""}
              maxLength={RECIPE_LIMITS.longText}
              placeholder="to taste"
              onChange={(event) =>
                setIngredient((value) => ({
                  ...value,
                  quantity: {
                    ...value.quantity,
                    text: event.target.value,
                  },
                }))
              }
            />
          </label>
        )}
        <label>
          <span className={labelClass}>Unit</span>
          <input
            aria-label={`${ingredient.name || "Ingredient"} unit`}
            className={fieldClass}
            value={ingredient.quantity.unit ?? ""}
            maxLength={RECIPE_LIMITS.shortText}
            placeholder="cup"
            onChange={(event) =>
              setIngredient((value) => ({
                ...value,
                quantity: { ...value.quantity, unit: event.target.value },
              }))
            }
          />
        </label>
        <label>
          <span className={labelClass}>Line style</span>
          <select
            aria-label={`${ingredient.name || "Ingredient"} line style`}
            className={fieldClass}
            value={ingredient.visualStyle}
            onChange={(event) =>
              setIngredient((value) => ({
                ...value,
                visualStyle: event.target.value as IngredientStyle,
              }))
            }
          >
            {Object.entries(INGREDIENT_STYLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="mt-3">
        <legend className={labelClass}>
          Alternate measurements · scale with servings
        </legend>
        <div className="space-y-2">
          {(ingredient.alternateMeasurements ?? []).map(
            (measurement, measurementIndex) => (
              <div
                key={measurementIndex}
                className="grid grid-cols-[1fr_1fr_40px] gap-2"
              >
                <input
                  aria-label={`${ingredient.name || "Ingredient"} alternate measurement ${measurementIndex + 1} amount`}
                  className={fieldClass}
                  type="number"
                  min="0"
                  max={RECIPE_LIMITS.amount}
                  step="any"
                  value={measurement.value}
                  placeholder="120"
                  onChange={(event) => {
                    const amount = normalizeAmount(event.target.value);
                    if (amount === undefined) return;
                    setIngredient((value) => ({
                      ...value,
                      alternateMeasurements: (
                        value.alternateMeasurements ?? []
                      ).map((candidate, index) =>
                        index === measurementIndex
                          ? { ...candidate, value: amount }
                          : candidate,
                      ),
                    }));
                  }}
                />
                <input
                  aria-label={`${ingredient.name || "Ingredient"} alternate measurement ${measurementIndex + 1} unit`}
                  className={fieldClass}
                  value={measurement.unit}
                  maxLength={RECIPE_LIMITS.shortText}
                  placeholder="g"
                  onChange={(event) =>
                    setIngredient((value) => ({
                      ...value,
                      alternateMeasurements: (
                        value.alternateMeasurements ?? []
                      ).map((candidate, index) =>
                        index === measurementIndex
                          ? { ...candidate, unit: event.target.value }
                          : candidate,
                      ),
                    }))
                  }
                />
                <button
                  type="button"
                  className="grid size-10 place-items-center rounded-xl text-stone-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                  aria-label={`Remove alternate measurement ${measurementIndex + 1} from ${ingredient.name || "ingredient"}`}
                  onClick={() =>
                    setIngredient((value) => ({
                      ...value,
                      alternateMeasurements: (
                        value.alternateMeasurements ?? []
                      ).filter((_, index) => index !== measurementIndex),
                    }))
                  }
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ),
          )}
          {(ingredient.alternateMeasurements?.length ?? 0) <
          RECIPE_LIMITS.alternateMeasurements ? (
            <button
              type="button"
              className="flex min-h-9 items-center gap-2 rounded-xl border border-dashed border-black/15 px-3 text-xs font-extrabold text-stone-600 hover:border-lime-500 dark:border-white/15 dark:text-stone-400"
              onClick={() =>
                setIngredient((value) => ({
                  ...value,
                  alternateMeasurements: [
                    ...(value.alternateMeasurements ?? []),
                    { value: 1, unit: "" },
                  ],
                }))
              }
            >
              <CirclePlus className="size-4" />
              Add alternate measurement
            </button>
          ) : null}
        </div>
      </fieldset>

      <label className="mt-3 block">
        <span className={labelClass}>Note · does not scale</span>
        <input
          aria-label={`${ingredient.name || "Ingredient"} note`}
          className={fieldClass}
          value={ingredient.note ?? ""}
          maxLength={RECIPE_LIMITS.longText}
          placeholder="Optional preparation note"
          onChange={(event) =>
            setIngredient((value) => ({
              ...value,
              note: event.target.value || undefined,
            }))
          }
        />
      </label>
      <label className="mt-3 flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-black/[0.06] px-3 text-xs font-bold text-stone-600 dark:border-white/[0.06] dark:text-stone-300">
        <input
          type="checkbox"
          checked={ingredient.quantity.scalable}
          onChange={(event) =>
            setIngredient((value) => ({
              ...value,
              quantity: {
                ...value.quantity,
                scalable: event.target.checked,
                value: event.target.checked ? value.quantity.value : undefined,
                text: event.target.checked ? undefined : value.quantity.text,
              },
            }))
          }
        />
        Scale this quantity with servings
      </label>
    </article>
  );
}

function refLabel(recipe: RecipeDocumentV1, ref: NodeRef): string {
  if (ref.kind === "ingredient") {
    return (
      recipe.ingredients.find((ingredient) => ingredient.id === ref.id)?.name ||
      "Unnamed ingredient"
    );
  }
  return (
    recipe.steps.find((step) => step.id === ref.id)?.label ||
    "Unnamed operation"
  );
}

function StepEditor({
  step,
  index,
  recipe,
  onChange,
}: {
  step: RecipeStep;
  index: number;
  recipe: RecipeDocumentV1;
  onChange: (recipe: RecipeDocumentV1) => void;
}) {
  const setStep = (updater: (value: RecipeStep) => RecipeStep) =>
    onChange(updateStepInRecipe(recipe, step.id, updater));

  const usedElsewhere = new Set(
    recipe.steps
      .filter((candidate) => candidate.id !== step.id)
      .flatMap((candidate) => candidate.inputs.map((input) => input.id)),
  );
  const selected = new Set(step.inputs.map((input) => input.id));
  const candidates: NodeRef[] = [
    ...recipe.ingredients.map((ingredient) => ({
      kind: "ingredient" as const,
      id: ingredient.id,
    })),
    ...recipe.steps.slice(0, index).map((candidate) => ({
      kind: "step" as const,
      id: candidate.id,
    })),
  ].filter((candidate) => selected.has(candidate.id) || !usedElsewhere.has(candidate.id));

  const toggleInput = (ref: NodeRef) => {
    setStep((value) => ({
      ...value,
      inputs: selected.has(ref.id)
        ? value.inputs.filter((input) => input.id !== ref.id)
        : [...value.inputs, ref],
    }));
  };

  const removeStep = () => {
    const remaining = recipe.steps.filter(
      (candidate) => candidate.id !== step.id,
    );
    onChange({
      ...recipe,
      steps: remaining.map((candidate) => ({
        ...candidate,
        inputs: candidate.inputs.filter((input) => input.id !== step.id),
      })),
      finalStepId:
        recipe.finalStepId === step.id
          ? (remaining.at(-1)?.id ?? "")
          : recipe.finalStepId,
    });
  };

  return (
    <article className="rounded-2xl border border-black/[0.07] bg-white/80 p-3 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.035]">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-stone-900 text-xs font-black text-white dark:bg-lime-300 dark:text-stone-950">
          {index + 1}
        </span>
        <input
          aria-label={`Operation ${index + 1} action`}
          className={`${fieldClass} min-w-0 flex-1`}
          value={step.label}
          maxLength={RECIPE_LIMITS.stepLabel}
          placeholder="Mix, fold, bake…"
          onChange={(event) =>
            setStep((value) => ({ ...value, label: event.target.value }))
          }
        />
        <button
          type="button"
          aria-label={`Remove ${step.label || `operation ${index + 1}`}`}
          className="grid size-10 shrink-0 place-items-center rounded-xl text-stone-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-400/20 dark:hover:bg-red-950/30"
          onClick={removeStep}
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <label>
        <span className={labelClass}>What happens</span>
        <input
          aria-label={`${step.label || "Operation"} details`}
          className={fieldClass}
          value={step.details ?? ""}
          maxLength={RECIPE_LIMITS.longText}
          placeholder="Whisk until glossy"
          onChange={(event) =>
            setStep((value) => ({
              ...value,
              details: event.target.value || undefined,
            }))
          }
        />
      </label>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label>
          <span className={labelClass}>Temperature</span>
          <input
            aria-label={`${step.label || "Operation"} temperature`}
            className={fieldClass}
            value={step.temperature ?? ""}
            maxLength={RECIPE_LIMITS.shortText}
            placeholder="350°F"
            onChange={(event) =>
              setStep((value) => ({
                ...value,
                temperature: event.target.value || undefined,
              }))
            }
          />
        </label>
        <label>
          <span className={labelClass}>Minutes</span>
          <input
            aria-label={`${step.label || "Operation"} duration`}
            className={fieldClass}
            type="number"
            min="0"
            max={RECIPE_LIMITS.durationMinutes}
            step="1"
            value={step.durationMinutes ?? ""}
            placeholder="30"
            onChange={(event) => {
              const duration =
                event.target.value === ""
                  ? undefined
                  : normalizeDuration(event.target.value);
              setStep((value) => ({
                ...value,
                durationMinutes: duration,
              }));
            }}
          />
        </label>
      </div>

      <fieldset className="mt-3">
        <legend className={labelClass}>Inputs to this operation</legend>
        <div className="flex flex-wrap gap-2">
          {candidates.length > 0 ? (
            candidates.map((candidate) => {
              const isSelected = selected.has(candidate.id);
              return (
                <button
                  type="button"
                  key={`${candidate.kind}-${candidate.id}`}
                  aria-pressed={isSelected}
                  className={`min-h-9 rounded-full border px-3 text-xs font-extrabold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-400/25 ${
                    isSelected
                      ? "border-lime-400 bg-lime-300 text-stone-950"
                      : "border-black/10 bg-white text-stone-600 hover:border-stone-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-300"
                  }`}
                  onClick={() => toggleInput(candidate)}
                >
                  {candidate.kind === "step" ? "↳ " : ""}
                  {refLabel(recipe, candidate)}
                </button>
              );
            })
          ) : (
            <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
              Add an ingredient or an earlier operation first.
            </p>
          )}
        </div>
      </fieldset>
    </article>
  );
}

export function RecipeEditor() {
  const { activeRecipe: recipe, dispatch } = useAppState();
  const issues = validateRecipe(recipe);
  const onChange = (updatedRecipe: RecipeDocumentV1) =>
    dispatch({ type: "replace-active", recipe: updatedRecipe });

  const addIngredient = () => {
    if (recipe.ingredients.length >= RECIPE_LIMITS.ingredients) return;
    const ingredient: Ingredient = {
      id: makeId("ingredient"),
      name: "",
      quantity: { value: 1, unit: "", scalable: true },
      visualStyle: "auto",
    };
    onChange({ ...recipe, ingredients: [...recipe.ingredients, ingredient] });
  };

  const addStep = () => {
    if (recipe.steps.length >= RECIPE_LIMITS.steps) return;
    const step: RecipeStep = {
      id: makeId("step"),
      label: "",
      inputs: recipe.finalStepId
        ? [{ kind: "step", id: recipe.finalStepId }]
        : [],
    };
    onChange({
      ...recipe,
      steps: [...recipe.steps, step],
      finalStepId: step.id,
    });
  };

  return (
    <div
      data-testid="recipe-editor"
      className="space-y-5 px-4 pb-12 pt-5 sm:px-5"
    >
      <section className="rounded-3xl border border-black/[0.07] bg-stone-50 p-4 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <SectionHeading
            eyebrow="01 / Identity"
            title="Recipe details"
            icon={<ChefHat className="size-5" />}
          />
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.13em] ${
              issues.length === 0
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
            }`}
          >
            {issues.length === 0 ? "Ready" : `${issues.length} fixes`}
          </span>
        </div>
        <div className="space-y-3">
          <label>
            <span className={labelClass}>Recipe title</span>
            <input
              className={fieldClass}
              value={recipe.title}
              maxLength={RECIPE_LIMITS.title}
              aria-label="Recipe title"
              onChange={(event) =>
                onChange({ ...recipe, title: event.target.value })
              }
            />
          </label>
          <div className="grid grid-cols-[1fr_110px] gap-2">
            <label>
              <span className={labelClass}>Final dish</span>
              <input
                className={fieldClass}
                value={recipe.outputLabel}
                maxLength={RECIPE_LIMITS.outputLabel}
                placeholder="tomato soup"
                aria-label="Final dish"
                onChange={(event) =>
                  onChange({ ...recipe, outputLabel: event.target.value })
                }
              />
            </label>
            <label>
              <span className={labelClass}>Base serves</span>
              <input
                className={fieldClass}
                type="number"
                min="1"
                max={RECIPE_LIMITS.servings}
                step="1"
                value={recipe.baseServings}
                aria-label="Base servings"
                onChange={(event) => {
                  const servings = normalizeServings(event.target.value);
                  if (servings === undefined) return;
                  onChange({
                    ...recipe,
                    baseServings: servings,
                  });
                }}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-black/[0.07] bg-stone-50 p-4 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
        <SectionHeading
          eyebrow="02 / Before you start"
          title="Prep notes"
          icon={<Flame className="size-5" />}
        />
        <div className="mt-4 space-y-2">
          {recipe.prepNotes.map((note, index) => (
            <div key={index} className="flex gap-2">
              <input
                className={fieldClass}
                aria-label={`Prep note ${index + 1}`}
                value={note}
                maxLength={RECIPE_LIMITS.longText}
                placeholder="Preheat the oven…"
                onChange={(event) =>
                  onChange({
                    ...recipe,
                    prepNotes: recipe.prepNotes.map((candidate, noteIndex) =>
                      noteIndex === index ? event.target.value : candidate,
                    ),
                  })
                }
              />
              <button
                type="button"
                className="grid size-10 shrink-0 place-items-center rounded-xl text-stone-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                aria-label={`Remove prep note ${index + 1}`}
                onClick={() =>
                  onChange({
                    ...recipe,
                    prepNotes: recipe.prepNotes.filter(
                      (_, noteIndex) => noteIndex !== index,
                    ),
                  })
                }
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="mt-1 flex min-h-10 items-center gap-2 rounded-xl border border-dashed border-black/15 px-3 text-xs font-extrabold text-stone-600 hover:border-lime-500 hover:text-stone-950 dark:border-white/15 dark:text-stone-400 dark:hover:text-white"
            disabled={recipe.prepNotes.length >= RECIPE_LIMITS.prepNotes}
            title={
              recipe.prepNotes.length >= RECIPE_LIMITS.prepNotes
                ? `Maximum ${RECIPE_LIMITS.prepNotes} prep notes`
                : undefined
            }
            onClick={() =>
              onChange({ ...recipe, prepNotes: [...recipe.prepNotes, ""] })
            }
          >
            <CirclePlus className="size-4" />
            Add prep note
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-black/[0.07] bg-stone-50 p-4 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
        <div className="flex items-center justify-between gap-3">
          <SectionHeading
            eyebrow="03 / Inputs"
            title="Ingredients"
            icon={<ListTree className="size-5" />}
          />
          <span className="text-xs font-extrabold text-stone-600 dark:text-stone-400">
            {recipe.ingredients.length}
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {recipe.ingredients.map((ingredient, index) => (
            <IngredientEditor
              key={ingredient.id}
              ingredient={ingredient}
              index={index}
              recipe={recipe}
              onChange={onChange}
            />
          ))}
          <button
            type="button"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-black/15 text-sm font-extrabold text-stone-600 transition hover:border-lime-500 hover:bg-lime-50 hover:text-stone-950 dark:border-white/15 dark:text-stone-400 dark:hover:bg-lime-400/10 dark:hover:text-white"
            disabled={recipe.ingredients.length >= RECIPE_LIMITS.ingredients}
            title={
              recipe.ingredients.length >= RECIPE_LIMITS.ingredients
                ? `Maximum ${RECIPE_LIMITS.ingredients} ingredients`
                : undefined
            }
            onClick={addIngredient}
          >
            <CirclePlus className="size-4" />
            Add ingredient
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-black/[0.07] bg-stone-50 p-4 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
        <div className="flex items-center justify-between gap-3">
          <SectionHeading
            eyebrow="04 / Transformation"
            title="Operations"
            icon={<GitMerge className="size-5" />}
          />
          <span className="text-xs font-extrabold text-stone-600 dark:text-stone-400">
            {recipe.steps.length}
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {recipe.steps.map((step, index) => (
            <StepEditor
              key={step.id}
              step={step}
              index={index}
              recipe={recipe}
              onChange={onChange}
            />
          ))}
          <button
            type="button"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-black/15 text-sm font-extrabold text-stone-600 transition hover:border-lime-500 hover:bg-lime-50 hover:text-stone-950 dark:border-white/15 dark:text-stone-400 dark:hover:bg-lime-400/10 dark:hover:text-white"
            disabled={recipe.steps.length >= RECIPE_LIMITS.steps}
            title={
              recipe.steps.length >= RECIPE_LIMITS.steps
                ? `Maximum ${RECIPE_LIMITS.steps} operations`
                : undefined
            }
            onClick={addStep}
          >
            <CirclePlus className="size-4" />
            Add operation
          </button>
        </div>

        {recipe.steps.length > 0 ? (
          <label className="mt-4 block">
            <span className={labelClass}>Final result comes from</span>
            <select
              className={fieldClass}
              aria-label="Final operation"
              value={recipe.finalStepId}
              onChange={(event) =>
                onChange({ ...recipe, finalStepId: event.target.value })
              }
            >
              <option value="">Choose an operation</option>
              {recipe.steps.map((step, index) => (
                <option key={step.id} value={step.id}>
                  {index + 1}. {step.label || "Unnamed operation"}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <p className="mt-4 rounded-2xl border border-black/[0.06] bg-white/70 p-3 text-xs font-semibold leading-relaxed text-stone-600 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-stone-400">
          Recipe Visualizer draws a tree: each ingredient or intermediate
          preparation feeds one later operation. If a recipe divides or reserves
          something, create separate ingredient quantities for each branch.
        </p>
      </section>

      {issues.length > 0 ? (
        <section
          aria-label="Recipe validation"
          className="rounded-3xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
        >
          <div className="mb-2 flex items-center gap-2 text-sm font-black">
            <ArrowDownToLine className="size-4 rotate-180" />
            Finish the recipe structure
          </div>
          <ul className="space-y-1 pl-5 text-xs font-semibold leading-relaxed">
            {issues.slice(0, 6).map((issue) => (
              <li key={`${issue.code}-${issue.path ?? ""}`} className="list-disc">
                {issue.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
