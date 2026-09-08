import { describe, expect, it } from "vitest";
import { DEFAULT_RECIPE } from "../../data/defaultRecipe";
import {
  getDiagramHeaderLayout,
  getMethodKeyLayout,
  splitText,
} from "./shared";

describe("diagram method layout", () => {
  it("lays dependency-ordered instructions into three columns", () => {
    const layout = getMethodKeyLayout(DEFAULT_RECIPE.steps, 1_740);

    expect(layout.cards).toHaveLength(7);
    expect(layout.cards.slice(0, 3).map((card) => card.y)).toEqual([
      layout.cards[0].y,
      layout.cards[0].y,
      layout.cards[0].y,
    ]);
    expect(layout.cards[3].y).toBeGreaterThan(layout.cards[0].y);
    expect(layout.cards[6].y).toBeGreaterThan(layout.cards[3].y);
    expect(layout.height).toBeGreaterThan(500);
    expect(layout.columns).toBe(3);
    expect(layout.connectors).toHaveLength(6);
    expect(layout.connectors[2].path).toContain(" V ");
  });

  it("reacts to narrower artboards while keeping a continuous sequence", () => {
    const layout = getMethodKeyLayout(DEFAULT_RECIPE.steps, 1_000);

    expect(layout.columns).toBe(2);
    expect(layout.cards[2].y).toBeGreaterThan(layout.cards[0].y);
    expect(layout.connectors).toHaveLength(DEFAULT_RECIPE.steps.length - 1);
    expect(
      layout.connectors.filter((connector) => connector.path.includes(" V ")),
    ).toHaveLength(3);
  });

  it("wraps the maximum method and cue lengths without ellipsis", () => {
    const longText = Array.from({ length: 40 }, () => "texture").join(" ");
    const lines = splitText(longText.slice(0, 240), 48);

    expect(lines.join(" ")).toBe(longText.slice(0, 240).trim());
    expect(lines.at(-1)).not.toContain("…");
  });

  it("reserves bottom padding below every cue panel", () => {
    const layout = getMethodKeyLayout(DEFAULT_RECIPE.steps, 1_740);

    for (const card of layout.cards.filter(
      (candidate) => candidate.cueLines.length > 0,
    )) {
      const cueBottom = card.contentBottom + 16 + card.cueHeight;
      expect(card.height - cueBottom).toBeGreaterThanOrEqual(20);
    }
  });

  it("preserves every instruction field as explicitly labeled metadata", () => {
    const layout = getMethodKeyLayout(DEFAULT_RECIPE.steps, 366);
    const bake = layout.cards.find((card) => card.step.id === "step-bake")!;
    expect(bake.metadata.map(({ label, value }) => [label, value])).toEqual([
      ["TIME", "30–35 min"],
      ["TEMP", "350°F / 170°C"],
      ["TOOL", "8×8-in pan"],
      ["SETTING", "Center rack"],
    ]);
    for (const card of layout.cards) {
      expect(card.methodLines.join(" ")).toBe(card.step.details);
      expect(card.cueLines.join(" ")).toBe(card.step.cue);
      for (const item of card.metadata) {
        expect(item.lines.join(" ")).toBe(item.value);
      }
    }
  });

  it("renders legacy timing without inventing missing cooking information", () => {
    const layout = getMethodKeyLayout(
      [
        {
          id: "legacy",
          label: "Bake",
          details: "Cool before slicing",
          durationMinutes: 35,
          inputs: [],
        },
      ],
      1000,
    );
    expect(
      layout.cards[0].metadata.map(({ label, value }) => [label, value]),
    ).toEqual([["TIME", "35 min"]]);
    expect(layout.cards[0].cueLines).toEqual([]);
  });
});

describe("method reading scale", () => {
  it("uses the displayed width for column count and maps the result into the SVG", () => {
    const desktop = getMethodKeyLayout(DEFAULT_RECIPE.steps, 2400, 1000);
    const mobile = getMethodKeyLayout(DEFAULT_RECIPE.steps, 2400, 366);
    expect(desktop.columns).toBe(2);
    expect(mobile.columns).toBe(1);
    expect(desktop.scale).toBe(2.4);
    expect(mobile.width * mobile.scale).toBeCloseTo(2400);
    expect(mobile.cards[0].width / mobile.width).toBeGreaterThan(0.9);
    expect(mobile.height / mobile.scale).toBeGreaterThan(
      desktop.height / desktop.scale,
    );
  });
});

describe("diagram header layout", () => {
  it("wraps every prep note without hiding or ellipsizing text", () => {
    const notes = [
      Array.from({ length: 24 }, () => "prepare")
        .join(" ")
        .slice(0, 240),
      "Set the center rack before preheating the oven.",
      "Keep a clean towel beside the work area.",
    ];
    const layout = getDiagramHeaderLayout(
      "A complete baking title",
      notes,
      1_740,
    );

    expect(layout.notes).toHaveLength(notes.length);
    expect(layout.height).toBeGreaterThan(184);
    layout.notes.forEach((note, index) => {
      expect(note.lines.join(" ")).toBe(notes[index]);
      expect(note.lines.join(" ")).not.toContain("…");
    });
  });
});
