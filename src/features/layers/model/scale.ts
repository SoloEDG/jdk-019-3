import { beginEdit } from "../../drawing";
import { doc } from "../../../shared/document";
import type { Shape } from "../../../shared/types";
import { mapPathCoords } from "../../drawing/lib/path.ts";

function bounds(shapes: Shape[]) {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  const eat = (x: number, y: number) => {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  };
  for (const s of shapes) {
    for (const n of s.nodes) eat(n.x, n.y);
    if (s.d) {
      const nums = s.d.match(/-?\d+(?:\.\d+)?/g) || [];
      for (let i = 0; i + 1 < nums.length; i += 2) eat(+nums[i], +nums[i + 1]);
    }
  }
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, empty: x0 > x1 };
}

/**
 * Scales the selection as a group: path geometry *and* text metrics
 * (font size, letter spacing, start offset) are multiplied together, so the
 * layout keeps exactly the same relative fit on the path — unlike changing
 * the font size alone, which re-flows the text along an unchanged path.
 */
export function scaleSelected(factor: number) {
  if (!(factor > 0) || !doc.selected.length) return;
  const shapes = doc.shapes.filter((s) => doc.selected.includes(s.id));
  const { cx, cy, empty } = bounds(shapes);
  if (empty && !shapes.some((s) => s.text)) return;
  beginEdit();
  for (const s of shapes) {
    if (!empty) {
      for (const n of s.nodes) {
        for (const p of [n, n.in, n.out]) {
          p.x = cx + (p.x - cx) * factor;
          p.y = cy + (p.y - cy) * factor;
        }
      }
      if (s.d)
        s.d = mapPathCoords(s.d, (px, py) => [
          cx + (px - cx) * factor,
          cy + (py - cy) * factor,
        ]);
    }
    if (s.text) {
      s.text.fontSize = Math.round(s.text.fontSize * factor * 10) / 10;
      s.text.letterSpacing *= factor;
      s.text.startOffset *= factor;
    }
  }
}
