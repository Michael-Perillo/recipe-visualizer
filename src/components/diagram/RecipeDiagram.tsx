import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { buildRecipeGraph } from "../../domain/recipe";
import type { DiagramView, RecipeDocumentV1, Theme } from "../../domain/types";
import { FlowDiagram } from "./FlowDiagram";
import { MatrixDiagram } from "./MatrixDiagram";
import { MethodDiagram } from "./MethodDiagram";

/** Fit compact maps where possible without reducing primary labels below 13px. */
export function getBalancedMapWidth(
  nativeWidth: number,
  availableWidth: number,
  zoom = 100,
) {
  return (
    (Math.min(
      nativeWidth * 0.85,
      Math.max(availableWidth, nativeWidth * 0.65),
    ) *
      zoom) /
    100
  );
}

export function RecipeDiagram({
  recipe,
  servings,
  theme,
  view,
  svgRef,
  zoom = 100,
}: {
  recipe: RecipeDocumentV1;
  servings: number;
  theme: Theme;
  view: DiagramView;
  svgRef: RefObject<SVGSVGElement | null>;
  zoom?: number;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const methodRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ native: 1500, available: 0 });
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const svg = svgRef.current;
    if (!viewport || !svg) return;
    const measure = () => {
      const native = svg.viewBox.baseVal.width;
      const available = viewport.clientWidth;
      setDimensions((previous) =>
        previous.native === native && previous.available === available
          ? previous
          : { native, available },
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [recipe, svgRef, view]);
  const graph = buildRecipeGraph(recipe);
  if (!graph) return null;
  const Diagram = view === "flow" ? FlowDiagram : MatrixDiagram;
  const graphWidth = getBalancedMapWidth(
    dimensions.native,
    dimensions.available,
    zoom,
  );
  const needsPan = graphWidth > dimensions.available + 1;
  return (
    <div className="recipe-diagram" data-testid="recipe-diagram">
      <div className="diagram-paper">
        <div className="diagram-map-toolbar">
          <span>
            {view === "flow" ? "Flow map" : "Matrix map"} ·{" "}
            {needsPan ? "scroll for more" : "overview"}
          </span>
          <button
            type="button"
            onClick={() =>
              methodRef.current?.scrollIntoView({
                block: "start",
                behavior: "smooth",
              })
            }
          >
            Method ↓
          </button>
        </div>
        <div
          ref={viewportRef}
          data-testid="graph-scroll-area"
          className="diagram-graph-scroll thin-scrollbar"
          role="region"
          aria-label="Recipe map — scroll horizontally and vertically to explore"
          tabIndex={0}
        >
          <div style={{ width: graphWidth, marginInline: "auto" }}>
            <Diagram
              recipe={recipe}
              servings={servings}
              theme={theme}
              svgRef={svgRef}
              includeMethod={false}
            />
          </div>
        </div>
      </div>
      <div ref={methodRef} className="diagram-paper diagram-method-paper">
        <MethodDiagram steps={graph.stepOrder} theme={theme} />
      </div>
    </div>
  );
}
