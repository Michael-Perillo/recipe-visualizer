import { useRef } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { RecipeDiagram } from "../components/diagram/RecipeDiagram";
import { DEFAULT_RECIPE } from "../data/defaultRecipe";
import type { DiagramView, RecipeDocumentV1, Theme } from "../domain/types";
import { DEEP_RECIPE, MINIMAL_RECIPE } from "../../tests/e2e/recipes";

function DiagramExample({
  recipe,
  view,
  servings,
  theme,
}: {
  recipe: RecipeDocumentV1;
  view: DiagramView;
  servings: number;
  theme: Theme;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  return (
    <div className="story-diagram app-grid">
      <RecipeDiagram
        recipe={recipe}
        servings={servings}
        theme={theme}
        svgRef={svgRef}
        view={view}
      />
    </div>
  );
}

const meta = {
  title: "Diagrams/Recipe diagrams",
  component: DiagramExample,
  args: { recipe: DEFAULT_RECIPE, view: "flow", servings: 4, theme: "light" },
  argTypes: {
    recipe: { control: false },
    theme: { control: false },
    view: { control: "inline-radio", options: ["flow", "matrix"] },
    servings: { control: { type: "number", min: 1, max: 100 } },
  },
  render: (args, { globals }) => (
    <DiagramExample
      {...args}
      theme={globals.theme === "dark" ? "dark" : "light"}
    />
  ),
} satisfies Meta<typeof DiagramExample>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Flow: Story = {};
export const Matrix: Story = { args: { view: "matrix" } };
export const TwoServings: Story = { args: { servings: 2 } };
export const Minimal: Story = { args: { recipe: MINIMAL_RECIPE, servings: 1 } };
export const LongTextAndDeepChain: Story = { args: { recipe: DEEP_RECIPE } };
