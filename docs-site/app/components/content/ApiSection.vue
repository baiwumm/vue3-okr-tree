<script setup lang="ts">
import { computed } from 'vue'
import {
  attributesSection,
  propsSection,
  eventsSection,
  methodsSection,
  slotsSection,
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
  group: groupSection,
}

const section = computed(() => sections[props.name])
</script>

<template>
  <section v-if="section" class="api-doc-section">
    <h3 :id="section.id">
      {{ section.title }}
    </h3>
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
.api-doc-section h3 {
  margin-bottom: 4px;
}
</style>
