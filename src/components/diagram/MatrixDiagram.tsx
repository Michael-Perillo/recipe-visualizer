import type { RefObject } from "react";
import {
  buildRecipeGraph,
  resolveIngredientStyle,
  scaleIngredient,
} from "../../domain/recipe";
import type { RecipeDocumentV1, Theme } from "../../domain/types";
import {
  DiagramHeader,
  DiagramLegend,
  getUsedStyles,
  IngredientLabel,
  PALETTES,
  SvgText,
  styleColor,
} from "./shared";

export function MatrixDiagram({
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
  const width = 1500;
  const headerHeight = 184;
  const rowHeight = 82;
  const footerHeight = 116;
  const tableTop = headerHeight + 30;
  const tableHeight = graph.ingredientOrder.length * rowHeight;
  const height = tableTop + tableHeight + footerHeight;
  const ingredientWidth = 455;
  const rightMargin = 54;
  const operationWidth = (width - ingredientWidth - rightMargin) / graph.maxDepth;
  const scaledIngredients = new Map(
    graph.ingredientOrder.map((ingredient) => [
      ingredient.id,
      scaleIngredient(ingredient, recipe.baseServings, servings),
    ]),
  );
  const usedStyles = getUsedStyles([...scaledIngredients.values()]);

  return (
    <svg
      ref={svgRef}
      data-testid="recipe-artboard"
      data-view="matrix"
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby="matrix-title matrix-description"
      style={{ background: palette.bg }}
    >
      <title id="matrix-title">{`${recipe.title} matrix recipe diagram`}</title>
      <desc id="matrix-description">
        Ingredients arranged in rows and grouped by the operations that combine
        them into {recipe.outputLabel}.
      </desc>
      <rect width={width} height={height} fill={palette.bg} />
      <DiagramHeader
        title={recipe.title}
        servings={servings}
        prepNotes={recipe.prepNotes}
        viewLabel="Matrix recipe"
        width={width}
        palette={palette}
      />

      <rect
        x={54}
        y={tableTop}
        width={width - 108}
        height={tableHeight}
        rx={26}
        fill={palette.panel}
        stroke={palette.grid}
        strokeWidth={2}
      />

      {graph.ingredientOrder.map((ingredient, index) => {
        const y = tableTop + index * rowHeight;
        const scaled = scaledIngredients.get(ingredient.id)!;
        const style = resolveIngredientStyle(scaled);
        const consumer = graph.consumers.get(ingredient.id)!;
        const depth = graph.stepDepths.get(consumer) ?? 1;
        const targetX = ingredientWidth + (depth - 1) * operationWidth;
        return (
          <g key={ingredient.id}>
            <rect
              x={55}
              y={y + 1}
              width={ingredientWidth - 55}
              height={rowHeight - 2}
              fill={index % 2 === 0 ? palette.bg : palette.panel}
              opacity={index % 2 === 0 ? 0.8 : 1}
            />
            <rect
              x={55}
              y={y + 1}
              width={7}
              height={rowHeight - 2}
              fill={styleColor(style, palette)}
            />
            <IngredientLabel
              ingredient={scaled}
              x={82}
              y={y + rowHeight / 2}
              maxCharacters={31}
              palette={palette}
            />
            <line
              x1={ingredientWidth - 2}
              y1={y + rowHeight / 2}
              x2={targetX}
              y2={y + rowHeight / 2}
              stroke={styleColor(style, palette)}
              strokeWidth={3}
              strokeDasharray={style === "dry" ? "12 8" : undefined}
              opacity={0.75}
            />
            {index > 0 ? (
              <line
                x1={55}
                y1={y}
                x2={width - rightMargin}
                y2={y}
                stroke={palette.grid}
                strokeWidth={1.5}
              />
            ) : null}
          </g>
        );
      })}

      {graph.stepOrder.map((step) => {
        const depth = graph.stepDepths.get(step.id)!;
        const range = graph.stepRanges.get(step.id)!;
        const x = ingredientWidth + (depth - 1) * operationWidth;
        const y = tableTop + range.start * rowHeight + 7;
        const operationHeight = (range.end - range.start + 1) * rowHeight - 14;
        const isFinal = step.id === recipe.finalStepId;
        const consumer = graph.consumers.get(step.id);
        const centerY = y + operationHeight / 2;
        const consumerDepth = consumer
          ? graph.stepDepths.get(consumer)
          : undefined;

        return (
          <g key={step.id}>
            {consumerDepth ? (
              <line
                x1={x + operationWidth - 10}
                y1={centerY}
                x2={ingredientWidth + (consumerDepth - 1) * operationWidth}
                y2={centerY}
                stroke={palette.ink}
                strokeWidth={3}
                opacity={0.7}
              />
            ) : null}
            <rect
              x={x + 7}
              y={y}
              width={operationWidth - 14}
              height={operationHeight}
              rx={isFinal ? 22 : 16}
              fill={isFinal ? palette.accent : palette.bg}
              stroke={isFinal ? palette.accent : palette.ink}
              strokeWidth={isFinal ? 0 : 2.5}
            />
            <SvgText
              x={x + operationWidth / 2}
              y={centerY - (step.details ? 17 : 0)}
              maxCharacters={14}
              fill={isFinal ? palette.accentInk : palette.ink}
              fontSize={isFinal ? 25 : 22}
              fontWeight={820}
              anchor="middle"
            >
              {step.label}
            </SvgText>
            {step.temperature ? (
              <SvgText
                x={x + operationWidth / 2}
                y={centerY + 20}
                maxCharacters={18}
                fill={isFinal ? palette.accentInk : palette.muted}
                fontSize={15}
                fontWeight={720}
                anchor="middle"
              >
                {step.temperature}
              </SvgText>
            ) : null}
            {step.durationMinutes !== undefined ? (
              <SvgText
                x={x + operationWidth / 2}
                y={centerY + 46}
                fill={isFinal ? palette.accentInk : palette.muted}
                fontSize={14}
                fontWeight={650}
                anchor="middle"
              >
                {`${step.durationMinutes} min`}
              </SvgText>
            ) : null}
            {isFinal ? (
              <g>
                <rect
                  x={x + operationWidth / 2 - 68}
                  y={centerY + 80}
                  width={136}
                  height={36}
                  rx={18}
                  fill={palette.accentInk}
                  opacity={0.9}
                />
                <SvgText
                  x={x + operationWidth / 2}
                  y={centerY + 98}
                  maxCharacters={15}
                  fill={palette.accent}
                  fontSize={12}
                  fontWeight={760}
                  anchor="middle"
                >
                  {recipe.outputLabel}
                </SvgText>
              </g>
            ) : null}
          </g>
        );
      })}

      <DiagramLegend
        styles={usedStyles}
        x={62}
        y={height - 55}
        palette={palette}
      />
      <SvgText
        x={width - 60}
        y={height - 55}
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
