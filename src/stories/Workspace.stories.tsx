import type { Meta, StoryObj } from "@storybook/react-vite";
import { Workspace } from "../App";
import { AppStateProvider } from "../state/AppState";
import { DEFAULT_RECIPE } from "../data/defaultRecipe";
import { createBlankRecipe } from "../domain/recipe";
import { MINIMAL_RECIPE, persistedLibraryFor } from "../../tests/e2e/recipes";

const meta = {
  title: "Workspace/Recipe studio",
  component: Workspace,
  parameters: { controls: { disable: true } },
  render: (_, { globals, parameters }) => {
    const recipe = parameters.recipe ?? DEFAULT_RECIPE;
    const theme = globals.theme === "dark" ? "dark" : "light";
    return (
      <div className="story-workspace">
        <AppStateProvider
          key={`${recipe.id}-${theme}`}
          storage="memory"
          initialLibrary={{ ...persistedLibraryFor(recipe), theme }}
        >
          <Workspace />
        </AppStateProvider>
      </div>
    );
  },
} satisfies Meta<typeof Workspace>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Brownies: Story = {};
export const Minimal: Story = { parameters: { recipe: MINIMAL_RECIPE } };
export const EmptyDraft: Story = {
  parameters: { recipe: { ...createBlankRecipe(), id: "storybook-blank" } },
};
export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
};
