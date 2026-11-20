<script setup lang="ts">
import { computed, ref } from "vue";
import { doc } from "../../../shared/document";
import { serialize } from "../lib/serialize";
import type { ExportMode } from "../lib/serialize";
import { download } from "../model/download";
import { save, restore } from "../model/storage";
const props = defineProps<{ paths: string[] }>();

const open = ref(false);
const mode = ref<ExportMode>("editable");

const textShapes = computed(() => doc.shapes.filter((s) => s.text));
const fontsUsed = computed(() => [
  ...new Set(textShapes.value.map((s) => s.text!.fontFamily)),
]);

const kb = (s: string) => (new Blob([s]).size / 1024).toFixed(1);
const sizes = computed(() => {
  if (!open.value || !textShapes.value.length) return undefined;
  return {
    editable: kb(serialize(doc.shapes, props.paths, "editable")),
    outline: kb(serialize(doc.shapes, props.paths, "outline")),
  };
});

function doExport() {
  download(serialize(doc.shapes, props.paths, mode.value));
  open.value = false;
}
</script>

<template>
  <div class="export">
    <button @click="restore">Restore</button
    ><button @click="save">Save project</button
    ><button class="primary" data-testid="export" @click="open = true">
      Export SVG ↗
    </button>
  </div>
  <div v-if="open" class="dialog-backdrop" @click.self="open = false">
    <div class="dialog">
      <h3>导出 SVG</h3>
      <template v-if="textShapes.length">
        <p class="dialog-sub">
          文档含 {{ textShapes.length }} 段路径文字（字体：{{
            fontsUsed.join("、")
          }}），请选择文字导出方式：
        </p>
        <label class="option" :class="{ chosen: mode === 'editable' }">
          <input type="radio" value="editable" v-model="mode" />
          <span>
            <b>保留可编辑文字<em v-if="sizes">约 {{ sizes.editable }} KB</em></b>
            以 &lt;textPath&gt; 导出，文件小、文字仍可选择与编辑；但查看设备缺少上述字体时会回退为替代字体，版式可能改变。
          </span>
        </label>
        <label class="option" :class="{ chosen: mode === 'outline' }">
          <input type="radio" value="outline" v-model="mode" />
          <span>
            <b>转为字形轮廓<em v-if="sizes">约 {{ sizes.outline }} KB</em></b>
            文字烘焙为 &lt;path&gt;，任何设备显示一致、无需字体；代价是文件更大，且文字不再可编辑（字符洞口与颜色会保留）。
          </span>
        </label>
      </template>
      <p v-else class="dialog-sub">当前文档没有路径文字，将直接导出矢量图形。</p>
      <div class="dialog-actions">
        <button @click="open = false">取消</button>
        <button class="primary" data-testid="export-confirm" @click="doExport">
          导出
        </button>
      </div>
    </div>
  </div>
</template>
