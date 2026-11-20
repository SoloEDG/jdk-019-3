<script setup lang="ts">
import { computed } from "vue";
import type { Shape } from "../../../shared/types";
import { layoutText } from "../lib/layout.ts";
import { measureGlyph } from "../lib/measure.ts";
import { pointAt } from "../lib/arclen.ts";

const props = defineProps<{ shape: Shape }>();

const layout = computed(() =>
  props.shape.text
    ? layoutText(props.shape, props.shape.text, measureGlyph)
    : undefined,
);

/** explicit overflow range: dashed bracket from the path boundary to the
 *  end of the last overflowing glyph — never silently shrunk to fit */
const overflowMark = computed(() => {
  const l = layout.value;
  if (!l || !l.overflowCount || !props.shape.text) return undefined;
  const t = props.shape.text;
  const from = pointAt(l.table, t.direction === 1 ? l.table.total : 0);
  const last = l.glyphs.filter((g) => g.overflow).at(-1)!;
  const rad = (last.angle * Math.PI) / 180;
  const to = {
    x: last.x + (Math.cos(rad) * last.advance) / 2,
    y: last.y + (Math.sin(rad) * last.advance) / 2,
  };
  const tick = (p: { x: number; y: number }, angle: number) => {
    const a = (angle * Math.PI) / 180 + Math.PI / 2,
      r = 6;
    return {
      x1: p.x - Math.cos(a) * r,
      y1: p.y - Math.sin(a) * r,
      x2: p.x + Math.cos(a) * r,
      y2: p.y + Math.sin(a) * r,
    };
  };
  return {
    from,
    to,
    tickFrom: tick(from, from.angle),
    tickTo: tick(to, last.angle),
    label: {
      x: to.x + 10,
      y: to.y - 8,
      text: `溢出 ${l.overflowCount} 字 · ${Math.round(l.overflowPx)}px`,
    },
  };
});
</script>

<template>
  <g v-if="layout && shape.text" class="text-on-path">
    <text
      v-for="(g, i) in layout.glyphs"
      :key="i"
      class="glyph"
      :class="{ 'glyph-overflow': g.overflow }"
      :transform="`translate(${g.x} ${g.y}) rotate(${g.angle})`"
      :font-family="shape.text.fontFamily"
      :font-size="shape.text.fontSize"
      :fill="shape.text.color"
      text-anchor="middle"
      >{{ g.ch }}</text
    >
    <g v-if="overflowMark" class="overflow-mark">
      <line
        :x1="overflowMark.from.x"
        :y1="overflowMark.from.y"
        :x2="overflowMark.to.x"
        :y2="overflowMark.to.y"
      />
      <line v-bind="overflowMark.tickFrom" />
      <line v-bind="overflowMark.tickTo" />
      <text :x="overflowMark.label.x" :y="overflowMark.label.y">
        {{ overflowMark.label.text }}
      </text>
    </g>
  </g>
</template>
