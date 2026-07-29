import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "./App";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("data-theme");
});

afterEach(() => {
  cleanup();
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
});
