import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RECIPE } from "../data/defaultRecipe";
import {
  buildExportName,
  serializeSvg,
  slugify,
  getPngDimensions,
  composeRecipeExport,
} from "./export";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("export helpers", () => {
  it("composes the full graph and complete method at the same native type scale", async () => {
    const source = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    source.setAttribute("viewBox", "0 0 2000 1000");
    source.innerHTML = "<text>Complete recipe graph</text>";
    const result = await composeRecipeExport(source, DEFAULT_RECIPE, "light");
    expect(result.getAttribute("viewBox")).toMatch(/^0 0 2000 /);
    expect(
      Number(result.getAttribute("viewBox")!.split(" ")[3]),
    ).toBeGreaterThan(1000);
    expect(result.querySelectorAll('[data-testid="method-card"]')).toHaveLength(
      7,
    );
    expect(result.textContent).toContain("Complete recipe graph");
    expect(
      result
        .querySelector('[data-testid="diagram-method-key"]')!
        .parentElement!.getAttribute("transform"),
    ).toContain("scale(1)");
    expect(
      result.querySelector('[data-testid="method-instruction"] text'),
    ).toHaveAttribute("font-size", "16");
    expect(
      source.querySelector('[data-testid="diagram-method-key"]'),
    ).toBeNull();
    expect(source.getAttribute("viewBox")).toBe("0 0 2000 1000");
  });
  it("creates safe, descriptive filenames", () => {
    expect(slugify("  Crème brûlée!  ")).toBe("cr-me-br-l-e");
    expect(buildExportName(DEFAULT_RECIPE, "flow", 6, "dark", "svg")).toBe(
      "espresso-brownies-flow-serves-6-dark.svg",
    );
  });

  it("serializes a self-contained SVG with an embedded font", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(["font-data"], { type: "font/woff2" }),
      }),
    );
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 100 80");
    Object.defineProperty(svg, "viewBox", {
      value: { baseVal: { width: 100, height: 80 } },
    });
    svg.innerHTML = "<text x='10' y='20'>Recipe</text>";
    const serialized = await serializeSvg(svg);
    expect(serialized).toContain('<?xml version="1.0"');
    expect(serialized).toContain("@font-face");
    expect(serialized).toContain("data:font/woff2");
    expect(serialized).toContain('width="100"');
    expect(serialized).toContain(">Recipe</text>");
    const rasterSource = await serializeSvg(svg, { width: 50, height: 40 });
    expect(rasterSource).toContain('width="50"');
    expect(rasterSource).toContain('viewBox="0 0 100 80"');
  });
});

describe("PNG raster bounds", () => {
  it("keeps 2x resolution for ordinary diagrams", () => {
    expect(getPngDimensions(1800, 2200)).toEqual({ width: 3600, height: 4400 });
  });
  it.each([
    [6000, 90000],
    [2000, 13000],
    [12000, 8000],
  ])("safely fits a %i by %i artboard", (width, height) => {
    const output = getPngDimensions(width, height);
    expect(Math.max(output.width, output.height)).toBeLessThanOrEqual(16384);
    expect(output.width * output.height).toBeLessThanOrEqual(32_000_000);
    expect(output.width / output.height).toBeCloseTo(width / height, 2);
  });
  it("rejects invalid dimensions", () => {
    expect(() => getPngDimensions(Infinity, 10)).toThrow();
    expect(() => getPngDimensions(100, 0)).toThrow();
  });
});
