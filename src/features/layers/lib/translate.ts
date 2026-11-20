import type { Shape } from "../../../shared/types";
import { mapPathCoords } from "../../drawing/lib/path.ts";
export function translate(s: Shape, x: number, y: number) {
  if (s.d) s.d = mapPathCoords(s.d, (px, py) => [px + x, py + y]);
  s.nodes.forEach((n) => {
    n.x += x;
    n.y += y;
    n.in.x += x;
    n.in.y += y;
    n.out.x += x;
    n.out.y += y;
  });
}
