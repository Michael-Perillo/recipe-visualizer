import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { BookOpen } from "lucide-react";
import { Select, type SelectProps } from "../components/Select";

function SelectExample(args: SelectProps) {
  const [value, setValue] = useState(args.value);
  return (
    <label>
      <span className="rv-label">{args["aria-label"]}</span>
      <Select {...args} value={value} onChange={(next) => {
        args.onChange(next);
        setValue(next);
      }} />
    </label>
  );
}

const meta = {
  title: "Controls/Select",
  component: Select,
  tags: ["autodocs"],
  args: {
    "aria-label": "Timing unit",
    value: "minutes",
    options: [
      { value: "seconds", label: "Seconds" },
      { value: "minutes", label: "Minutes" },
      { value: "hours", label: "Hours" },
    ],
    onChange: fn(),
  },
  argTypes: { icon: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          "Themed single-choice dropdown. Use the theme toolbar to try Paper and Ink. Supports arrow keys, Home/End, typing to find an option, Enter to choose, and Escape to dismiss. Long lists scroll within the viewport; menus inherit the nearest recipe theme.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="story-page">
        <div style={{ maxWidth: 320 }}>
          <Story />
        </div>
      </div>
    ),
  ],
  render: (args) => <SelectExample key={args.value} {...args} />,
} satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = { args: { disabled: true } };

export const Clearable: Story = {
  args: {
    "aria-label": "Final operation",
    value: "",
    options: [
      { value: "", label: "Choose an operation" },
      { value: "mix", label: "1. Mix batter" },
      { value: "bake", label: "2. Bake until just set" },
      { value: "cool", label: "3. Cool and slice" },
    ],
  },
};

export const RecipeLibrary: Story = {
  args: {
    "aria-label": "Active recipe",
    value: "recipe-1",
    icon: <BookOpen size={16} />,
    options: [
      { value: "recipe-1", label: "Espresso brownies with toasted walnuts and a dark chocolate drizzle" },
      ...Array.from({ length: 24 }, (_, index) => ({
        value: `recipe-${index + 2}`,
        label: `Recipe ${index + 2} · Weekend baking`,
      })),
    ],
  },
};

export const KeyboardSelection: Story = {
  args: {
    options: [
      { value: "seconds", label: "Seconds" },
      { value: "minutes", label: "Minutes" },
      { value: "hours", label: "Hours", disabled: true },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("combobox", { name: "Timing unit" });
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    await page.findByRole("listbox");
    await userEvent.keyboard("{Home}{Enter}");
    await waitFor(() => expect(trigger).toHaveTextContent("Seconds"));
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await page.findByRole("listbox");
    await userEvent.keyboard("{End}");
    await userEvent.keyboard("{Enter}");
    await expect(trigger).toHaveTextContent("Seconds");
    await expect(page.getByRole("option", { name: "Hours" })).toHaveAttribute("aria-disabled", "true");
    await userEvent.keyboard("{ArrowUp}{Enter}");
    await waitFor(() => expect(trigger).toHaveTextContent("Minutes"));
    await userEvent.keyboard("{ArrowDown}");
    await page.findByRole("listbox");
    await userEvent.keyboard("{Escape}");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toHaveFocus();
  },
};
