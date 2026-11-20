<script setup lang="ts">
import { ref } from "vue";
import { active } from "../model/active";
import { style } from "../model/style";
import { colors } from "../lib/colors";
import { TextSection } from "../../textpath";
import { scaleSelected } from "../../layers";
import { doc } from "../../../shared/document";

const scalePct = ref(100);
function applyScale() {
  scaleSelected(scalePct.value / 100);
  scalePct.value = 100;
}
</script>

<template>
  <aside>
    <h3>Design <span>•••</span></h3>
    <template v-if="active"
      ><h4>APPEARANCE</h4>
      <label
        >Fill
        <input
          aria-label="Fill"
          type="color"
          :value="active.fill === 'none' ? '#ffffff' : active.fill"
          @input="style('fill', ($event.target as HTMLInputElement).value)"
      /></label>
      <div class="swatches">
        <button
          v-for="c in colors"
          :style="{ background: c }"
          @click="style('fill', c)"
        ></button>
      </div>
      <label
        >Stroke
        <input
          aria-label="Stroke"
          type="color"
          :value="active.stroke"
          @input="
            style('stroke', ($event.target as HTMLInputElement).value)
          " /></label
      ><label
        >Weight
        <input
          type="number"
          min="0"
          max="30"
          :value="active.width"
          @input="
            style('width', +($event.target as HTMLInputElement).value)
          " /></label
      ><label
        >Opacity
        <input
          aria-label="Opacity"
          type="range"
          min="0"
          max="1"
          step=".01"
          :value="active.opacity"
          @input="style('opacity', +($event.target as HTMLInputElement).value)"
      /></label>
      <h4>TRANSFORM 变换</h4>
      <label
        >组缩放 %
        <input type="number" min="1" v-model.number="scalePct"
      /></label>
      <button class="outline-btn" @click="applyScale">应用缩放</button>
      <p class="hint">
        组缩放会等比缩放路径与文字度量；单独改“字号”则让文字沿原路径重新排布，二者结果不同。
      </p>
      <TextSection :shape="active" />
      <h4>PATH DETAILS</h4>
      <p>{{ active.nodes.length }} anchor points</p>
      <label
        >Closed path
        <input
          type="checkbox"
          :checked="active.closed"
          @change="
            style('closed', ($event.target as HTMLInputElement).checked)
          " /></label
    ></template>
    <p v-else>Select an object to edit its appearance.</p>
    <div class="tip">
      ✦ Make room for ideas.<br /><small
        >Every great shape starts with a point.</small
      >
    </div>
  </aside>
</template>
