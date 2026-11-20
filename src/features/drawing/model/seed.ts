import { doc } from "../../../shared/document";
export function seed() {
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4,
      cx = 400 + Math.cos(a) * 100,
      cy = 280 + Math.sin(a) * 100;
    const nodes = Array.from({ length: 4 }, (_, i) => {
      const t = (i * Math.PI) / 2;
      const x = cx + Math.cos(t) * 65,
        y = cy + Math.sin(t) * 65;
      return {
        x,
        y,
        in: { x: x + Math.sin(t) * 36, y: y - Math.cos(t) * 36 },
        out: { x: x - Math.sin(t) * 36, y: y + Math.cos(t) * 36 },
      };
    });
    doc.shapes.push({
      id: "petal" + k,
      name: "Petal " + (k + 1),
      nodes,
      closed: true,
      fill: ["#7850d6", "#a685ed", "#cbb9f4", "#523391"][k % 4],
      stroke: "#ffffff",
      width: 2,
      opacity: 1,
    });
  }
  doc.shapes.push({
    id: "wave-text",
    name: "Wave 路径文字",
    nodes: [
      { x: 70, y: 470, in: { x: 70, y: 470 }, out: { x: 230, y: 370 } },
      { x: 400, y: 480, in: { x: 280, y: 545 }, out: { x: 520, y: 415 } },
      { x: 730, y: 440, in: { x: 610, y: 490 }, out: { x: 730, y: 440 } },
    ],
    closed: false,
    fill: "none",
    stroke: "#b5a0ef",
    width: 2,
    opacity: 1,
    text: {
      content: "沿路径文字 · text on a curving path",
      fontFamily: "sans-serif",
      fontSize: 26,
      letterSpacing: 1,
      startOffset: 30,
      direction: 1,
      color: "#523391",
    },
  });
}

