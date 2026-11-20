<script setup lang="ts">
import { computed } from "vue";
import { beginEdit } from "../../drawing";
import type { Shape } from "../../../shared/types";
import { fonts, measureGlyph } from "../lib/measure.ts";
import { layoutText } from "../lib/layout.ts";
import { addText, removeText, setText, convertToOutlines } from "../model/text.ts";

const props = defineProps<{ shape: Shape }>();

const layout = computed(() =>
  props.shape.text
    ? layoutText(props.shape, props.shape.text, measureGlyph)
    : undefined,
);

function editContent(e: Event) {
  if (!props.shape.text) return;
  // @focus already pushed one history snapshot for this typing session
  props.shape.text.content = (e.target as HTMLTextAreaElement).value;
}
</script>

<template>
  <template v-if="shape.text">
    <h4>PATH TEXT 路径文字</h4>
    <label class="block"
      >内容
      <textarea
        rows="2"
        :value="shape.text.content"
        @focus="beginEdit()"
        @input="editContent"
      ></textarea>
    </label>
    <label
      >字体
      <select
        :value="shape.text.fontFamily"
        @change="setText(shape, 'fontFamily', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="f in fonts" :key="f" :value="f">{{ f }}</option>
      </select>
    </label>
    <label
      >字号
      <input
        type="number"
        min="4"
        max="400"
        :value="shape.text.fontSize"
        @change="setText(shape, 'fontSize', +($event.target as HTMLInputElement).value)"
      />
    </label>
    <label
      >字距
      <input
        type="number"
        step="0.5"
        :value="shape.text.letterSpacing"
        @change="setText(shape, 'letterSpacing', +($event.target as HTMLInputElement).value)"
      />
    </label>
    <label
      >起始偏移
      <input
        type="number"
        :value="shape.text.startOffset"
        @change="setText(shape, 'startOffset', +($event.target as HTMLInputElement).value)"
      />
    </label>
    <label
      >方向
      <span class="direction">
        <button
          :class="{ active: shape.text.direction === 1 }"
          @click="setText(shape, 'direction', 1)"
        >
          正向
        </button>
        <button
          :class="{ active: shape.text.direction === -1 }"
          @click="setText(shape, 'direction', -1)"
        >
          反向
        </button>
      </span>
    </label>
    <label
      >文字颜色
      <input
        type="color"
        :value="shape.text.color"
        @change="setText(shape, 'color', ($event.target as HTMLInputElement).value)"
      />
    </label>
    <p v-if="layout" class="text-stats" :class="{ warn: layout.overflowCount }">
      <template v-if="layout.overflowCount">
        ⚠ 文字超出路径 {{ Math.round(layout.overflowPx) }}px（{{
          layout.overflowCount
        }}
        字），溢出部分已用红色标出；字号保持不变，不会自动缩小。
      </template>
      <template v-else>
        路径 {{ Math.round(layout.table.total) }}px · 文字占用
        {{ Math.round(layout.used) }}px，未溢出。
      </template>
    </p>
    <button class="outline-btn" @click="convertToOutlines(shape)">
      转为字形轮廓
    </button>
    <p class="hint">
      转换后保留字符洞口与颜色，文字不可再编辑；按 ↶ 撤销可恢复原文与路径关联。
    </p>
    <button class="remove-text" @click="removeText(shape)">移除路径文字</button>
  </template>
  <template v-else-if="shape.d">
    <h4>PATH TEXT 路径文字</h4>
    <p class="hint">此对象已转为字形轮廓，文字不可再编辑；按 ↶ 撤销可恢复原文。</p>
  </template>
  <template v-else>
    <h4>PATH TEXT 路径文字</h4>
    <button class="outline-btn" @click="addText(shape)">＋ 添加路径文字</button>
  </template>
</template>
