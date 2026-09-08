import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowUpRight, ChefHat, Download, Plus } from "lucide-react";
import { Button, SectionHeading, StatusBadge } from "../components/ui";
import { PALETTES } from "../components/diagram/shared";

const meta = {
  title: "Foundations/Design kitchen",
  parameters: { controls: { disable: true } },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  render: (_, { globals }) => {
    const palette = PALETTES[globals.theme === "dark" ? "dark" : "light"];
    return (
      <main className="story-page">
        <div className="story-row">
          <span className="rv-eyebrow">Recipe Visualizer / Design kitchen</span>
          <StatusBadge>Living component library</StatusBadge>
        </div>
        <h1>
          A little structure.
          <br />A lot more clarity.
        </h1>
        <p className="story-intro">
          The same ingredients as the app: warm paper, confident ink, and a
          bright signal to guide the next action. Explore real components,
          switch themes, and try edge cases without touching your saved recipes.
        </p>
        <div className="story-grid">
          <section className="rv-panel story-stack">
            <SectionHeading
              eyebrow="01 / Hierarchy"
              title="Quiet surfaces, clear actions"
              icon={<ChefHat />}
            />
            <p className="story-caption">
              One 40 px control rhythm. 10 px control corners, 16 px panels.
              Reserve lime for selection, progress, and primary actions.
            </p>
            <div className="story-row">
              <Button variant="primary">
                <Download size={16} />
                Export diagram
              </Button>
              <Button variant="add">
                <Plus size={16} />
                Add ingredient
              </Button>
            </div>
          </section>
          <section className="rv-panel story-stack">
            <SectionHeading
              eyebrow="02 / Meaning"
              title="Color has a job"
              icon={<ArrowUpRight />}
            />
            <p className="story-caption">
              Purple lines carry dry ingredients; teal waves carry liquid. A
              coral marker adds featured emphasis without changing the
              ingredient’s line type.
            </p>
            <div className="story-row">
              <StatusBadge tone="success">Ready</StatusBadge>
              <StatusBadge tone="warning">2 fixes</StatusBadge>
              <StatusBadge>Saved locally</StatusBadge>
            </div>
          </section>
        </div>
        <section className="mt-10" aria-label="Diagram palette">
          <p className="rv-eyebrow">03 / Export-safe palette</p>
          <div className="story-grid">
            {(
              ["bg", "ink", "accent", "dry", "liquid", "featured"] as const
            ).map((key) => (
              <div key={key}>
                <div
                  className="story-swatch"
                  style={{ background: palette[key] }}
                />
                <strong className="text-sm capitalize">
                  {key === "bg" ? "Paper" : key}
                </strong>
                <p className="story-caption">{palette[key]}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rv-panel mt-10 story-stack">
          <p className="rv-eyebrow">04 / Readability is part of the design</p>
          <p className="story-intro">
            Instructions wrap; they never disappear behind an ellipsis. Method
            cues retain breathing room. The workspace stays fixed while its
            editor and diagram scroll independently.
          </p>
          <p className="story-caption">
            Use the theme menu above for Paper / Ink. Editor stories are
            interactive, and the Method stories expose card-width controls to
            check the arrowed layout.
          </p>
        </section>
      </main>
    );
  },
};
