import type { Point, Shape } from "../../../shared/types";

export interface ArcSample extends Point {
  len: number;
}
export interface ArcTable {
  pts: ArcSample[];
  total: number;
}

const TOLERANCE = 0.1;
const MAX_DEPTH = 18;

function flatEnough(a: Point, c1: Point, c2: Point, b: Point): boolean {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const chord = Math.hypot(dx, dy) || 1e-9;
  const dist = (p: Point) => Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / chord;
  return Math.max(dist(c1), dist(c2)) <= TOLERANCE;
}

/**
 * Flattens every cubic segment of the shape into a polyline annotated with
 * cumulative arc length. Positioning is therefore a function of *distance
 * along the curve*, never of parameter t or of how many control points the
 * curve happens to use — subdividing a segment leaves these distances intact.
 */
export function buildTable(s: Shape): ArcTable {
  const n = s.nodes;
  const pts: ArcSample[] = [];
  if (!n.length) return { pts, total: 0 };
  pts.push({ x: n[0].x, y: n[0].y, len: 0 });
  const count = n.length - 1 + (s.closed ? 1 : 0);
  for (let i = 0; i < count; i++) {
    const a = n[i],
      b = n[(i + 1) % n.length];
    flatten(a, a.out, b.in, b, pts);
  }
  return { pts, total: pts.length ? pts[pts.length - 1].len : 0 };
}

function flatten(a: Point, c1: Point, c2: Point, b: Point, out: ArcSample[], depth = 0) {
  if (depth >= MAX_DEPTH || flatEnough(a, c1, c2, b)) {
    const prev = out[out.length - 1];
    out.push({ x: b.x, y: b.y, len: prev.len + Math.hypot(b.x - prev.x, b.y - prev.y) });
    return;
  }
  const m1 = mid(a, c1),
    m2 = mid(c1, c2),
    m3 = mid(c2, b),
    m4 = mid(m1, m2),
    m5 = mid(m2, m3),
    m = mid(m4, m5);
  flatten(a, m1, m4, m, out, depth + 1);
  flatten(m, m5, m3, b, out, depth + 1);
}

function mid(p: Point, q: Point): Point {
  return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
}

export interface PathPoint extends Point {
  angle: number;
}

/**
 * Point and tangent at arc distance `d`. Distances outside [0, total] are
 * extrapolated along the end tangents so overflow text has a well-defined,
 * visible place to go instead of piling up at the path end.
 */
export function pointAt(table: ArcTable, d: number): PathPoint {
  const { pts } = table;
  if (!pts.length) return { x: 0, y: 0, angle: 0 };
  if (pts.length === 1) return { x: pts[0].x, y: pts[0].y, angle: 0 };
  if (d <= 0) return onSegment(pts[0], pts[1], d);
  if (d >= table.total)
    return onSegment(pts[pts.length - 2], pts[pts.length - 1], d - pts[pts.length - 2].len);
  let lo = 0,
    hi = pts.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (pts[m].len <= d) lo = m;
    else hi = m;
  }
  return onSegment(pts[lo], pts[hi], d - pts[lo].len);
}

function onSegment(a: ArcSample, b: ArcSample, into: number): PathPoint {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const seg = Math.hypot(dx, dy) || 1e-9;
  const t = into / seg;
  return {
    x: a.x + dx * t,
    y: a.y + dy * t,
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}
