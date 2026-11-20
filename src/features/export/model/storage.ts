import { beginEdit, revision } from "../../drawing";
import { ref } from "vue";
import { doc } from "../../../shared/document";
import type { Shape, Point } from "../../../shared/types";
export const storageStatus = ref("All changes saved locally");
export function save() {
  try {
    localStorage.setItem("forma-document", JSON.stringify(doc.shapes));
    storageStatus.value = "All changes saved locally";
  } catch {
    storageStatus.value =
      "Local storage unavailable — export to keep your work";
  }
}
function point(v: Point) {
  return v && Number.isFinite(v.x) && Number.isFinite(v.y);
}
function validText(t: unknown): boolean {
  if (!t || typeof t !== "object") return false;
  const x = t as Record<string, unknown>;
  return (
    typeof x.content === "string" &&
    typeof x.fontFamily === "string" &&
    Number.isFinite(x.fontSize) &&
    Number.isFinite(x.letterSpacing) &&
    Number.isFinite(x.startOffset) &&
    (x.direction === 1 || x.direction === -1) &&
    typeof x.color === "string" &&
    /^#[0-9a-f]{3,8}$/i.test(x.color)
  );
}
function valid(s: Shape) {
  return (
    s &&
    typeof s.id === "string" &&
    typeof s.name === "string" &&
    Array.isArray(s.nodes) &&
    s.nodes.every((n) => point(n) && point(n.in) && point(n.out)) &&
    typeof s.fill === "string" &&
    /^(none|#[0-9a-f]{3,8})$/i.test(s.fill) &&
    typeof s.stroke === "string" &&
    /^#[0-9a-f]{3,8}$/i.test(s.stroke) &&
    Number.isFinite(s.width) &&
    Number.isFinite(s.opacity) &&
    (s.text === undefined || validText(s.text)) &&
    (s.d === undefined || typeof s.d === "string")
  );
}
export function restore() {
  try {
    const value = JSON.parse(localStorage.getItem("forma-document") || "null");
    if (Array.isArray(value) && value.every(valid)) {
      beginEdit();
      doc.shapes = value;
      revision.value++;
      doc.selected = [];
      return true;
    }
  } catch {}
  return false;
}
