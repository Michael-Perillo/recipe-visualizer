import type { RefObject } from "react";
import { useDiagramDisplayWidth } from "./useDiagramDisplayWidth";
import {
  buildRecipeGraph,
  formatStepTiming,
  isIngredientFeatured,
  resolveIngredientStyle,
  scaleIngredient,
} from "../../domain/recipe";
import type { RecipeDocumentV1, Theme } from "../../domain/types";
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
} from "./shared";

export function MatrixDiagram({
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
  const ingredientWidth = 455;
  const rightMargin = 54;
  const minimumOperationWidth = 170;
  const width = Math.max(
    1500,
    ingredientWidth + rightMargin + graph.maxDepth * minimumOperationWidth,
  );
  const footerHeight = 96;
  const headerLayout = getDiagramHeaderLayout(
    recipe.title,
    recipe.prepNotes,
    width,
  );
  const headerHeight = headerLayout.height;
  const tableTop = headerHeight + 30;
  const scaledIngredients = new Map(
    graph.ingredientOrder.map((ingredient) => [
      ingredient.id,
      scaleIngredient(ingredient, recipe.baseServings, servings),
    ]),
  );
  const operationWidth =
    (width - ingredientWidth - rightMargin) / graph.maxDepth;
  const operationCharacters = Math.max(
    10,
    Math.floor((operationWidth - 34) / 12),
  );
  const usedStyles = getUsedStyles([...scaledIngredients.values()]);
  const stepNumbers = new Map(
    graph.stepOrder.map((step, index) => [step.id, index + 1]),
  );
  const maximumIngredientHeight = Math.max(
    0,
    ...[...scaledIngredients.values()].map(
      (ingredient) => getIngredientLabelLayout(ingredient, 31).height,
    ),
  );
  const requiredRowHeight = Math.max(
    0,
    ...graph.stepOrder.map((step) => {
      const range = graph.stepRanges.get(step.id)!;
      const span = range.end - range.start + 1;
      const titleLines = splitText(
        `${stepNumbers.get(step.id)} · ${step.label}`,
        operationCharacters,
      );
      const metadata = [formatStepTiming(step), step.temperature]
        .filter(Boolean)
        .join(" • ");
      const metadataLines = metadata
        ? splitText(metadata, operationCharacters + 2)
        : [];
      const outputLines =
        step.id === recipe.finalStepId
          ? splitText(recipe.outputLabel, operationCharacters)
          : [];
      const contentHeight =
        titleLines.length * 25.96 +
        (metadataLines.length > 0 ? 10 + metadataLines.length * 17.7 : 0) +
        (outputLines.length > 0 ? 30 + outputLines.length * 14.16 : 0) +
        30;
      return (contentHeight + 14) / span;
    }),
  );
  const rowHeight = Math.max(
    82,
    maximumIngredientHeight + 24,
    requiredRowHeight,
  );
  const tableHeight = graph.ingredientOrder.length * rowHeight;
  const methodTop = tableTop + tableHeight + 54;
  const methodLayout = getMethodKeyLayout(
    graph.stepOrder,
    width,
    methodDisplayWidth,
  );
  const height =
    methodTop + (includeMethod ? methodLayout.height : 0) + footerHeight;

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
        layout={headerLayout}
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
        const featured = isIngredientFeatured(scaled);
        const consumer = graph.consumers.get(ingredient.id)!;
        const depth = graph.stepDepths.get(consumer) ?? 1;
        const targetX = ingredientWidth + (depth - 1) * operationWidth;
        return (
          <g
            key={ingredient.id}
            data-ingredient-id={ingredient.id}
            data-line-style={style}
            data-featured={featured ? "true" : undefined}
          >
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
            <circle
              cx={ingredientWidth - 13}
              cy={y + rowHeight / 2}
              r={featured ? 10 : 4.5}
              fill={featured ? palette.featured : styleColor(style, palette)}
              opacity={featured ? 0.22 : 1}
            />
            {featured ? (
              <circle
                cx={ingredientWidth - 13}
                cy={y + rowHeight / 2}
                r={4.5}
                fill={styleColor(style, palette)}
                stroke={palette.featured}
                strokeWidth={2}
              />
            ) : null}
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
        const timing = formatStepTiming(step);
        const stepNumber = stepNumbers.get(step.id)!;
        const title = `${stepNumber} · ${step.label}`;
        const titleLines = splitText(title, operationCharacters);
        const titleHeight = titleLines.length * 25.96;
        const metadata = [timing, step.temperature].filter(Boolean).join(" • ");
        const metadataLines = metadata
          ? splitText(metadata, operationCharacters + 2)
          : [];
        const metadataHeight = metadataLines.length * 17.7;
        const outputLines = isFinal
          ? splitText(recipe.outputLabel, operationCharacters)
          : [];
        const outputHeight = outputLines.length * 14.16 + 18;
        const contentHeight =
          titleHeight +
          (metadataLines.length > 0 ? 10 + metadataHeight : 0) +
          (isFinal ? 12 + outputHeight : 0);
        let contentY = centerY - contentHeight / 2;
        const titleY = contentY + titleHeight / 2;
        contentY += titleHeight;
        const metadataY = contentY + 10 + metadataHeight / 2;
        if (metadataLines.length > 0) contentY += 10 + metadataHeight;
        const outputTop = contentY + 12;

        return (
          <g key={step.id} data-testid="graph-operation">
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
              y={titleY}
              maxCharacters={operationCharacters}
              fill={isFinal ? palette.accentInk : palette.ink}
              fontSize={isFinal ? 25 : 22}
              fontWeight={820}
              anchor="middle"
            >
              {title}
            </SvgText>
            {metadata ? (
              <SvgText
                x={x + operationWidth / 2}
                y={metadataY}
                maxCharacters={operationCharacters + 2}
                fill={isFinal ? palette.accentInk : palette.muted}
                fontSize={14}
                fontWeight={700}
                anchor="middle"
              >
                {metadata}
              </SvgText>
            ) : null}
            {isFinal ? (
              <g>
                <rect
                  x={x + 17}
                  y={outputTop}
                  width={operationWidth - 34}
                  height={outputHeight}
                  rx={Math.min(18, outputHeight / 2)}
                  fill={palette.accentInk}
                  opacity={0.9}
                />
                <SvgText
                  x={x + operationWidth / 2}
                  y={outputTop + outputHeight / 2}
                  maxCharacters={operationCharacters}
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
