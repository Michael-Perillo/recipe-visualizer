import { useLayoutEffect, useState, type RefObject } from "react";

/** Keep instruction type readable when an SVG artboard is fitted to its viewport. */
export function useDiagramDisplayWidth(
  svgRef: RefObject<SVGSVGElement | null>,
  preferredWidth?: number,
) {
  const [measuredWidth, setMeasuredWidth] = useState<number>();
  useLayoutEffect(() => {
    if (preferredWidth !== undefined) return;
    const svg = svgRef.current;
    if (!svg) return;
    const measure = () => {
      const width = Math.floor(svg.clientWidth);
      if (width > 0) setMeasuredWidth(width);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [preferredWidth, svgRef]);
  return preferredWidth ?? measuredWidth;
}
