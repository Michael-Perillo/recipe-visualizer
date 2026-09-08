import { describe, expect, it } from "vitest";
import {
  createAnchoredPath,
  createInboundAnchors,
  createNeutralPath,
  createStraightPath,
  createWavePath,
  getOperationNodeMetrics,
  getFlowOutputLayout,
  pathForStyle,
} from "./FlowDiagram";

const start = { x: 10, y: 20 };
const end = { x: 180, y: 70 };

describe("flow output column", () => {
  it.each([
    "fudgy brownies",
    "layered pantry supper",
    "toast",
    "W".repeat(100),
  ])("reserves a bounded column for %s", (label) => {
    const layout = getFlowOutputLayout(label, 1410);
    const halfTextWidth =
      Math.max(...layout.lines.map((line) => line.length * 16)) / 2;
    expect(layout.centerX + halfTextWidth).toBeLessThan(layout.width - 54);
    expect(halfTextWidth).toBeLessThan(112);
    expect(layout.centerX).toBe(1410);
    expect(layout.lines.join("").replaceAll(" ", "")).toBe(
      label.replaceAll(" ", ""),
    );
  });
});

describe("flow path generation", () => {
  it("generates deterministic paths for every semantic style", () => {
    expect(createStraightPath(start, end)).toBe("M 10 20 L 108 20 L 180 70");
    expect(createWavePath(start, end)).toContain(" Q ");
    expect(createNeutralPath(start, end)).toContain(" C ");
    expect(pathForStyle("dry", start, end)).toBe(
      createStraightPath(start, end),
    );
    expect(pathForStyle("liquid", start, end)).toBe(createWavePath(start, end));
    expect(pathForStyle("featured", start, end)).toBe(
      createStraightPath(start, end),
    );
  });

  it("curves smoothly into a radial target approach", () => {
    const path = createAnchoredPath(
      "dry",
      start,
      { x: 78.2, y: 93 },
      { x: 100, y: 100 },
    );

    expect(path).toMatch(/ C .* 78\.2 93$/);
    expect(path).not.toMatch(/ L 78\.2 93$/);
  });
});

describe("flow input anchors", () => {
  it("keeps dense nodes visually consistent with regular operation nodes", () => {
    const regular = getOperationNodeMetrics(3);
    const dense = getOperationNodeMetrics(5);

    expect(regular.boundaryRadius * 2).toBe(41);
    expect(dense.boundaryRadius * 2).toBe(43.5);
    expect(dense.boundaryRadius / regular.boundaryRadius).toBeLessThan(1.1);
  });

  it("orders ports by source position with even perimeter spacing", () => {
    const anchors = createInboundAnchors(
      [
        { id: "top", sourceY: 10 },
        { id: "upper", sourceY: 20 },
        { id: "middle", sourceY: 30 },
        { id: "lower", sourceY: 40 },
        { id: "bottom", sourceY: 50 },
      ],
      { x: 100, y: 100 },
      false,
    );
    const top = anchors.get("top")!;
    const middle = anchors.get("middle")!;
    const lower = anchors.get("lower")!;
    const bottom = anchors.get("bottom")!;
    const distance = (left: typeof top, right: typeof top) =>
      Math.hypot(left.x - right.x, left.y - right.y);

    expect(top.y).toBeLessThan(middle.y);
    expect(middle.y).toBeLessThan(bottom.y);
    expect(Math.hypot(top.x - 100, top.y - 100)).toBeCloseTo(21.75, 1);
    expect(
      Math.abs(distance(lower, bottom) - distance(middle, lower)),
    ).toBeLessThan(0.2);
  });
});
