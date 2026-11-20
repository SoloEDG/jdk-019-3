import type { TextOnPath } from "../../../shared/types";
import type { TextLayout } from "./layout.ts";

/**
 * Glyph → vector outline, dependency-free. Each glyph is rasterized on an
 * offscreen canvas at a reference size, then its contours are extracted with
 * marching squares (linearly interpolated crossings), simplified with
 * Douglas–Peucker, and cached. Outer contours and counters (holes) come out
 * as separate closed subpaths; consumers must fill with `evenodd` so holes
 * like the counter of "o" stay open.
 */

const REF = 200;
const THRESHOLD = 128;

export interface GlyphOutline {
  /** closed contours in REF-sized font units, origin at baseline left */
  contours: Point[][];
  /** advance width in REF units */
  advance: number;
}
interface Point {
  x: number;
  y: number;
}

const cache = new Map<string, GlyphOutline>();

export function glyphOutline(ch: string, fontFamily: string): GlyphOutline {
  const key = `${fontFamily}${ch}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const outline = trace(ch, fontFamily);
  if (cache.size > 600) cache.clear();
  cache.set(key, outline);
  return outline;
}

function trace(ch: string, fontFamily: string): GlyphOutline {
  const empty: GlyphOutline = { contours: [], advance: 0 };
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.font = `${REF}px ${fontFamily}`;
  const m = ctx.measureText(ch);
  const advance = m.width;
  if (!advance) return empty;
  const ascent = m.actualBoundingBoxAscent || REF;
  const descent = m.actualBoundingBoxDescent || REF * 0.25;
  const left = m.actualBoundingBoxLeft || 0;
  const right = m.actualBoundingBoxRight || advance;
  const pad = 4;
  const w = Math.ceil(left + right + pad * 2 + 2);
  const h = Math.ceil(ascent + descent + pad * 2 + 2);
  canvas.width = w;
  canvas.height = h;
  ctx.font = `${REF}px ${fontFamily}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#000";
  const originX = pad + 1 + left,
    originY = pad + 1 + ascent;
  ctx.fillText(ch, originX, originY);
  const data = ctx.getImageData(0, 0, w, h).data;
  const field = new Float32Array(w * h);
  let any = false;
  for (let i = 0; i < w * h; i++) {
    const a = data[i * 4 + 3];
    field[i] = a;
    if (a >= THRESHOLD) any = true;
  }
  if (!any) return empty;
  const contours = join(march(field, w, h));
  const kept = contours
    .map((c) => simplify(c, 1.0))
    .filter((c) => c.length >= 3 && Math.abs(area(c)) > 1.5)
    .map((c) => c.map((p) => ({ x: p.x - originX, y: p.y - originY })));
  return { contours: kept, advance };
}

interface Seg {
  a: Point;
  b: Point;
}

function march(f: Float32Array, w: number, h: number): Seg[] {
  const segs: Seg[] = [];
  const at = (x: number, y: number) => f[y * w + x];
  // crossing points are always interpolated in a fixed direction so the two
  // cells sharing an edge produce bitwise-identical endpoints
  const top = (x: number, y: number): Point => {
    const t = (THRESHOLD - at(x, y)) / (at(x + 1, y) - at(x, y));
    return { x: x + t, y };
  };
  const bottom = top;
  const vertical = (x: number, y: number): Point => {
    const t = (THRESHOLD - at(x, y)) / (at(x, y + 1) - at(x, y));
    return { x, y: y + t };
  };
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const tl = at(x, y) >= THRESHOLD,
        tr = at(x + 1, y) >= THRESHOLD,
        br = at(x + 1, y + 1) >= THRESHOLD,
        bl = at(x, y + 1) >= THRESHOLD;
      const idx = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const T = () => top(x, y),
        R = () => vertical(x + 1, y),
        B = () => bottom(x, y + 1),
        L = () => vertical(x, y);
      switch (idx) {
        case 1: segs.push({ a: L(), b: B() }); break;
        case 2: segs.push({ a: B(), b: R() }); break;
        case 3: segs.push({ a: L(), b: R() }); break;
        case 4: segs.push({ a: T(), b: R() }); break;
        case 5: segs.push({ a: T(), b: R() }, { a: L(), b: B() }); break;
        case 6: segs.push({ a: T(), b: B() }); break;
        case 7: segs.push({ a: L(), b: T() }); break;
        case 8: segs.push({ a: T(), b: L() }); break;
        case 9: segs.push({ a: T(), b: B() }); break;
        case 10: segs.push({ a: T(), b: L() }, { a: B(), b: R() }); break;
        case 11: segs.push({ a: T(), b: R() }); break;
        case 12: segs.push({ a: R(), b: L() }); break;
        case 13: segs.push({ a: B(), b: R() }); break;
        case 14: segs.push({ a: L(), b: B() }); break;
      }
    }
  }
  return segs;
}

function key(p: Point): string {
  return `${Math.round(p.x * 1e4)},${Math.round(p.y * 1e4)}`;
}

function join(segs: Seg[]): Point[][] {
  const byEnd = new Map<string, Seg[]>();
  const used = new Set<Seg>();
  for (const s of segs) {
    for (const p of [s.a, s.b]) {
      const k = key(p);
      const list = byEnd.get(k);
      if (list) list.push(s);
      else byEnd.set(k, [s]);
    }
  }
  const contours: Point[][] = [];
  for (const first of segs) {
    if (used.has(first)) continue;
    used.add(first);
    const start = key(first.a);
    const contour = [first.a, first.b];
    let tip = first.b;
    while (key(tip) !== start) {
      const next = (byEnd.get(key(tip)) || []).find((s) => !used.has(s));
      if (!next) break;
      used.add(next);
      tip = key(next.a) === key(tip) ? next.b : next.a;
      contour.push(tip);
    }
    if (contour.length >= 4 && key(contour[0]) === key(contour[contour.length - 1])) {
      contour.pop();
      contours.push(contour);
    }
  }
  return contours;
}

function area(c: Point[]): number {
  let a = 0;
  for (let i = 0; i < c.length; i++) {
    const p = c[i],
      q = c[(i + 1) % c.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

function simplify(c: Point[], tol: number): Point[] {
  const keep = new Array<boolean>(c.length).fill(false);
  keep[0] = keep[c.length - 1] = true;
  const stack: [number, number][] = [[0, c.length - 1]];
  while (stack.length) {
    const [lo, hi] = stack.pop()!;
    if (hi - lo < 2) continue;
    const a = c[lo],
      b = c[hi];
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1e-9;
    let max = 0,
      at = -1;
    for (let i = lo + 1; i < hi; i++) {
      const d = Math.abs(dy * c[i].x - dx * c[i].y + b.x * a.y - b.y * a.x) / len;
      if (d > max) {
        max = d;
        at = i;
      }
    }
    if (max > tol) {
      keep[at] = true;
      stack.push([lo, at], [at, hi]);
    }
  }
  return c.filter((_, i) => keep[i]);
}

const round = (v: number) => Math.round(v * 100) / 100;

/** One combined `d` for a whole laid-out text run, in document coordinates. */
export function textOutlines(layout: TextLayout, text: TextOnPath): string {
  const scale = text.fontSize / REF;
  let d = "";
  for (const g of layout.glyphs) {
    const { contours, advance } = glyphOutline(g.ch, text.fontFamily);
    const rad = (g.angle * Math.PI) / 180;
    const cos = Math.cos(rad),
      sin = Math.sin(rad);
    for (const contour of contours) {
      const pts = contour.map((p) => {
        const lx = (p.x - advance / 2) * scale,
          ly = p.y * scale;
        return {
          x: g.x + lx * cos - ly * sin,
          y: g.y + lx * sin + ly * cos,
        };
      });
      d +=
        "M" +
        pts.map((p) => `${round(p.x)} ${round(p.y)}`).join("L") +
        "Z";
    }
  }
  return d;
}
