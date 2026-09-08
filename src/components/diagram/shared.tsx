import type { ReactNode } from "react";
import type {
  Ingredient,
  RecipeStep,
  ResolvedIngredientStyle,
  Theme,
} from "../../domain/types";
import {
  formatAlternateMeasurements,
  formatIngredientQuantity,
  formatStepTiming,
  isIngredientFeatured,
  resolveIngredientStyle,
} from "../../domain/recipe";

export type DiagramPalette = {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  grid: string;
  accent: string;
  accentInk: string;
  dry: string;
  liquid: string;
  featured: string;
  neutral: string;
};

export const PALETTES: Record<Theme, DiagramPalette> = {
  light: {
    bg: "#FBFAF5",
    panel: "#EFEEE6",
    ink: "#171714",
    muted: "#6D6D64",
    grid: "#D8D6CC",
    accent: "#A5F52F",
    accentInk: "#13150F",
    dry: "#5F5CE6",
    liquid: "#008C95",
    featured: "#F05A45",
    neutral: "#68685F",
  },
  dark: {
    bg: "#11120F",
    panel: "#1D1F1A",
    ink: "#F7F4EA",
    muted: "#A7A89D",
    grid: "#34372F",
    accent: "#B8FF3D",
    accentInk: "#11130D",
    dry: "#A5A4FF",
    liquid: "#52D2D2",
    featured: "#FF8A76",
    neutral: "#BFC1B6",
  },
};

export const STYLE_LABELS: Record<ResolvedIngredientStyle, string> = {
  dry: "Dry",
  liquid: "Liquid",
  featured: "Featured",
  neutral: "Neutral",
};

export function styleColor(
  style: ResolvedIngredientStyle,
  palette: DiagramPalette,
): string {
  return palette[style];
}

export function splitText(
  value: string,
  maxCharacters: number,
  maxLines?: number,
): string[] {
  const normalized = value.trim();
  if (!normalized) return [""];
  const words = normalized.split(/\s+/).flatMap((word) => {
    if (word.length <= maxCharacters) return [word];
    const chunks: string[] = [];
    for (let index = 0; index < word.length; index += maxCharacters) {
      chunks.push(word.slice(index, index + maxCharacters));
    }
    return chunks;
  });
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    if (!line) {
      line = word;
    } else if (`${line} ${word}`.length <= maxCharacters) {
      line = `${line} ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (maxLines === undefined || lines.length <= maxLines) return lines;
  const visible = lines.slice(0, maxLines);
  const lastIndex = visible.length - 1;
  visible[lastIndex] =
    `${visible[lastIndex].slice(0, Math.max(1, maxCharacters - 1)).trimEnd()}…`;
  return visible;
}

type SvgTextProps = {
  children: string;
  x: number;
  y: number;
  maxCharacters?: number;
  maxLines?: number;
  lineHeight?: number;
  anchor?: "start" | "middle" | "end";
  fill: string;
  fontSize: number;
  fontWeight?: number;
  letterSpacing?: number;
  italic?: boolean;
};

export function SvgText({
  children,
  x,
  y,
  maxCharacters = 32,
  maxLines,
  lineHeight = 1.18,
  anchor = "start",
  fill,
  fontSize,
  fontWeight = 500,
  letterSpacing,
  italic,
}: SvgTextProps) {
  const lines = splitText(children, maxCharacters, maxLines);
  const lineHeightPx = fontSize * lineHeight;
  const startY = y - ((lines.length - 1) * lineHeightPx) / 2;

  return (
    <text
      x={x}
      y={startY}
      fill={fill}
      fontFamily='"Manrope Variable", Manrope, Arial, sans-serif'
      fontSize={fontSize}
      fontStyle={italic ? "italic" : undefined}
      fontWeight={fontWeight}
      letterSpacing={letterSpacing}
      textAnchor={anchor}
      dominantBaseline="middle"
    >
      {lines.map((line, index) => (
        <tspan
          key={`${line}-${index}`}
          x={x}
          dy={index === 0 ? 0 : lineHeightPx}
        >
          {line}
        </tspan>
      ))}
    </text>
  );
}

export function IngredientLabel({
  ingredient,
  x,
  y,
  palette,
  anchor = "start",
  maxCharacters = 24,
}: {
  ingredient: Ingredient;
  x: number;
  y: number;
  palette: DiagramPalette;
  anchor?: "start" | "middle" | "end";
  maxCharacters?: number;
}) {
  const layout = getIngredientLabelLayout(ingredient, maxCharacters);
  const top = y - layout.height / 2;
  const primaryHeight = layout.primaryLines.length * 22.42;
  const primaryY = top + primaryHeight / 2;

  const quantity = formatIngredientQuantity(ingredient);
  const label = [quantity, ingredient.name].filter(Boolean).join(" ");
  return (
    <g>
      <SvgText
        x={x}
        y={primaryY}
        maxCharacters={maxCharacters}
        fill={palette.ink}
        fontSize={19}
        fontWeight={720}
        anchor={anchor}
      >
        {label}
      </SvgText>
      {layout.supplemental.map((block, index) => {
        const blockHeight = block.lines.length * 14.16;
        const precedingHeight = layout.supplemental
          .slice(0, index)
          .reduce(
            (total, candidate) => total + candidate.lines.length * 14.16 + 3,
            0,
          );
        const blockY =
          top + primaryHeight + 6 + precedingHeight + blockHeight / 2;
        return (
          <SvgText
            key={`${block.text}-${index}`}
            x={x}
            y={blockY}
            maxCharacters={maxCharacters + 8}
            fill={palette.muted}
            fontSize={12}
            fontWeight={550}
            anchor={anchor}
          >
            {block.text}
          </SvgText>
        );
      })}
    </g>
  );
}

export function getIngredientLabelLayout(
  ingredient: Ingredient,
  maxCharacters: number,
) {
  const quantity = formatIngredientQuantity(ingredient);
  const label = [quantity, ingredient.name].filter(Boolean).join(" ");
  const alternateMeasurements = formatAlternateMeasurements(ingredient);
  const supplemental = [alternateMeasurements, ingredient.note]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((text) => ({
      text,
      lines: splitText(text, maxCharacters + 8),
    }));
  const primaryLines = splitText(label, maxCharacters);
  const height =
    primaryLines.length * 22.42 +
    (supplemental.length > 0 ? 6 : 0) +
    supplemental.reduce(
      (total, block, index) =>
        total +
        block.lines.length * 14.16 +
        (index < supplemental.length - 1 ? 3 : 0),
      0,
    );

  return { height, primaryLines, supplemental };
}

const HEADER_NOTE_COLUMNS = 2;
const HEADER_NOTE_GAP_X = 24;
const HEADER_NOTE_GAP_Y = 14;
const HEADER_NOTE_WIDTH = 276;
const HEADER_NOTE_LINE_CHARACTERS = 24;

type DiagramHeaderNoteLayout = {
  note: string;
  x: number;
  y: number;
  width: number;
  height: number;
  lines: string[];
};

export type DiagramHeaderLayout = {
  height: number;
  titleLines: string[];
  titleY: number;
  subtitleY: number;
  notes: DiagramHeaderNoteLayout[];
};

export function getDiagramHeaderLayout(
  title: string,
  prepNotes: string[],
  width: number,
): DiagramHeaderLayout {
  const titleCharacters = Math.min(
    34,
    Math.max(12, Math.floor((width - 176) / 26)),
  );
  const titleLines = splitText(title, titleCharacters);
  const titleLineHeight = 44.84;
  const titleTop = 38;
  const titleHeight = titleLines.length * titleLineHeight;
  const titleY = titleTop + titleHeight / 2;
  const subtitleY = titleTop + titleHeight + 22;
  const notesLeft = width - 54 - HEADER_NOTE_WIDTH * 2 - HEADER_NOTE_GAP_X;
  const titleRight =
    110 + Math.max(...titleLines.map((line) => line.length * 26));
  const notesTop = notesLeft >= titleRight + 24 ? 36 : subtitleY + 30;
  const cards = prepNotes.map((note, index) => {
    const lines = splitText(note, HEADER_NOTE_LINE_CHARACTERS);
    return {
      note,
      lines,
      column: index % HEADER_NOTE_COLUMNS,
      row: Math.floor(index / HEADER_NOTE_COLUMNS),
      height: Math.max(92, 38 + lines.length * 18),
    };
  });
  const rowCount = Math.ceil(cards.length / HEADER_NOTE_COLUMNS);
  const rowHeights = Array.from({ length: rowCount }, (_, row) =>
    Math.max(
      ...cards.filter((card) => card.row === row).map((card) => card.height),
    ),
  );
  const rowOffsets = rowHeights.map((_, row) =>
    rowHeights
      .slice(0, row)
      .reduce((total, height) => total + height + HEADER_NOTE_GAP_Y, 0),
  );
  const notes = cards.map(({ column, row, ...card }) => ({
    ...card,
    x:
      width -
      54 -
      HEADER_NOTE_WIDTH * HEADER_NOTE_COLUMNS -
      HEADER_NOTE_GAP_X * (HEADER_NOTE_COLUMNS - 1) +
      column * (HEADER_NOTE_WIDTH + HEADER_NOTE_GAP_X),
    y: notesTop + rowOffsets[row],
    width: HEADER_NOTE_WIDTH,
    height: rowHeights[row],
  }));
  const notesBottom = notes.reduce(
    (maximum, note) => Math.max(maximum, note.y + note.height),
    0,
  );
  const height = Math.max(184, subtitleY + 36, notesBottom + 30);

  return { height, titleLines, titleY, subtitleY, notes };
}

export function DiagramHeader({
  title,
  servings,
  prepNotes,
  viewLabel,
  width,
  palette,
  layout = getDiagramHeaderLayout(title, prepNotes, width),
}: {
  title: string;
  servings: number;
  prepNotes: string[];
  viewLabel: string;
  width: number;
  palette: DiagramPalette;
  layout?: DiagramHeaderLayout;
}) {
  return (
    <g>
      <rect
        x={0}
        y={0}
        width={width}
        height={layout.height}
        fill={palette.bg}
      />
      <rect x={54} y={40} width={10} height={64} rx={5} fill={palette.accent} />
      <SvgText
        x={88}
        y={layout.titleY}
        maxCharacters={Math.min(
          34,
          Math.max(12, Math.floor((width - 176) / 26)),
        )}
        fill={palette.ink}
        fontSize={38}
        fontWeight={820}
      >
        {title}
      </SvgText>
      <SvgText
        x={90}
        y={layout.subtitleY}
        maxCharacters={42}
        fill={palette.muted}
        fontSize={15}
        fontWeight={720}
        letterSpacing={1.8}
      >
        {`${viewLabel.toUpperCase()} • SERVES ${servings}`}
      </SvgText>

      {layout.notes.map((note, index) => {
        return (
          <g key={`${note.note}-${index}`}>
            <rect
              x={note.x}
              y={note.y}
              width={note.width}
              height={note.height}
              rx={22}
              fill={palette.panel}
              stroke={palette.grid}
              strokeWidth={1.5}
            />
            <circle
              cx={note.x + 28}
              cy={note.y + note.height / 2}
              r={6}
              fill={palette.accent}
            />
            <SvgText
              x={note.x + 48}
              y={note.y + note.height / 2}
              maxCharacters={HEADER_NOTE_LINE_CHARACTERS}
              fill={palette.ink}
              fontSize={15}
              fontWeight={650}
            >
              {note.note}
            </SvgText>
          </g>
        );
      })}
      <line
        x1={54}
        y1={layout.height - 18}
        x2={width - 54}
        y2={layout.height - 18}
        stroke={palette.grid}
        strokeWidth={2}
      />
    </g>
  );
}

const METHOD_MAX_COLUMNS = 3;
const METHOD_MIN_CARD_WIDTH = 320;
const METHOD_COLUMN_GAP = 34;
const METHOD_ROW_GAP = 38;
const METHOD_SIDE_MARGIN = 54;
const METHOD_HEADER_HEIGHT = 58;

type MethodCardLayout = {
  step: RecipeStep;
  number: number;
  column: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
  methodLines: string[];
  cueLines: string[];
  metadata: MethodMetadataLayout[];
  metadataHeight: number;
  methodTop: number;
  contentBottom: number;
  cueHeight: number;
  titleLines: string[];
  headerHeight: number;
  textCharacters: number;
  titleCharacters: number;
};

type MethodMetadataLayout = {
  field: string;
  label: string;
  value: string;
  lines: string[];
  textCharacters: number;
  y: number;
  height: number;
};

type MethodConnectorLayout = {
  path: string;
  arrowTipX: number;
  arrowY: number;
};

export type MethodKeyLayout = {
  height: number;
  width: number;
  scale: number;
  sideMargin: number;
  cards: MethodCardLayout[];
  columns: number;
  connectors: MethodConnectorLayout[];
};

export function getMethodKeyLayout(
  steps: RecipeStep[],
  artboardWidth: number,
  displayWidth = artboardWidth,
): MethodKeyLayout {
  // Lay out in readable screen-sized units, then map those units back into the
  // artboard. The exported SVG keeps exactly the same layout and text sizing.
  const width = Math.min(artboardWidth, Math.max(280, displayWidth));
  const scale = artboardWidth / width;
  const sideMargin = Math.min(METHOD_SIDE_MARGIN, width * 0.04);
  const availableWidth = width - sideMargin * 2;
  const columns = Math.max(
    1,
    Math.min(
      METHOD_MAX_COLUMNS,
      Math.floor(
        (availableWidth + METHOD_COLUMN_GAP) /
          (METHOD_MIN_CARD_WIDTH + METHOD_COLUMN_GAP),
      ),
    ),
  );
  const cardWidth =
    (availableWidth - METHOD_COLUMN_GAP * (columns - 1)) / columns;
  const textCharacters = Math.max(8, Math.floor((cardWidth - 52) / 9.6));
  const titleCharacters = Math.max(6, Math.floor((cardWidth - 82) / 12));
  const cards = steps.map((step, index) => {
    const methodLines = step.details
      ? splitText(step.details, textCharacters)
      : [];
    const cueLines = step.cue ? splitText(step.cue, textCharacters) : [];
    const titleLines = splitText(step.label, titleCharacters);
    const headerHeight = Math.max(64, 34 + titleLines.length * 25);
    // Explicit labels keep equipment, heat and handling instructions distinct.
    // Omit absent legacy fields rather than inventing cooking instructions.
    let metadataCursor = 12;
    const metadata = [
      { field: "time", label: "TIME", value: formatStepTiming(step) },
      { field: "temperature", label: "TEMP", value: step.temperature },
      { field: "tool", label: "TOOL", value: step.tool },
      { field: "setting", label: "SETTING", value: step.setting },
    ].flatMap(({ field, label, value }): MethodMetadataLayout[] => {
      if (!value) return [];
      const metadataCharacters = Math.max(
        6,
        Math.floor((cardWidth - 142) / 9.6),
      );
      const lines = splitText(value, metadataCharacters);
      const height = lines.length * 22;
      const item = {
        field,
        label,
        value,
        lines,
        textCharacters: metadataCharacters,
        y: metadataCursor,
        height,
      };
      metadataCursor += height + 8;
      return [item];
    });
    const metadataHeight = metadata.length > 0 ? metadataCursor + 4 : 0;
    const methodTop = headerHeight + metadataHeight + (metadataHeight ? 18 : 0);
    const contentBottom =
      methodTop + (methodLines.length > 0 ? 24 + methodLines.length * 24 : 0);
    const cueHeight = cueLines.length > 0 ? 40 + cueLines.length * 24 : 0;
    const height = Math.max(
      118,
      contentBottom + (cueHeight ? 16 + cueHeight : 0) + 20,
    );
    return {
      step,
      number: index + 1,
      column: index % columns,
      row: Math.floor(index / columns),
      width: cardWidth,
      height,
      methodLines,
      cueLines,
      metadata,
      metadataHeight,
      methodTop,
      contentBottom,
      cueHeight,
      titleLines,
      headerHeight,
      textCharacters,
      titleCharacters,
    };
  });
  const rowCount = Math.ceil(cards.length / columns);
  const rowHeights = Array.from({ length: rowCount }, (_, row) =>
    Math.max(
      ...cards.filter((card) => card.row === row).map((card) => card.height),
    ),
  );
  const rowOffsets = rowHeights.map((_, row) =>
    rowHeights
      .slice(0, row)
      .reduce((total, height) => total + height + METHOD_ROW_GAP, 0),
  );
  const positioned = cards.map((card) => ({
    ...card,
    x: sideMargin + card.column * (cardWidth + METHOD_COLUMN_GAP),
    y: METHOD_HEADER_HEIGHT + rowOffsets[card.row],
    height: rowHeights[card.row],
  }));
  const connectors = positioned.slice(0, -1).map((card, index) => {
    const next = positioned[index + 1];
    const startX = card.x + card.width + 5;
    const startY = card.y + card.height / 2;
    const arrowTipX = next.x - 3;
    const arrowEndX = arrowTipX - 9;
    const arrowY = next.y + next.height / 2;
    const path =
      card.row === next.row
        ? `M ${startX} ${startY} H ${arrowEndX}`
        : [
            `M ${startX} ${startY}`,
            `H ${width - sideMargin / 2}`,
            `V ${card.y + card.height + METHOD_ROW_GAP / 2}`,
            `H ${sideMargin / 2}`,
            `V ${arrowY}`,
            `H ${arrowEndX}`,
          ].join(" ");

    return { path, arrowTipX, arrowY };
  });
  const rowsHeight = rowHeights.reduce((total, height) => total + height, 0);

  return {
    width,
    scale,
    sideMargin,
    height:
      (METHOD_HEADER_HEIGHT +
        rowsHeight +
        Math.max(0, rowCount - 1) * METHOD_ROW_GAP) *
      scale,
    cards: positioned,
    columns,
    connectors,
  };
}

export function DiagramMethodKey({
  layout,
  y,
  palette,
}: {
  layout: MethodKeyLayout;
  y: number;
  width: number;
  palette: DiagramPalette;
}) {
  return (
    <g transform={`translate(0 ${y}) scale(${layout.scale})`}>
      <MethodKeyContent
        layout={layout}
        y={0}
        width={layout.width}
        palette={palette}
      />
    </g>
  );
}

function MethodKeyContent({
  layout,
  y,
  width,
  palette,
}: {
  layout: MethodKeyLayout;
  y: number;
  width: number;
  palette: DiagramPalette;
}) {
  return (
    <g
      data-testid="diagram-method-key"
      data-columns={layout.columns}
      data-display-width={layout.width}
      aria-label="Numbered recipe method"
    >
      <line
        x1={layout.sideMargin}
        y1={y}
        x2={width - layout.sideMargin}
        y2={y}
        stroke={palette.grid}
        strokeWidth={2}
      />
      <SvgText
        x={layout.sideMargin}
        y={y + 28}
        fill={palette.ink}
        fontSize={18}
        fontWeight={820}
        letterSpacing={1.4}
      >
        METHOD • FOLLOW THE NUMBERS
      </SvgText>

      <g
        transform={`translate(0 ${y})`}
        data-testid="method-throughline"
        aria-hidden="true"
      >
        {layout.connectors.map((connector, index) => (
          <g key={`method-connector-${index}`}>
            <path
              d={connector.path}
              fill="none"
              stroke={palette.accent}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.72}
            />
            <path
              d={`M ${connector.arrowTipX} ${connector.arrowY} L ${connector.arrowTipX - 11} ${connector.arrowY - 7} L ${connector.arrowTipX - 11} ${connector.arrowY + 7} Z`}
              fill={palette.accent}
              opacity={0.9}
            />
          </g>
        ))}
      </g>

      {layout.cards.map((card) => {
        const cardY = y + card.y;
        const methodY =
          cardY +
          card.methodTop +
          32 +
          ((card.methodLines.length - 1) * 24) / 2;
        const cueTop = cardY + card.height - 20 - card.cueHeight;

        const accessibleInstruction = [
          `Step ${card.number}: ${card.step.label}`,
          ...card.metadata.map((item) => `${item.label}: ${item.value}`),
          card.step.details,
          card.step.cue ? `Look for: ${card.step.cue}` : undefined,
        ]
          .filter(Boolean)
          .join(". ");

        return (
          <g
            key={card.step.id}
            data-testid="method-card"
            aria-label={accessibleInstruction}
          >
            <rect
              x={card.x}
              y={cardY}
              width={card.width}
              height={card.height}
              rx={16}
              fill={palette.panel}
              stroke={palette.grid}
              strokeWidth={1.5}
            />
            <circle
              cx={card.x + 32}
              cy={cardY + 32}
              r={16}
              fill={palette.accent}
            />
            <SvgText
              x={card.x + 32}
              y={cardY + 32}
              fill={palette.accentInk}
              fontSize={14}
              fontWeight={850}
              anchor="middle"
            >
              {String(card.number)}
            </SvgText>
            <SvgText
              x={card.x + 58}
              y={cardY + 32 + ((card.titleLines.length - 1) * 25) / 2}
              maxCharacters={card.titleCharacters}
              fill={palette.ink}
              fontSize={20}
              lineHeight={1.25}
              fontWeight={820}
            >
              {card.step.label}
            </SvgText>
            {card.metadata.length > 0 ? (
              <g data-testid="method-metadata">
                <rect
                  x={card.x + 20}
                  y={cardY + card.headerHeight}
                  width={card.width - 40}
                  height={card.metadataHeight}
                  rx={10}
                  fill={palette.bg}
                />
                {card.metadata.map((item) => {
                  const top = cardY + card.headerHeight + item.y;
                  return (
                    <g key={item.field} data-field={item.field}>
                      <SvgText
                        x={card.x + 32}
                        y={top + 11}
                        fill={palette.muted}
                        fontSize={11}
                        fontWeight={800}
                        letterSpacing={0.8}
                      >
                        {item.label}
                      </SvgText>
                      <SvgText
                        x={card.x + 110}
                        y={top + 11 + ((item.lines.length - 1) * 22) / 2}
                        maxCharacters={item.textCharacters}
                        fill={palette.ink}
                        fontSize={15}
                        lineHeight={22 / 15}
                        fontWeight={720}
                      >
                        {item.value}
                      </SvgText>
                    </g>
                  );
                })}
              </g>
            ) : null}
            {card.methodLines.length > 0 ? (
              <g>
                <SvgText
                  x={card.x + 20}
                  y={cardY + card.methodTop + 6}
                  fill={palette.muted}
                  fontSize={11}
                  fontWeight={800}
                  letterSpacing={1.1}
                >
                  METHOD
                </SvgText>
                <g data-testid="method-instruction">
                  <SvgText
                    x={card.x + 20}
                    y={methodY}
                    maxCharacters={card.textCharacters}
                    lineHeight={1.5}
                    fill={palette.ink}
                    fontSize={16}
                    fontWeight={570}
                  >
                    {card.step.details ?? ""}
                  </SvgText>
                </g>
              </g>
            ) : null}
            {card.cueLines.length > 0 ? (
              <g data-testid="method-cue">
                <rect
                  x={card.x + 14}
                  y={cueTop}
                  width={card.width - 28}
                  height={card.cueHeight}
                  rx={13}
                  fill={palette.accent}
                  opacity={0.16}
                />
                <SvgText
                  x={card.x + 26}
                  y={cueTop + 16}
                  fill={palette.ink}
                  fontSize={11}
                  fontWeight={850}
                  letterSpacing={1.1}
                >
                  LOOK FOR
                </SvgText>
                <SvgText
                  x={card.x + 26}
                  y={cueTop + 42 + ((card.cueLines.length - 1) * 24) / 2}
                  maxCharacters={card.textCharacters}
                  lineHeight={1.5}
                  fill={palette.ink}
                  fontSize={16}
                  fontWeight={700}
                >
                  {card.step.cue ?? ""}
                </SvgText>
              </g>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

export function DiagramLegend({
  styles,
  x,
  y,
  palette,
  renderSample,
}: {
  styles: ResolvedIngredientStyle[];
  x: number;
  y: number;
  palette: DiagramPalette;
  renderSample?: (
    style: ResolvedIngredientStyle,
    x: number,
    y: number,
  ) => ReactNode;
}) {
  return (
    <g aria-label="Ingredient style legend">
      {styles.map((style, index) => {
        const itemX = x + index * 180;
        return (
          <g key={style}>
            {renderSample ? (
              renderSample(style, itemX, y)
            ) : style === "featured" ? (
              <g>
                <circle
                  cx={itemX + 24}
                  cy={y}
                  r={10}
                  fill={palette.featured}
                  opacity={0.2}
                />
                <circle cx={itemX + 24} cy={y} r={5} fill={palette.featured} />
              </g>
            ) : (
              <line
                x1={itemX}
                y1={y}
                x2={itemX + 48}
                y2={y}
                stroke={styleColor(style, palette)}
                strokeWidth={5}
                strokeLinecap="round"
              />
            )}
            <SvgText
              x={itemX + 62}
              y={y}
              fill={palette.muted}
              fontSize={14}
              fontWeight={700}
            >
              {STYLE_LABELS[style]}
            </SvgText>
          </g>
        );
      })}
    </g>
  );
}

export function getUsedStyles(
  ingredients: Ingredient[],
): ResolvedIngredientStyle[] {
  const preferred: ResolvedIngredientStyle[] = ["dry", "liquid", "neutral"];
  const used = new Set(ingredients.map(resolveIngredientStyle));
  const styles = preferred.filter((style) => used.has(style));
  if (ingredients.some(isIngredientFeatured)) styles.push("featured");
  return styles;
}
