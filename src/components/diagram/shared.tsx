import type { ReactNode } from "react";
import type {
  Ingredient,
  ResolvedIngredientStyle,
  Theme,
} from "../../domain/types";
import {
  formatAlternateMeasurements,
  formatIngredientQuantity,
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
  maxLines = 3,
): string[] {
  const normalized = value.trim();
  if (!normalized) return [""];
  const words = normalized
    .split(/\s+/)
    .flatMap((word) => {
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
  if (lines.length <= maxLines) return lines;
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
  maxLines = 3,
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
        <tspan key={`${line}-${index}`} x={x} dy={index === 0 ? 0 : lineHeightPx}>
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
  const quantity = formatIngredientQuantity(ingredient);
  const label = [quantity, ingredient.name].filter(Boolean).join(" ");
  const alternateMeasurements = formatAlternateMeasurements(ingredient);
  const supplemental = [alternateMeasurements, ingredient.note].filter(
    (value): value is string => Boolean(value?.trim()),
  );
  const labelY = supplemental.length > 0 ? y - 13 : y;
  return (
    <g>
      <SvgText
        x={x}
        y={labelY}
        maxCharacters={maxCharacters}
        maxLines={2}
        fill={palette.ink}
        fontSize={19}
        fontWeight={720}
        anchor={anchor}
      >
        {label}
      </SvgText>
      {supplemental.map((text, index) => (
        <SvgText
          key={`${text}-${index}`}
          x={x}
          y={y + 16 + index * 18}
          maxCharacters={maxCharacters + 8}
          maxLines={1}
          fill={palette.muted}
          fontSize={12}
          fontWeight={550}
          anchor={anchor}
        >
          {text}
        </SvgText>
      ))}
    </g>
  );
}

export function DiagramHeader({
  title,
  servings,
  prepNotes,
  viewLabel,
  width,
  palette,
}: {
  title: string;
  servings: number;
  prepNotes: string[];
  viewLabel: string;
  width: number;
  palette: DiagramPalette;
}) {
  const visibleNotes = prepNotes.slice(0, 2);
  return (
    <g>
      <rect x={0} y={0} width={width} height={184} fill={palette.bg} />
      <rect x={54} y={40} width={10} height={64} rx={5} fill={palette.accent} />
      <SvgText
        x={88}
        y={59}
        maxCharacters={34}
        maxLines={2}
        fill={palette.ink}
        fontSize={38}
        fontWeight={820}
      >
        {title}
      </SvgText>
      <SvgText
        x={90}
        y={105}
        maxCharacters={42}
        fill={palette.muted}
        fontSize={15}
        fontWeight={720}
        letterSpacing={1.8}
      >
        {`${viewLabel.toUpperCase()} • SERVES ${servings}`}
      </SvgText>

      {visibleNotes.map((note, index) => {
        const x = width - 640 + index * 300;
        return (
          <g key={`${note}-${index}`}>
            <rect
              x={x}
              y={45}
              width={276}
              height={92}
              rx={22}
              fill={palette.panel}
              stroke={palette.grid}
              strokeWidth={1.5}
            />
            <circle cx={x + 28} cy={91} r={6} fill={palette.accent} />
            <SvgText
              x={x + 48}
              y={91}
              maxCharacters={24}
              maxLines={2}
              fill={palette.ink}
              fontSize={15}
              fontWeight={650}
            >
              {note}
            </SvgText>
          </g>
        );
      })}
      {prepNotes.length > 2 ? (
        <SvgText
          x={width - 54}
          y={154}
          fill={palette.muted}
          fontSize={13}
          fontWeight={650}
          anchor="end"
        >
          {`+${prepNotes.length - 2} prep notes`}
        </SvgText>
      ) : null}
      <line
        x1={54}
        y1={166}
        x2={width - 54}
        y2={166}
        stroke={palette.grid}
        strokeWidth={2}
      />
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
  renderSample?: (style: ResolvedIngredientStyle, x: number, y: number) => ReactNode;
}) {
  return (
    <g aria-label="Ingredient style legend">
      {styles.map((style, index) => {
        const itemX = x + index * 180;
        return (
          <g key={style}>
            {renderSample ? (
              renderSample(style, itemX, y)
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
  const preferred: ResolvedIngredientStyle[] = [
    "dry",
    "liquid",
    "featured",
    "neutral",
  ];
  const used = new Set(ingredients.map(resolveIngredientStyle));
  return preferred.filter((style) => used.has(style));
}
