<script setup lang="ts">
import { computed } from 'vue'
import {
  attributesSection,
  propsSection,
  eventsSection,
  methodsSection,
  slotsSection,
  viewportSection,
  groupSection,
} from '../../../../shared/api'

/**
 * API 表格（原 VitePress ApiDoc 组件的 Docus 形态）：直接渲染 shared/api.ts 的
 * 单一来源数据（与 Playground 表格、README 生成脚本共用同一份数据）。
 * MDC 的 props 不支持脚本绑定，所以按 section 名自取数据：::api-section{name="props"}。
 */
const props = defineProps<{ name: keyof typeof sections }>()

const sections = {
  attributes: attributesSection,
  props: propsSection,
  events: eventsSection,
  methods: methodsSection,
  slots: slotsSection,
  viewport: viewportSection,
  group: groupSection,
}

const section = computed(() => sections[props.name])
</script>

<template>
  <section v-if="section" class="api-doc-section">
    <!-- h2 而非 h3：/api 是全站最长的页（万级字符），原先 h1 → h3 跳级、
         页面里一个 h2 都没有，侧栏「本页内容」也少了这一层分组。 -->
    <h2 :id="section.id">
      {{ section.title }}
    </h2>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <p v-if="section.intro" v-html="section.intro" />
    <div class="vue-okr-tree-demo">
      <table>
        <thead>
          <tr>
            <th v-for="col in section.columns" :key="col">
              {{ col }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in section.rows" :key="i">
            <td v-for="(cell, j) in row" :key="j" v-html="cell" />
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style>
.api-doc-section h2 {
  margin-bottom: 4px;
}
</style>
