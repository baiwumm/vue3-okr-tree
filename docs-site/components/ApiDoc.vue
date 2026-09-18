<script setup lang="ts">
import type { ApiSection } from '../../shared/api'

/**
 * 文档站 API 表格：直接渲染 shared/api.ts 的单一来源数据
 * （与 Playground 表格、README 生成脚本共用同一份数据）。
 */
defineProps<{ section: ApiSection }>()
</script>

<template>
  <section class="api-doc-section">
    <h3 :id="section.id" tabindex="-1">{{ section.title }}</h3>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <p v-if="section.intro" v-html="section.intro" />
    <div class="vue-okr-tree-demo">
      <table>
        <thead>
          <tr>
            <th v-for="col in section.columns" :key="col">{{ col }}</th>
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
