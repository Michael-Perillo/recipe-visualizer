import { describe, expect, it } from "vitest";
import { getBalancedMapWidth } from "./RecipeDiagram";

describe("balanced map sizing", () => {
  it("fits ordinary desktop panels without stretching up to native size", () => {
    expect(getBalancedMapWidth(1576, 1100)).toBe(1100);
    expect(getBalancedMapWidth(900, 1400)).toBe(765);
  });
  it("bounds text reduction on narrow panels while allowing explicit zoom", () => {
    expect(getBalancedMapWidth(1576, 700)).toBeCloseTo(1024.4);
    expect(getBalancedMapWidth(1576, 700, 150)).toBeCloseTo(1536.6);
    expect((20 * getBalancedMapWidth(1576, 366)) / 1576).toBeCloseTo(13);
  });
});
