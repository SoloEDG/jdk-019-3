import type { TextOnPath } from "../../../shared/types";

let ctx: CanvasRenderingContext2D | undefined;
const cache = new Map<string, number>();

function context(): CanvasRenderingContext2D {
  if (!ctx) ctx = document.createElement("canvas").getContext("2d")!;
  return ctx;
}

/** Advance width of a single glyph for the given font, cached per glyph. */
export function measureGlyph(ch: string, text: TextOnPath): number {
  const key = `${text.fontFamily}${text.fontSize}${ch}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const c = context();
  c.font = `${text.fontSize}px ${text.fontFamily}`;
  const w = c.measureText(ch).width;
  if (cache.size > 4000) cache.clear();
  cache.set(key, w);
  return w;
}

export const fonts = [
  "sans-serif",
  "serif",
  "monospace",
  "cursive",
  "Arial",
  "Helvetica",
  "Verdana",
  "Trebuchet MS",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Impact",
  "PingFang SC",
  "Microsoft YaHei",
  "Noto Sans CJK SC",
  "SimSun",
  "KaiTi",
];
