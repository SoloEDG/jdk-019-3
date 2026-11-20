import type { Shape, TextOnPath } from "../../../shared/types";
import { buildTable, pointAt } from "./arclen.ts";
import type { ArcTable } from "./arclen.ts";

export interface PlacedGlyph {
  ch: string;
  x: number;
  y: number;
  angle: number;
  advance: number;
  /** distance of this glyph's center along the reading direction */
  at: number;
  overflow: boolean;
}
export interface TextLayout {
  glyphs: PlacedGlyph[];
  table: ArcTable;
  /** total advance the text wants, from startOffset to the last glyph's end */
  used: number;
  overflowCount: number;
  overflowPx: number;
}

export type Measure = (ch: string, text: TextOnPath) => number;

/**
 * Lays `text.content` out along the shape's curve by arc length. Pure: the
 * only DOM-dependent piece (glyph metrics) is injected, which keeps this
 * verifiable outside the browser.
 */
export function layoutText(s: Shape, text: TextOnPath, measure: Measure): TextLayout {
  const table = buildTable(s);
  const chars = [...text.content];
  const glyphs: PlacedGlyph[] = [];
  let at = Math.max(0, text.startOffset);
  for (const ch of chars) {
    if (ch === "\n" || ch === "\r") continue;
    const advance = measure(ch, text) + text.letterSpacing;
    const center = at + advance / 2;
    const overflow = at + advance > table.total + 1e-6;
    const along = text.direction === 1 ? center : table.total - center;
    const p = pointAt(table, along);
    glyphs.push({
      ch,
      x: p.x,
      y: p.y,
      angle: text.direction === 1 ? p.angle : p.angle + 180,
      advance,
      at: center,
      overflow,
    });
    at += advance;
  }
  const used = at - Math.max(0, text.startOffset);
  const overflowCount = glyphs.filter((g) => g.overflow).length;
  return {
    glyphs,
    table,
    used,
    overflowCount,
    overflowPx: Math.max(0, at - table.total),
  };
}
