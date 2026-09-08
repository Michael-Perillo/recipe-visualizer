import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { RecipeEditor } from "../components/RecipeEditor";
import { AppStateProvider } from "../state/AppState";
import { DEFAULT_RECIPE } from "../data/defaultRecipe";
import { createBlankRecipe } from "../domain/recipe";
import { MINIMAL_RECIPE, persistedLibraryFor } from "../../tests/e2e/recipes";

const meta = {
  title: "Editor/Recipe editor",
  component: RecipeEditor,
  parameters: { controls: { disable: true } },
  render: (_, { globals, parameters }) => {
    const recipe = parameters.recipe ?? DEFAULT_RECIPE;
    const theme = globals.theme === "dark" ? "dark" : "light";
    return (
      <div className="story-editor">
        <AppStateProvider
          key={`${recipe.id}-${theme}`}
          storage="memory"
          initialLibrary={{ ...persistedLibraryFor(recipe), theme }}
        >
          <RecipeEditor />
        </AppStateProvider>
      </div>
    );
  },
} satisfies Meta<typeof RecipeEditor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const CompleteRecipe: Story = {};
export const Minimal: Story = { parameters: { recipe: MINIMAL_RECIPE } };
export const NeedsAttention: Story = {
  parameters: { recipe: { ...createBlankRecipe(), id: "storybook-draft" } },
};
export const PrepNoteTyping: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const note = canvas.getByLabelText("Prep note 1");
    await userEvent.clear(note);
    await userEvent.type(note, "Line the pan with parchment.");
    await expect(note).toHaveValue("Line the pan with parchment.");
    await expect(note).toHaveFocus();
  },
};
