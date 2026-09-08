import manropeFontUrl from "@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2?url";
import type { DiagramView, RecipeDocumentV1, Theme } from "../domain/types";
import { createElement } from "react";
import { buildRecipeGraph } from "../domain/recipe";
import {
  DiagramMethodKey,
  getMethodKeyLayout,
  PALETTES,
} from "../components/diagram/shared";

let embeddedFontData: string | null = null;

/** Export a complete sheet at a consistent type scale, independent of map pan/zoom. */
export async function composeRecipeExport(
  svg: SVGSVGElement,
  recipe: RecipeDocumentV1,
  theme: Theme,
): Promise<SVGSVGElement> {
  const graph = buildRecipeGraph(recipe);
  if (!graph) throw new Error("Connect the recipe before exporting.");
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const [, , width, graphHeight] = (svg.getAttribute("viewBox") ?? "")
    .split(/\s+/)
    .map(Number);
  if (
    ![width, graphHeight].every((value) => Number.isFinite(value) && value > 0)
  ) {
    throw new Error("The diagram has invalid export dimensions.");
  }
  const layout = getMethodKeyLayout(graph.stepOrder, width);
  // Load the static renderer only when exporting, not in the initial app bundle.
  const { renderToStaticMarkup } = await import("react-dom/server");
  const markup = renderToStaticMarkup(
    createElement(DiagramMethodKey, {
      layout,
      width,
      y: graphHeight + 16,
      palette: PALETTES[theme],
    }),
  );
  const parsed = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`,
    "image/svg+xml",
  );
  clone.append(
    document.importNode(parsed.documentElement.firstElementChild!, true),
  );
  const height = graphHeight + layout.height + 32;
  clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const background = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect",
  );
  background.setAttribute("width", String(width));
  background.setAttribute("height", String(height));
  background.setAttribute("fill", PALETTES[theme].bg);
  clone.prepend(background);
  return clone;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function getEmbeddedFontData(): Promise<string> {
  if (embeddedFontData) return embeddedFontData;
  const response = await fetch(manropeFontUrl);
  if (!response.ok) throw new Error("Could not load the diagram font.");
  embeddedFontData = await blobToDataUrl(await response.blob());
  return embeddedFontData;
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "recipe"
  );
}

export function buildExportName(
  recipe: RecipeDocumentV1,
  view: DiagramView,
  servings: number,
  theme: Theme,
  extension: "svg" | "png" | "json",
): string {
  return `${slugify(recipe.title)}-${view}-serves-${servings}-${theme}.${extension}`;
}

export async function serializeSvg(
  svg: SVGSVGElement,
  outputSize?: { width: number; height: number },
): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  const viewBox = clone.viewBox.baseVal;
  if (viewBox.width && viewBox.height) {
    clone.setAttribute("width", String(outputSize?.width ?? viewBox.width));
    clone.setAttribute("height", String(outputSize?.height ?? viewBox.height));
  }

  const fontData = await getEmbeddedFontData();
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `
    @font-face {
      font-family: "Manrope Variable";
      src: url("${fontData}") format("woff2");
      font-style: normal;
      font-weight: 200 800;
    }
    text { font-family: "Manrope Variable", Manrope, Arial, sans-serif; }
  `;
  clone.insertBefore(style, clone.firstChild);

  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function downloadSvg(
  svg: SVGSVGElement,
  filename: string,
): Promise<void> {
  const serialized = await serializeSvg(svg);
  downloadBlob(
    new Blob([serialized], { type: "image/svg+xml;charset=utf-8" }),
    filename,
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not render the SVG."));
    image.src = url;
  });
}

export function getPngDimensions(
  width: number,
  height: number,
  requestedScale = 2,
) {
  if (
    ![width, height, requestedScale].every(
      (value) => Number.isFinite(value) && value > 0,
    )
  ) {
    throw new Error("The diagram has invalid export dimensions.");
  }
  // Responsive single-column methods can be very tall. Bound both the canvas
  // and SVG decoder instead of asking mobile browsers for enormous bitmaps.
  const scale = Math.min(
    requestedScale,
    16384 / Math.max(width, height),
    Math.sqrt(32_000_000 / (width * height)),
  );
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}

export async function downloadPng(
  svg: SVGSVGElement,
  filename: string,
  scale = 2,
): Promise<void> {
  const viewBox = svg.viewBox.baseVal;
  const size = getPngDimensions(viewBox.width, viewBox.height, scale);
  const serialized = await serializeSvg(svg, size);
  const svgBlob = new Blob([serialized], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas export is not available.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Could not create the PNG.")),
        "image/png",
      );
    });
    downloadBlob(png, filename);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadRecipeJson(recipe: RecipeDocumentV1): void {
  downloadBlob(
    new Blob([JSON.stringify(recipe, null, 2)], {
      type: "application/json;charset=utf-8",
    }),
    `${slugify(recipe.title)}.recipe.json`,
  );
}

export function downloadRecoveryJson(raw: string): void {
  downloadBlob(
    new Blob([raw], { type: "application/json;charset=utf-8" }),
    "recipe-visualizer-recovery.json",
  );
}
