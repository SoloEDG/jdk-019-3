import type { Shape } from "../../../shared/types";
export function path(s: Shape) {
  if (s.d) return s.d;
  if (!s.nodes.length) return "";
  let d = `M ${s.nodes[0].x} ${s.nodes[0].y}`;
  const n = s.nodes;
  for (let i = 1; i < n.length + (s.closed ? 1 : 0); i++) {
    const a = n[i - 1],
      b = n[i % n.length];
    d += ` C ${a.out.x} ${a.out.y} ${b.in.x} ${b.in.y} ${b.x} ${b.y}`;
  }
  return d + (s.closed ? " Z" : "");
}

/**
 * Applies `fn` to every (x, y) pair of a raw outline path. Outline shapes
 * carry no editable nodes, so geometry edits rewrite their path data
 * directly; the generator only ever emits "x y" pairs, so numbers alternate
 * x, y, x, y…
 */
export function mapPathCoords(d: string, fn: (x: number, y: number) => [number, number]) {
  let i = 0,
    x = 0;
  return d.replace(/-?\d+(?:\.\d+)?/g, (m) => {
    const v = parseFloat(m);
    if (i++ % 2 === 0) {
      x = v;
      return ""; // emit the whole transformed pair when the y coordinate arrives
    }
    const [nx, ny] = fn(x, v);
    return `${round(nx)} ${round(ny)}`;
  });
}

const round = (v: number) => Math.round(v * 100) / 100;
