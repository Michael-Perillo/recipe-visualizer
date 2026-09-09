import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Download, Plus, Trash2 } from "lucide-react";
import { Button, SegmentedControl, StatusBadge } from "../components/ui";
import { Select } from "../components/Select";

const meta = {
  title: "Controls/Button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "Export diagram", variant: "primary", onClick: fn() },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost", "add", "danger"],
    },
  },
  decorators: [
    (Story) => (
      <div className="story-page">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = {
  args: { variant: "secondary", children: "Load other tab" },
};
export const Disabled: Story = {
  args: { disabled: true, children: "Making PNG…" },
};
export const Actions: Story = {
  render: () => (
    <div className="story-row">
      <Button variant="primary">
        <Download size={16} />
        Export
      </Button>
      <Button variant="add">
        <Plus size={16} />
        Add ingredient
      </Button>
      <Button variant="danger">
        <Trash2 size={16} />
        Delete recipe
      </Button>
    </div>
  ),
};

function ControlExamples() {
  const [view, setView] = useState("flow");
  return (
    <div className="story-stack">
      <SegmentedControl
        label="Visualization style"
        value={view}
        onChange={setView}
        options={[
          { value: "matrix", label: "Matrix" },
          { value: "flow", label: "Flow" },
        ]}
      />
      <div className="story-row">
        <StatusBadge>Saved locally</StatusBadge>
        <StatusBadge tone="success">Ready</StatusBadge>
        <StatusBadge tone="warning">3 fixes</StatusBadge>
      </div>
      <label className="w-full max-w-sm">
        <span className="rv-label">Recipe title</span>
        <input className="rv-field" defaultValue="Espresso Brownies" />
      </label>
      <label className="w-full max-w-sm">
        <span className="rv-label">Look for</span>
        <textarea
          className="rv-field"
          rows={3}
          defaultValue="Shiny batter that falls from the whisk in thick ribbons."
        />
      </label>
      <label className="w-full max-w-sm">
        <span className="rv-label">Timing unit · disabled</span>
        <Select
          aria-label="Timing unit"
          value="minutes"
          options={[{ value: "minutes", label: "Minutes" }]}
          onChange={() => {}}
          disabled
        />
      </label>
    </div>
  );
}

export const ControlsAndStates: Story = {
  render: () => <ControlExamples />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Matrix" }));
    await expect(
      canvas.getByRole("button", { name: "Matrix" }),
    ).toHaveAttribute("aria-pressed", "true");
    await userEvent.clear(canvas.getByLabelText("Recipe title"));
    await userEvent.type(
      canvas.getByLabelText("Recipe title"),
      "Cocoa brownies",
    );
    await expect(canvas.getByLabelText("Recipe title")).toHaveValue(
      "Cocoa brownies",
    );
  },
};
