import type { Meta, StoryObj } from "@storybook/react-vite";
import { MethodDiagram } from "../components/diagram/MethodDiagram";
import { DEFAULT_RECIPE } from "../data/defaultRecipe";
import type { RecipeStep, Theme } from "../domain/types";
import { DEEP_RECIPE } from "../../tests/e2e/recipes";

function MethodExample({
  steps,
  width,
  theme,
}: {
  steps: RecipeStep[];
  width: number;
  theme: Theme;
}) {
  return (
    <div className="story-diagram app-grid">
      <MethodDiagram steps={steps} maxWidth={width} theme={theme} />
    </div>
  );
}
const meta = {
  title: "Diagrams/Method cards",
  component: MethodExample,
  args: { steps: DEFAULT_RECIPE.steps, width: 1400, theme: "light" },
  argTypes: {
    steps: { control: false },
    theme: { control: false },
    width: {
      description:
        "Maximum canvas width; cards reflow to the available preview width, as in the app.",
      control: { type: "range", min: 280, max: 1800, step: 20 },
    },
  },
  render: (args, { globals }) => (
    <MethodExample
      {...args}
      theme={globals.theme === "dark" ? "dark" : "light"}
    />
  ),
} satisfies Meta<typeof MethodExample>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ThreeColumns: Story = {};
export const TwoColumns: Story = { args: { width: 1000 } };
export const OneColumn: Story = { args: { width: 560 } };
export const MaximumLength: Story = {
  args: { steps: DEEP_RECIPE.steps, width: 1000 },
};
export const LegacyInstructions: Story = {
  args: {
    width: 1000,
    steps: [
      {
        id: "legacy-melt",
        label: "Melt",
        details: "Melt gently until glossy",
        inputs: [],
      },
      {
        id: "legacy-bake",
        label: "Bake",
        details: "Cool before slicing",
        durationMinutes: 35,
        temperature: "350°F / 170°C",
        inputs: [],
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          "Older saved recipes remain unchanged when the bundled example evolves. Missing timing, equipment, settings and cues are not invented by the renderer.",
      },
    },
  },
};
