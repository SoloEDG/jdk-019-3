import { beginEdit } from "../../drawing";
import { doc } from "../../../shared/document";
import type { Shape, TextOnPath } from "../../../shared/types";
import { layoutText } from "../lib/layout.ts";
import { measureGlyph } from "../lib/measure.ts";
import { textOutlines } from "../lib/outline.ts";

export function defaultText(): TextOnPath {
  return {
    content: "沿路径文字 Text on a path",
    fontFamily: "sans-serif",
    fontSize: 24,
    letterSpacing: 0,
    startOffset: 0,
    direction: 1,
    color: "#2f2451",
  };
}

export function addText(s: Shape) {
  beginEdit();
  s.text = defaultText();
}

export function removeText(s: Shape) {
  beginEdit();
  delete s.text;
}

export function setText<K extends keyof TextOnPath>(s: Shape, k: K, v: TextOnPath[K]) {
  if (!s.text) return;
  if (typeof v === "number" && !Number.isFinite(v)) return;
  if (k === "fontSize" && typeof v === "number")
    v = Math.min(400, Math.max(1, v)) as TextOnPath[K];
  beginEdit();
  s.text[k] = v;
}

/**
 * Turns the live text run into a plain outline shape inserted above the
 * carrier path (which keeps its own stroke/fill). Counters survive via
 * even-odd filling and the text color becomes the outline's fill. This is
 * one history step, so undo restores the original text together with its
 * path association.
 */
export function convertToOutlines(s: Shape) {
  if (!s.text) return;
  const layout = layoutText(s, s.text, measureGlyph);
  const d = textOutlines(layout, s.text);
  const t = s.text;
  beginEdit();
  const outline: Shape = {
    id: crypto.randomUUID(),
    name: `${s.name} 轮廓`,
    nodes: [],
    closed: false,
    fill: t.color,
    stroke: "#000000",
    width: 0,
    opacity: s.opacity,
    d,
  };
  doc.shapes.splice(doc.shapes.indexOf(s) + 1, 0, outline);
  delete s.text;
  doc.selected = [outline.id];
}
