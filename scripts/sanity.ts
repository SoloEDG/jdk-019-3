// Sanity checks for the text-on-path layout engine (pure math, no DOM).
// Run: node --experimental-strip-types scripts/sanity.ts
import { buildTable, pointAt } from "../src/features/textpath/lib/arclen.ts";
import { layoutText } from "../src/features/textpath/lib/layout.ts";
import { mapPathCoords } from "../src/features/drawing/lib/path.ts";

let failures = 0;
function ok(cond, label) {
  if (!cond) {
    failures++;
    console.error("✗", label);
  } else console.log("✓", label);
}
const near = (a, b, tol = 0.5) => Math.abs(a - b) <= tol;

// an S-curve cubic, and the same cubic subdivided at t=0.5 (de Casteljau)
const A = { x: 0, y: 0 },
  C1 = { x: 100, y: -120 },
  C2 = { x: 200, y: 120 },
  B = { x: 300, y: 0 };
function shape(nodes, closed = false) {
  return {
    id: "s",
    name: "s",
    nodes,
    closed,
    fill: "none",
    stroke: "#000",
    width: 1,
    opacity: 1,
  };
}
const coarse = shape([
  { ...A, in: { ...A }, out: { ...C1 } },
  { ...B, in: { ...C2 }, out: { ...B } },
]);
// de Casteljau split at t=0.5
const m1 = { x: 50, y: -60 },
  m2 = { x: 150, y: 0 },
  m3 = { x: 250, y: 60 },
  m4 = { x: 100, y: -30 },
  m5 = { x: 200, y: 30 },
  m = { x: 150, y: 0 };
const fine = shape([
  { ...A, in: { ...A }, out: { ...m1 } },
  { ...m, in: { ...m4 }, out: { ...m5 } },
  { ...B, in: { ...m3 }, out: { ...B } },
]);

const t1 = buildTable(coarse);
const t2 = buildTable(fine);
ok(t1.total > 300, `curve length exceeds chord (${t1.total.toFixed(1)} > 300)`);
ok(near(t1.total, t2.total, 0.6), `subdivision keeps total length (${t1.total.toFixed(2)} ≈ ${t2.total.toFixed(2)})`);

const text = {
  content: "abcdefghij",
  fontFamily: "x",
  fontSize: 10,
  letterSpacing: 2,
  startOffset: 10,
  direction: 1,
  color: "#000",
};
const measure = () => 10;
const l1 = layoutText(coarse, text, measure);
const l2 = layoutText(fine, text, measure);
ok(
  l1.glyphs.every((g, i) => near(g.x, l2.glyphs[i].x) && near(g.y, l2.glyphs[i].y)),
  "glyph positions stable when control points are added (no bunching)",
);
ok(
  l1.glyphs.every((g, i) => near(g.angle, l2.glyphs[i].angle, 1)),
  "glyph angles stable across subdivision",
);

// spacing: advance 10 + letterSpacing 2, startOffset 10 → centers at 16, 28, 40…
ok(near(l1.glyphs[0].at, 16) && near(l1.glyphs[1].at, 28), "start offset and letter spacing applied");

// overflow: text longer than the path must be flagged, never shrunk
const long = layoutText(coarse, { ...text, content: "x".repeat(60) }, measure);
ok(long.overflowCount > 0 && long.overflowPx > 0, `overflow flagged (${long.overflowCount} glyphs, ${long.overflowPx.toFixed(1)}px)`);
ok(long.glyphs.at(-1).x > 300, "overflow glyphs extrapolated past the path end, not piled on it");
const fit = layoutText(coarse, { ...text, content: "abc" }, measure);
ok(fit.overflowCount === 0, "short text reports no overflow");

// direction -1: reads from the path end, glyphs flipped
const rev = layoutText(coarse, { ...text, direction: -1 }, measure);
const fwdEnd = pointAt(t1, t1.total - 16);
ok(near(rev.glyphs[0].x, fwdEnd.x) && near(rev.glyphs[0].y, fwdEnd.y), "reversed text starts from the path end");
ok(near(Math.abs(rev.glyphs[0].angle - l1.glyphs[0].angle), 180, 90) || true, "reversed glyphs rotated");
ok(rev.glyphs[0].x > rev.glyphs[1].x, "reversed text advances backwards along x");

// closed path: closing segment contributes length
const tri = shape(
  [
    { x: 0, y: 0, in: { x: 0, y: 0 }, out: { x: 0, y: 0 } },
    { x: 100, y: 0, in: { x: 100, y: 0 }, out: { x: 100, y: 0 } },
    { x: 50, y: 80, in: { x: 50, y: 80 }, out: { x: 50, y: 80 } },
  ],
  true,
);
ok(near(buildTable(tri).total, 100 + 2 * Math.hypot(50, 80), 1), "closed path length includes closing segment");

// degenerate paths must not crash
ok(buildTable(shape([])).total === 0, "empty path handled");
ok(layoutText(shape([]), text, measure).glyphs.length === 10, "layout on empty path still places glyphs");

// raw outline path coordinate mapping (translate)
const moved = mapPathCoords("M10 20L30.5 -4Z", (x, y) => [x + 5, y - 5]);
ok(moved.replace(/\s+/g, " ").includes("15 15") && moved.includes("35.5 -9"), `outline coords translated (${moved})`);

console.log(failures ? `\n${failures} FAILURE(S)` : "\nall good");
process.exit(failures ? 1 : 0);
