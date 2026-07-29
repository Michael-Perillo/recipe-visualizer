import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RECIPE } from "../data/defaultRecipe";
import { buildExportName, serializeSvg, slugify } from "./export";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("export helpers", () => {
  it("creates safe, descriptive filenames", () => {
    expect(slugify("  Crème brûlée!  ")).toBe("cr-me-br-l-e");
    expect(
      buildExportName(DEFAULT_RECIPE, "flow", 6, "dark", "svg"),
    ).toBe("espresso-brownies-flow-serves-6-dark.svg");
  });

  it("serializes a self-contained SVG with an embedded font", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(["font-data"], { type: "font/woff2" }),
      }),
    );
    const svg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
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
  });
});
