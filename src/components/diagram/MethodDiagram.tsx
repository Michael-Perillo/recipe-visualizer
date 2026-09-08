import { useRef } from "react";
import type { RecipeStep, Theme } from "../../domain/types";
import { DiagramMethodKey, getMethodKeyLayout, PALETTES } from "./shared";
import { useDiagramDisplayWidth } from "./useDiagramDisplayWidth";

/** The same responsive method surface in the workspace and isolated stories. */
export function MethodDiagram({
  steps,
  theme,
  maxWidth,
}: {
  steps: RecipeStep[];
  theme: Theme;
  maxWidth?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const measuredWidth = useDiagramDisplayWidth(svgRef);
  const width = measuredWidth ?? maxWidth ?? 1000;
  const layout = getMethodKeyLayout(steps, width);
  return (
    <svg
      ref={svgRef}
      data-testid="method-artboard"
      role="img"
      aria-label="Numbered method cards"
      viewBox={`0 0 ${width} ${layout.height + 32}`}
      style={{
        display: "block",
        width: "100%",
        maxWidth,
        background: PALETTES[theme].bg,
      }}
    >
      <DiagramMethodKey
        layout={layout}
        y={16}
        width={width}
        palette={PALETTES[theme]}
      />
    </svg>
  );
}
