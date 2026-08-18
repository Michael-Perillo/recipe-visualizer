import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RECIPE } from "./data/defaultRecipe";
import App from "./App";
import { RECOVERY_KEY, STORAGE_KEY } from "./state/AppState";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("data-theme");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Recipe Visualizer workspace", () => {
  it("loads the default recipe and switches visualization and servings", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByLabelText("Recipe title")).toHaveValue(
      "Espresso Brownies",
    );
    expect(screen.getByTestId("recipe-artboard")).toHaveAttribute(
      "data-view",
      "flow",
    );

    await user.click(screen.getByTestId("matrix-view"));
    expect(screen.getByTestId("recipe-artboard")).toHaveAttribute(
      "data-view",
      "matrix",
    );

    await user.click(screen.getByRole("button", { name: "Show 2 servings" }));
    expect(screen.getByLabelText("Custom servings")).toHaveValue(2);
    expect(screen.getByTestId("recipe-artboard")).toHaveTextContent(
      "MATRIX RECIPE • SERVES 2",
    );
  });

  it("creates a persisted draft and displays actionable validation", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "New recipe" }));
    expect(screen.getByLabelText("Recipe title")).toHaveValue("Untitled recipe");
    expect(
      screen.getByRole("heading", { name: "Connect the recipe first" }),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Recipe title"));
    await user.type(screen.getByLabelText("Recipe title"), "Summer soup");

    await waitFor(() => {
      expect(window.localStorage.getItem("recipe-visualizer:library:v1")).toContain(
        "Summer soup",
      );
    });
  });

  it("persists an explicit dark theme", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    );
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");

    await user.click(screen.getByTestId("matrix-view"));
    expect(screen.getByText("fudgy brownies").closest("text")).toHaveAttribute(
      "fill",
      "#B8FF3D",
    );
  });

  it("keeps prep note focus while typing multiple characters", async () => {
    const user = userEvent.setup();
    render(<App />);

    const prepNote = screen.getByLabelText("Prep note 1");
    await user.click(prepNote);
    await user.keyboard("{End}");
    await user.type(prepNote, " updated");

    expect(prepNote).toHaveFocus();
    expect(prepNote).toHaveValue(
      "Butter and flour an 8×8-in pan updated",
    );
  });

  it("does not accept a negative ingredient amount as ready data", async () => {
    const user = userEvent.setup();
    render(<App />);

    const amount = screen.getByLabelText("unsalted butter amount");
    await user.clear(amount);
    await user.type(amount, "-1");

    expect(screen.queryByText("Ready")).not.toBeInTheDocument();
    expect(
      screen.getAllByText(/unsalted butter needs a numeric amount/i),
    ).not.toHaveLength(0);
  });

  it("backs up malformed storage before replacing it", async () => {
    const malformed = JSON.stringify({
      schemaVersion: 1,
      activeRecipeId: DEFAULT_RECIPE.id,
      recipes: [
        {
          ...DEFAULT_RECIPE,
          ingredients: DEFAULT_RECIPE.ingredients.map((ingredient, index) =>
            index === 0
              ? {
                  ...ingredient,
                  quantity: { ...ingredient.quantity, value: -1 },
                }
              : ingredient,
          ),
        },
      ],
      view: "flow",
      theme: "light",
      servingsByRecipe: { [DEFAULT_RECIPE.id]: 4 },
    });
    window.localStorage.setItem(STORAGE_KEY, malformed);

    render(<App />);

    expect(
      screen.getByText("Saved data needed recovery").closest('[role="alert"]'),
    ).toHaveTextContent("Saved data needed recovery");
    expect(window.localStorage.getItem(RECOVERY_KEY)).toBe(malformed);
    await waitFor(() => {
      expect(window.localStorage.getItem(STORAGE_KEY)).not.toBe(malformed);
    });
    expect(window.localStorage.getItem(RECOVERY_KEY)).toBe(malformed);
  });

  it("salvages individually valid recipes from a malformed library", async () => {
    const malformed = JSON.stringify({
      schemaVersion: 1,
      activeRecipeId: "broken-recipe",
      recipes: [
        DEFAULT_RECIPE,
        {
          ...DEFAULT_RECIPE,
          id: "broken-recipe",
          title: "Broken recipe",
          ingredients: DEFAULT_RECIPE.ingredients.map((ingredient, index) =>
            index === 0
              ? {
                  ...ingredient,
                  quantity: { ...ingredient.quantity, value: -1 },
                }
              : ingredient,
          ),
        },
      ],
      view: "matrix",
      theme: "light",
      servingsByRecipe: {
        [DEFAULT_RECIPE.id]: 4,
        "broken-recipe": 4,
      },
    });
    window.localStorage.setItem(STORAGE_KEY, malformed);

    render(<App />);

    expect(screen.getByLabelText("Recipe title")).toHaveValue(
      "Espresso Brownies",
    );
    expect(screen.getByText(/1 structurally valid recipe was recovered/i))
      .toBeInTheDocument();
    await waitFor(() => {
      const saved = JSON.parse(
        window.localStorage.getItem(STORAGE_KEY) ?? "{}",
      ) as { recipes?: unknown[] };
      expect(saved.recipes).toHaveLength(1);
    });
    expect(window.localStorage.getItem(RECOVERY_KEY)).toBe(malformed);
  });

  it("does not overwrite malformed primary data when recovery storage fails", () => {
    const malformed = '{"schemaVersion":1,"recipes":"not-an-array"}';
    window.localStorage.setItem(STORAGE_KEY, malformed);
    const originalSetItem = Storage.prototype.setItem;
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(function (this: Storage, key, value) {
        if (key === RECOVERY_KEY) {
          throw new DOMException("Storage full", "QuotaExceededError");
        }
        return originalSetItem.call(this, key, value);
      });

    render(<App />);

    expect(
      screen.getByText(/original data has not been overwritten/i),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(malformed);
    expect(window.localStorage.getItem(RECOVERY_KEY)).toBeNull();
    setItem.mockRestore();
  });
});
