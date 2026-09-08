import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { AppStateProvider, STORAGE_KEY, useAppState } from "./AppState";
import { MINIMAL_RECIPE, persistedLibraryFor } from "../../tests/e2e/recipes";

function DemoControls() {
  const { activeRecipe, saveStatus, dispatch, resetLocalData } = useAppState();
  return (
    <>
      <span>{activeRecipe.title}</span>
      <span>{saveStatus}</span>
      <button onClick={() => dispatch({ type: "new-recipe" })}>New</button>
      <button onClick={resetLocalData}>Reset</button>
    </>
  );
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("keeps Storybook edits, reset, and external storage events isolated from the user's library", async () => {
  const read = vi.spyOn(Storage.prototype, "getItem");
  const write = vi.spyOn(Storage.prototype, "setItem");
  const remove = vi.spyOn(Storage.prototype, "removeItem");
  const user = userEvent.setup();
  render(
    <AppStateProvider
      storage="memory"
      initialLibrary={persistedLibraryFor(MINIMAL_RECIPE)}
    >
      <DemoControls />
    </AppStateProvider>,
  );
  expect(screen.getByText("One-slice toast")).toBeInTheDocument();
  expect(screen.getByText("demo")).toBeInTheDocument();
  act(() =>
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue: JSON.stringify({
          ...persistedLibraryFor({ ...MINIMAL_RECIPE, title: "Other tab" }),
          updatedAt: Date.now(),
        }),
      }),
    ),
  );
  expect(screen.queryByText("Other tab")).not.toBeInTheDocument();
  await user.click(screen.getByText("New"));
  expect(screen.getByText("Untitled recipe")).toBeInTheDocument();
  await user.click(screen.getByText("Reset"));
  act(() => window.dispatchEvent(new Event("pagehide")));
  expect(screen.getByText("demo")).toBeInTheDocument();
  expect(read).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
});
