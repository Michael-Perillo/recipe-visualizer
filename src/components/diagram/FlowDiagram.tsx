import type { RefObject } from "react";
import {
  buildRecipeGraph,
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
  getUsedStyles,
  IngredientLabel,
  PALETTES,
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
      sources.map(({ id }) => [
        id,
        { x: position.x - 104, y: position.y },
      ]),
    );
  }

  const orderedSources = sources
    .map((source, index) => ({ ...source, index }))
    .sort(
      (left, right) =>
        left.sourceY - right.sourceY || left.index - right.index,
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

export function createCoilPath(start: Point, end: Point): string {
  const bendX = Math.max(start.x + 42, end.x - 78);
  const path = createCoilSegment(start, bendX);
  return `${path} Q ${bendX + 34} ${start.y} ${end.x} ${end.y}`;
}

function createCoilSegment(start: Point, endX: number): string {
  const distance = Math.max(1, endX - start.x);
  const loops = Math.max(2, Math.round(distance / 27));
  const segment = distance / loops;
  let path = `M ${start.x} ${start.y}`;
  for (let index = 0; index < loops; index += 1) {
    const x = start.x + index * segment;
    path += ` C ${x + segment * 0.1} ${start.y - 18}, ${x + segment * 0.45} ${start.y - 18}, ${x + segment * 0.5} ${start.y}`;
    path += ` C ${x + segment * 0.55} ${start.y + 18}, ${x + segment * 0.9} ${start.y + 18}, ${x + segment} ${start.y}`;
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
  if (style === "featured") return createCoilPath(start, end);
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
  const curveStartX = roundCoordinate(
    Math.max(start.x, end.x - curveWidth),
  );
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
    x: roundCoordinate(
      end.x + (deltaX / distance) * radialControlDistance,
    ),
    y: roundCoordinate(
      end.y + (deltaY / distance) * radialControlDistance,
    ),
  };
  let approachPath: string;

  if (style === "liquid") {
    approachPath = createWaveSegment(start, curveStartX);
  } else if (style === "featured") {
    approachPath = createCoilSegment(start, curveStartX);
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

export function FlowDiagram({
  recipe,
  servings,
  theme,
  svgRef,
}: {
  recipe: RecipeDocumentV1;
  servings: number;
  theme: Theme;
  svgRef: RefObject<SVGSVGElement | null>;
}) {
  const graph = buildRecipeGraph(recipe);
  if (!graph) return null;

  const palette = PALETTES[theme];
  const width = 1740;
  const headerHeight = 184;
  const rowHeight = 78;
  const footerHeight = 140;
  const diagramTop = headerHeight + 34;
  const diagramHeight = graph.ingredientOrder.length * rowHeight;
  const height = diagramTop + diagramHeight + footerHeight;
  const ingredientLineX = 400;
  const firstStepX = 580;
  const finalStepX = 1410;
  const scaledIngredients = new Map(
    graph.ingredientOrder.map((ingredient) => [
      ingredient.id,
      scaleIngredient(ingredient, recipe.baseServings, servings),
    ]),
  );
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
      graph.maxDepth === 1
        ? finalStepX
        : firstStepX +
          ((depth - 1) / (graph.maxDepth - 1)) * (finalStepX - firstStepX);
    const y =
      diagramTop +
      ((range.start + range.end) / 2) * rowHeight +
      rowHeight / 2;
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
      createInboundAnchors(
        sources,
        position,
        step.id === recipe.finalStepId,
      ),
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
        <pattern id={`grid-${theme}`} width="32" height="32" patternUnits="userSpaceOnUse">
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
      />

      {graph.ingredientOrder.map((ingredient, index) => {
        const scaled = scaledIngredients.get(ingredient.id)!;
        const style = resolveIngredientStyle(scaled);
        const consumer = graph.consumers.get(ingredient.id)!;
        const consumerStep = recipe.steps.find((step) => step.id === consumer)!;
        const target = stepPositions.get(consumer)!;
        const y = diagramTop + index * rowHeight + rowHeight / 2;
        const inboundPoint = inboundAnchors
          .get(consumerStep.id)!
          .get(ingredient.id)!;
        return (
          <g key={ingredient.id}>
            <IngredientLabel
              ingredient={scaled}
              x={360}
              y={y}
              palette={palette}
              anchor="end"
              maxCharacters={27}
            />
            <circle
              cx={ingredientLineX}
              cy={y}
              r={5}
              fill={styleColor(style, palette)}
            />
            <path
              d={createAnchoredPath(
                style,
                { x: ingredientLineX, y },
                inboundPoint,
                target,
              )}
              fill="none"
              stroke={styleColor(style, palette)}
              strokeWidth={style === "featured" ? 3.2 : 3.5}
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
        const labelCenterY = hasDenseInputs
          ? position.y - 47
          : position.y + 48;

        return (
          <g key={step.id}>
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
                  x={position.x - 104}
                  y={position.y - 77}
                  width={208}
                  height={154}
                  rx={28}
                  fill={palette.accent}
                  stroke={palette.accentInk}
                  strokeWidth={3}
                />
                <SvgText
                  x={position.x}
                  y={position.y - 37}
                  fill={palette.accentInk}
                  fontSize={26}
                  fontWeight={850}
                  anchor="middle"
                >
                  {step.label}
                </SvgText>
                {step.temperature ? (
                  <SvgText
                    x={position.x}
                    y={position.y + 2}
                    maxCharacters={18}
                    fill={palette.accentInk}
                    fontSize={17}
                    fontWeight={750}
                    anchor="middle"
                  >
                    {step.temperature}
                  </SvgText>
                ) : null}
                {step.durationMinutes !== undefined ? (
                  <SvgText
                    x={position.x}
                    y={position.y + 40}
                    fill={palette.accentInk}
                    fontSize={16}
                    fontWeight={700}
                    anchor="middle"
                  >
                    {`${step.durationMinutes} min`}
                  </SvgText>
                ) : null}
                <path
                  d={`M ${position.x + 104} ${position.y} L 1590 ${position.y}`}
                  stroke={palette.accent}
                  strokeWidth={5}
                  strokeLinecap="round"
                />
                <circle
                  cx={1590}
                  cy={position.y}
                  r={9}
                  fill={palette.accent}
                />
                <SvgText
                  x={1660}
                  y={position.y}
                  maxCharacters={12}
                  fill={palette.ink}
                  fontSize={20}
                  fontWeight={820}
                  anchor="middle"
                >
                  {recipe.outputLabel}
                </SvgText>
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
                  x={position.x - (hasDenseInputs ? 46 : 61)}
                  y={labelCenterY - (hasDenseInputs ? 16 : 20.5)}
                  width={hasDenseInputs ? 92 : 122}
                  height={hasDenseInputs ? 32 : 41}
                  rx={hasDenseInputs ? 16 : 20.5}
                  fill={palette.panel}
                  stroke={palette.grid}
                  strokeWidth={1.5}
                />
                <SvgText
                  x={position.x}
                  y={labelCenterY}
                  maxCharacters={12}
                  fill={palette.ink}
                  fontSize={hasDenseInputs ? 15 : 16}
                  fontWeight={790}
                  anchor="middle"
                >
                  {step.label}
                </SvgText>
              </g>
            )}
          </g>
        );
      })}

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
        y={height - 66}
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
