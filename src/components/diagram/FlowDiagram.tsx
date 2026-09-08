import type { RefObject } from "react";
import { useDiagramDisplayWidth } from "./useDiagramDisplayWidth";
import {
  buildRecipeGraph,
  formatStepTiming,
  isIngredientFeatured,
  resolveIngredientStyle,
  scaleIngredient,
} from "../../domain/recipe";
import type {
  RecipeDocumentV1,
  ResolvedIngredientStyle,
  Theme,
} from "../../domain/types";
import {
  DiagramHeader,
  DiagramLegend,
  DiagramMethodKey,
  getDiagramHeaderLayout,
  getIngredientLabelLayout,
  getMethodKeyLayout,
  getUsedStyles,
  IngredientLabel,
  PALETTES,
  splitText,
  SvgText,
  styleColor,
  type DiagramPalette,
} from "./shared";

type Point = { x: number; y: number };

type InboundSource = {
  id: string;
  sourceY: number;
};

const REGULAR_NODE_RADIUS = 17;
const REGULAR_NODE_STROKE = 7;
const DENSE_NODE_RADIUS = 19;
const DENSE_NODE_STROKE = 5.5;

function roundCoordinate(value: number): number {
  return Math.round(value * 10) / 10;
}

export function getOperationNodeMetrics(inputCount: number) {
  const isDense = inputCount >= 4;
  const radius = isDense ? DENSE_NODE_RADIUS : REGULAR_NODE_RADIUS;
  const strokeWidth = isDense ? DENSE_NODE_STROKE : REGULAR_NODE_STROKE;

  return {
    radius,
    strokeWidth,
    boundaryRadius: radius + strokeWidth / 2,
  };
}

export function createInboundAnchors(
  sources: InboundSource[],
  position: Point,
  isFinal: boolean,
): Map<string, Point> {
  if (isFinal) {
    return new Map(
      sources.map(({ id }) => [id, { x: position.x - 104, y: position.y }]),
    );
  }

  const orderedSources = sources
    .map((source, index) => ({ ...source, index }))
    .sort(
      (left, right) => left.sourceY - right.sourceY || left.index - right.index,
    );
  const metrics = getOperationNodeMetrics(sources.length);
  const span =
    sources.length >= 4
      ? 150
      : Math.min(72, Math.max(0, (sources.length - 1) * 36));
  const anchors = new Map<string, Point>();

  orderedSources.forEach((source, index) => {
    const progress =
      orderedSources.length === 1 ? 0.5 : index / (orderedSources.length - 1);
    const angle = 180 + span / 2 - progress * span;
    const radians = (angle * Math.PI) / 180;
    anchors.set(source.id, {
      x: roundCoordinate(
        position.x + Math.cos(radians) * metrics.boundaryRadius,
      ),
      y: roundCoordinate(
        position.y + Math.sin(radians) * metrics.boundaryRadius,
      ),
    });
  });

  return anchors;
}

export function createStraightPath(start: Point, end: Point): string {
  const bendX = Math.max(start.x + 28, end.x - 72);
  return `M ${start.x} ${start.y} L ${bendX} ${start.y} L ${end.x} ${end.y}`;
}

export function createWavePath(start: Point, end: Point): string {
  const bendX = Math.max(start.x + 36, end.x - 76);
  const path = createWaveSegment(start, bendX);
  return `${path} Q ${bendX + 34} ${start.y} ${end.x} ${end.y}`;
}

function createWaveSegment(start: Point, endX: number): string {
  const distance = Math.max(1, endX - start.x);
  const waves = Math.max(2, Math.round(distance / 34));
  const segment = distance / waves;
  let path = `M ${start.x} ${start.y}`;
  for (let index = 0; index < waves; index += 1) {
    const x1 = start.x + index * segment;
    const x2 = x1 + segment;
    const mid = x1 + segment / 2;
    path += ` Q ${x1 + segment / 4} ${start.y - 10} ${mid} ${start.y}`;
    path += ` Q ${x1 + (segment * 3) / 4} ${start.y + 10} ${x2} ${start.y}`;
  }
  return path;
}

export function createNeutralPath(start: Point, end: Point): string {
  const midpoint = start.x + (end.x - start.x) * 0.55;
  return `M ${start.x} ${start.y} C ${midpoint} ${start.y}, ${midpoint} ${end.y}, ${end.x} ${end.y}`;
}

export function pathForStyle(
  style: ResolvedIngredientStyle,
  start: Point,
  end: Point,
): string {
  if (style === "liquid") return createWavePath(start, end);
  if (style === "neutral") return createNeutralPath(start, end);
  return createStraightPath(start, end);
}

export function createAnchoredPath(
  style: ResolvedIngredientStyle,
  start: Point,
  end: Point,
  targetCenter: Point,
): string {
  const deltaX = end.x - targetCenter.x;
  const deltaY = end.y - targetCenter.y;
  const distance = Math.hypot(deltaX, deltaY) || 1;
  const horizontalDistance = Math.max(1, end.x - start.x);
  const verticalDistance = Math.abs(end.y - start.y);
  const desiredCurveWidth = Math.min(260, 92 + verticalDistance * 0.62);
  const curveWidth = Math.min(
    desiredCurveWidth,
    Math.max(42, horizontalDistance - 28),
  );
  const curveStartX = roundCoordinate(Math.max(start.x, end.x - curveWidth));
  const curveDistance = Math.max(1, end.x - curveStartX);
  const firstControl = {
    x: roundCoordinate(curveStartX + curveDistance * 0.42),
    y: start.y,
  };
  const radialControlDistance = Math.min(
    44,
    Math.max(28, curveDistance * 0.24),
  );
  const endControl = {
    x: roundCoordinate(end.x + (deltaX / distance) * radialControlDistance),
    y: roundCoordinate(end.y + (deltaY / distance) * radialControlDistance),
  };
  let approachPath: string;

  if (style === "liquid") {
    approachPath = createWaveSegment(start, curveStartX);
  } else {
    approachPath =
      curveStartX > start.x
        ? `M ${start.x} ${start.y} L ${curveStartX} ${start.y}`
        : `M ${start.x} ${start.y}`;
  }

  return `${approachPath} C ${firstControl.x} ${firstControl.y}, ${endControl.x} ${endControl.y}, ${end.x} ${end.y}`;
}

function LegendSample({
  style,
  x,
  y,
  palette,
}: {
  style: ResolvedIngredientStyle;
  x: number;
  y: number;
  palette: DiagramPalette;
}) {
  if (style === "featured") {
    return (
      <g>
        <circle
          cx={x + 24}
          cy={y}
          r={10}
          fill={palette.featured}
          opacity={0.2}
        />
        <circle cx={x + 24} cy={y} r={5} fill={palette.featured} />
      </g>
    );
  }

  return (
    <path
      d={pathForStyle(style, { x, y }, { x: x + 48, y })}
      fill="none"
      stroke={styleColor(style, palette)}
      strokeWidth={3.5}
      strokeLinecap="round"
    />
  );
}

export function getFlowOutputLayout(label: string, finalStepX: number) {
  // Keep the finished dish in the final block instead of reserving an entire
  // extra column. Twelve 16px-wide glyphs still leave generous inner padding.
  const lines = splitText(label, 12);
  return {
    width: finalStepX + 166,
    centerX: finalStepX,
    lines,
  };
}

export function FlowDiagram({
  recipe,
  servings,
  theme,
  svgRef,
  displayWidth,
  includeMethod = true,
}: {
  recipe: RecipeDocumentV1;
  servings: number;
  theme: Theme;
  svgRef: RefObject<SVGSVGElement | null>;
  displayWidth?: number;
  includeMethod?: boolean;
}) {
  const methodDisplayWidth = useDiagramDisplayWidth(svgRef, displayWidth);
  const graph = buildRecipeGraph(recipe);
  if (!graph) return null;

  const palette = PALETTES[theme];
  const ingredientLineX = 340;
  const firstStepX = 470;
  const stepGap = 180;
  const finalStepX =
    firstStepX + (graph.maxDepth - 1) * stepGap + (graph.maxDepth > 1 ? 40 : 0);
  const outputLayout = getFlowOutputLayout(recipe.outputLabel, finalStepX);
  const width = Math.max(900, outputLayout.width);
  const headerLayout = getDiagramHeaderLayout(
    recipe.title,
    recipe.prepNotes,
    width,
  );
  const headerHeight = headerLayout.height;
  const footerHeight = 116;
  const diagramTop = headerHeight + 34;
  const scaledIngredients = new Map(
    graph.ingredientOrder.map((ingredient) => [
      ingredient.id,
      scaleIngredient(ingredient, recipe.baseServings, servings),
    ]),
  );
  const stepNumbers = new Map(
    graph.stepOrder.map((step, index) => [step.id, index + 1]),
  );
  const maximumIngredientHeight = Math.max(
    0,
    ...[...scaledIngredients.values()].map(
      (ingredient) => getIngredientLabelLayout(ingredient, 24).height,
    ),
  );
  const operationExtents = graph.stepOrder.map((step) => {
    const range = graph.stepRanges.get(step.id)!;
    const isFinal = step.id === recipe.finalStepId;
    const titleLines = splitText(
      `${stepNumbers.get(step.id)} · ${step.label}`,
      isFinal ? 18 : 14,
    );
    const metadata = isFinal
      ? [formatStepTiming(step), step.temperature].filter(Boolean).join(" • ")
      : formatStepTiming(step);
    const timingLines = metadata ? splitText(metadata, isFinal ? 18 : 14) : [];
    const center = (range.start + range.end) / 2 + 0.5;
    const depth = graph.stepDepths.get(step.id)!;
    if (isFinal) {
      const halfHeight =
        Math.max(
          154,
          36 +
            titleLines.length * 30.68 +
            (timingLines.length ? 14 + timingLines.length * 20.06 : 0) +
            40 +
            outputLayout.lines.length * 18.88,
        ) / 2;
      return { center, depth, top: halfHeight, bottom: halfHeight };
    }
    const radius = getOperationNodeMetrics(step.inputs.length).boundaryRadius;
    const labelHeight =
      20 +
      titleLines.length * 23.6 +
      (timingLines.length ? 8 + timingLines.length * 17.7 : 0);
    const labelExtent = radius + 14 + labelHeight;
    return {
      center,
      depth,
      top: step.inputs.length >= 4 ? labelExtent : radius,
      bottom: step.inputs.length >= 4 ? radius : labelExtent,
    };
  });
  // Only adjacent operations in the same column constrain row spacing. A tall
  // label on a branch spanning many ingredients needn't inflate every row.
  const operationRowHeights = operationExtents.flatMap((operation) => {
    const next = operationExtents
      .filter(
        (candidate) =>
          candidate.depth === operation.depth &&
          candidate.center > operation.center,
      )
      .sort((a, b) => a.center - b.center)[0];
    return [
      (operation.top + 16) / operation.center,
      (operation.bottom + 16) /
        (graph.ingredientOrder.length - operation.center),
      next
        ? (operation.bottom + next.top + 16) / (next.center - operation.center)
        : 0,
    ];
  });
  const rowHeight = Math.max(
    78,
    maximumIngredientHeight + 24,
    ...operationRowHeights,
  );
  const diagramHeight = graph.ingredientOrder.length * rowHeight;
  const methodTop = diagramTop + diagramHeight + 70;
  const methodLayout = getMethodKeyLayout(
    graph.stepOrder,
    width,
    methodDisplayWidth,
  );
  const height =
    methodTop + (includeMethod ? methodLayout.height : 0) + footerHeight;
  const ingredientYPositions = new Map(
    graph.ingredientOrder.map((ingredient, index) => [
      ingredient.id,
      diagramTop + index * rowHeight + rowHeight / 2,
    ]),
  );
  const usedStyles = getUsedStyles([...scaledIngredients.values()]);
  const stepPositions = new Map<string, Point>();

  for (const step of graph.stepOrder) {
    const depth = graph.stepDepths.get(step.id)!;
    const range = graph.stepRanges.get(step.id)!;
    const x =
      step.id === recipe.finalStepId
        ? finalStepX
        : firstStepX + (depth - 1) * stepGap;
    const y =
      diagramTop + ((range.start + range.end) / 2) * rowHeight + rowHeight / 2;
    stepPositions.set(step.id, { x, y });
  }

  const inboundAnchors = new Map<string, Map<string, Point>>();
  for (const step of graph.stepOrder) {
    const position = stepPositions.get(step.id)!;
    const sources = step.inputs.map((input) => {
      if (input.kind === "step") {
        return {
          id: input.id,
          sourceY: stepPositions.get(input.id)?.y ?? position.y,
        };
      }

      return {
        id: input.id,
        sourceY: ingredientYPositions.get(input.id) ?? position.y,
      };
    });
    inboundAnchors.set(
      step.id,
      createInboundAnchors(sources, position, step.id === recipe.finalStepId),
    );
  }

  return (
    <svg
      ref={svgRef}
      data-testid="recipe-artboard"
      data-view="flow"
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby="flow-title flow-description"
      style={{ background: palette.bg }}
    >
      <title id="flow-title">{`${recipe.title} flow recipe diagram`}</title>
      <desc id="flow-description">
        Ingredients flow from left to right through preparation operations and
        become {recipe.outputLabel}.
      </desc>
      <defs>
        <pattern
          id={`grid-${theme}`}
          width="32"
          height="32"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 32 0 L 0 0 0 32"
            fill="none"
            stroke={palette.grid}
            strokeWidth={1}
            opacity={0.35}
          />
        </pattern>
      </defs>
      <rect width={width} height={height} fill={palette.bg} />
      <rect
        data-testid="flow-graph-bounds"
        x={30}
        y={diagramTop - 18}
        width={width - 60}
        height={diagramHeight + 36}
        rx={30}
        fill={`url(#grid-${theme})`}
        stroke={palette.grid}
        strokeWidth={1.5}
      />
      <DiagramHeader
        title={recipe.title}
        servings={servings}
        prepNotes={recipe.prepNotes}
        viewLabel="Flow recipe"
        width={width}
        palette={palette}
        layout={headerLayout}
      />

      {graph.ingredientOrder.map((ingredient, index) => {
        const scaled = scaledIngredients.get(ingredient.id)!;
        const style = resolveIngredientStyle(scaled);
        const featured = isIngredientFeatured(scaled);
        const consumer = graph.consumers.get(ingredient.id)!;
        const consumerStep = recipe.steps.find((step) => step.id === consumer)!;
        const target = stepPositions.get(consumer)!;
        const y = diagramTop + index * rowHeight + rowHeight / 2;
        const inboundPoint = inboundAnchors
          .get(consumerStep.id)!
          .get(ingredient.id)!;
        return (
          <g
            key={ingredient.id}
            data-ingredient-id={ingredient.id}
            data-line-style={style}
            data-featured={featured ? "true" : undefined}
          >
            <IngredientLabel
              ingredient={scaled}
              x={300}
              y={y}
              palette={palette}
              anchor="end"
              maxCharacters={24}
            />
            <circle
              cx={ingredientLineX}
              cy={y}
              r={featured ? 11 : 5}
              fill={featured ? palette.featured : styleColor(style, palette)}
              opacity={featured ? 0.22 : 1}
            />
            {featured ? (
              <circle
                cx={ingredientLineX}
                cy={y}
                r={5}
                fill={styleColor(style, palette)}
                stroke={palette.featured}
                strokeWidth={2}
              />
            ) : null}
            <path
              d={createAnchoredPath(
                style,
                { x: ingredientLineX, y },
                inboundPoint,
                target,
              )}
              fill="none"
              stroke={styleColor(style, palette)}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      })}

      {graph.stepOrder.map((step) => {
        const position = stepPositions.get(step.id)!;
        const isFinal = step.id === recipe.finalStepId;
        const consumerId = graph.consumers.get(step.id);
        const target = consumerId ? stepPositions.get(consumerId) : undefined;
        const targetStep = consumerId
          ? recipe.steps.find((candidate) => candidate.id === consumerId)
          : undefined;
        const inboundPoint =
          target && targetStep
            ? inboundAnchors.get(targetStep.id)?.get(step.id)
            : undefined;
        const hasDenseInputs = step.inputs.length >= 4;
        const nodeMetrics = getOperationNodeMetrics(step.inputs.length);
        const stepNumber = stepNumbers.get(step.id)!;
        const timing = formatStepTiming(step);
        const nodeTitle = `${stepNumber} · ${step.label}`;
        const nodeFontSize = 20;
        const nodeTitleLines = splitText(nodeTitle, 14);
        const nodeTitleHeight = nodeTitleLines.length * nodeFontSize * 1.18;
        const nodeTimingLines = timing ? splitText(timing, 14) : [];
        const nodeTimingHeight = nodeTimingLines.length * 17.7;
        const nodeLabelWidth = 174;
        const nodeLabelHeight =
          20 +
          nodeTitleHeight +
          (nodeTimingLines.length > 0 ? 8 + nodeTimingHeight : 0);
        const labelCenterY = hasDenseInputs
          ? position.y - nodeMetrics.boundaryRadius - 14 - nodeLabelHeight / 2
          : position.y + nodeMetrics.boundaryRadius + 14 + nodeLabelHeight / 2;
        const nodeLabelTop = labelCenterY - nodeLabelHeight / 2;
        const nodeTitleY = nodeLabelTop + 10 + nodeTitleHeight / 2;
        const nodeTimingY =
          nodeLabelTop + 10 + nodeTitleHeight + 8 + nodeTimingHeight / 2;
        const finalTitleLines = splitText(nodeTitle, 18);
        const finalTitleHeight = finalTitleLines.length * 30.68;
        const finalMetadata = [timing, step.temperature]
          .filter(Boolean)
          .join(" • ");
        const finalMetadataLines = finalMetadata
          ? splitText(finalMetadata, 18)
          : [];
        const finalMetadataHeight = finalMetadataLines.length * 20.06;
        const finalBoxHeight = Math.max(
          154,
          36 +
            finalTitleHeight +
            (finalMetadataLines.length > 0 ? 14 + finalMetadataHeight : 0) +
            40 +
            outputLayout.lines.length * 18.88,
        );
        const finalBoxTop = position.y - finalBoxHeight / 2;
        const finalTitleY = finalBoxTop + 18 + finalTitleHeight / 2;
        const finalMetadataY =
          finalBoxTop + 18 + finalTitleHeight + 14 + finalMetadataHeight / 2;

        return (
          <g key={step.id} data-testid="graph-operation">
            {target && inboundPoint ? (
              <path
                d={createAnchoredPath(
                  "neutral",
                  {
                    x: position.x + nodeMetrics.boundaryRadius,
                    y: position.y,
                  },
                  inboundPoint,
                  target,
                )}
                fill="none"
                stroke={palette.ink}
                strokeWidth={4}
                strokeLinecap="round"
              />
            ) : null}

            {isFinal ? (
              <g>
                <rect
                  x={position.x - 112}
                  y={finalBoxTop}
                  width={224}
                  height={finalBoxHeight}
                  rx={28}
                  fill={palette.accent}
                  stroke={palette.accentInk}
                  strokeWidth={3}
                />
                <SvgText
                  x={position.x}
                  y={finalTitleY}
                  maxCharacters={18}
                  fill={palette.accentInk}
                  fontSize={26}
                  fontWeight={850}
                  anchor="middle"
                >
                  {`${stepNumber} · ${step.label}`}
                </SvgText>
                {finalMetadata ? (
                  <SvgText
                    x={position.x}
                    y={finalMetadataY}
                    maxCharacters={18}
                    fill={palette.accentInk}
                    fontSize={16}
                    fontWeight={720}
                    anchor="middle"
                  >
                    {finalMetadata}
                  </SvgText>
                ) : null}
                <g data-testid="flow-output-label">
                  <line
                    x1={position.x - 88}
                    x2={position.x + 88}
                    y1={
                      finalBoxTop +
                      finalBoxHeight -
                      30 -
                      outputLayout.lines.length * 18.88
                    }
                    y2={
                      finalBoxTop +
                      finalBoxHeight -
                      30 -
                      outputLayout.lines.length * 18.88
                    }
                    stroke={palette.accentInk}
                    opacity={0.2}
                  />
                  <SvgText
                    x={outputLayout.centerX}
                    y={
                      finalBoxTop +
                      finalBoxHeight -
                      18 -
                      (outputLayout.lines.length * 18.88) / 2
                    }
                    maxCharacters={12}
                    fill={palette.accentInk}
                    fontSize={16}
                    fontWeight={820}
                    anchor="middle"
                  >
                    {recipe.outputLabel}
                  </SvgText>
                </g>
              </g>
            ) : (
              <g>
                <circle
                  cx={position.x}
                  cy={position.y}
                  r={nodeMetrics.radius}
                  fill={palette.bg}
                  stroke={palette.accent}
                  strokeWidth={nodeMetrics.strokeWidth}
                />
                <circle
                  cx={position.x}
                  cy={position.y}
                  r={6}
                  fill={palette.ink}
                />
                <rect
                  x={position.x - nodeLabelWidth / 2}
                  y={nodeLabelTop}
                  width={nodeLabelWidth}
                  height={nodeLabelHeight}
                  rx={18}
                  fill={palette.panel}
                  stroke={palette.grid}
                  strokeWidth={1.5}
                />
                <SvgText
                  x={position.x}
                  y={nodeTitleY}
                  maxCharacters={14}
                  fill={palette.ink}
                  fontSize={nodeFontSize}
                  fontWeight={790}
                  anchor="middle"
                >
                  {nodeTitle}
                </SvgText>
                {timing ? (
                  <SvgText
                    x={position.x}
                    y={nodeTimingY}
                    maxCharacters={14}
                    fill={palette.muted}
                    fontSize={15}
                    fontWeight={700}
                    anchor="middle"
                  >
                    {timing}
                  </SvgText>
                ) : null}
              </g>
            )}
          </g>
        );
      })}

      {includeMethod ? (
        <DiagramMethodKey
          layout={methodLayout}
          y={methodTop}
          width={width}
          palette={palette}
        />
      ) : null}

      <DiagramLegend
        styles={usedStyles}
        x={58}
        y={height - 66}
        palette={palette}
        renderSample={(style, x, y) => (
          <LegendSample
            key={style}
            style={style}
            x={x}
            y={y}
            palette={palette}
          />
        )}
      />
      <SvgText
        x={width - 60}
        y={height - (width < 1100 ? 28 : 66)}
        fill={palette.muted}
        fontSize={13}
        fontWeight={700}
        anchor="end"
      >
        RECIPE VISUALIZER
      </SvgText>
    </svg>
  );
}
