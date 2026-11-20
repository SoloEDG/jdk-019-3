import type { Shape } from "../../../shared/types";
import { layoutText } from "../../textpath/lib/layout.ts";
import { measureGlyph } from "../../textpath/lib/measure.ts";
import { textOutlines } from "../../textpath/lib/outline.ts";

export type ExportMode = "editable" | "outline";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const num = (v: number) => Math.round(v * 100) / 100;

function pathTag(s: Shape, d: string, id?: string) {
  const rule = s.d ? ` fill-rule="evenodd"` : "";
  const idAttr = id ? ` id="${id}"` : "";
  return `<path${idAttr} d="${d}"${rule} fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.width}" opacity="${s.opacity}"/>`;
}

/** text kept as live <text>: small file, but the viewer must have the font */
function editableText(s: Shape, pathId?: string): string {
  const t = s.text!;
  const common = `font-family="${esc(t.fontFamily)}" font-size="${t.fontSize}" letter-spacing="${t.letterSpacing}" fill="${t.color}"`;
  if (t.direction === 1 && pathId) {
    return `<text ${common}><textPath href="#${pathId}" startOffset="${t.startOffset}" xml:space="preserve">${esc(t.content)}</textPath></text>`;
  }
  const layout = layoutText(s, t, measureGlyph);
  const glyphs = layout.glyphs
    .map(
      (g) =>
        `<text transform="translate(${num(g.x)} ${num(g.y)}) rotate(${num(g.angle)})" text-anchor="middle">${esc(g.ch)}</text>`,
    )
    .join("");
  return `<g ${common}>${glyphs}</g>`;
}

/** text baked to outlines: font-independent, larger file, no longer editable */
function outlinedText(s: Shape): string {
  const t = s.text!;
  const layout = layoutText(s, t, measureGlyph);
  const d = textOutlines(layout, t);
  return `<path d="${d}" fill-rule="evenodd" fill="${t.color}" stroke="none"/>`;
}

export function serialize(shapes: Shape[], paths: string[], mode: ExportMode) {
  let content = "",
    group: string | undefined;
  shapes.forEach((s, i) => {
    if (s.group !== group) {
      if (group) content += "</g>";
      group = s.group;
      if (group) content += `<g id="group-${group}-${i}">`;
    }
    const pathId =
      s.text && mode === "editable" && s.text.direction === 1
        ? `tp-${i}`
        : undefined;
    content += pathTag(s, paths[i], pathId);
    if (s.text)
      content += mode === "editable" ? editableText(s, pathId) : outlinedText(s);
  });
  if (group) content += "</g>";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">${content}</svg>`;
}
