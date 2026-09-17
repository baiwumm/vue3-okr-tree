<template>
  <ApiTable title="Slots" anchor="api-slots" :columns="columns" :rows="rows">
    Vue 3 版新增的插槽。<code>#default</code> 与 <code>render-content</code>、<code
      >#expand-btn</code
    >
    与 <code>node-btn-content</code> 二者任选其一，插槽优先。
  </ApiTable>
</template>

<script setup lang="ts">
import ApiTable from './ApiTable.vue'

const columns = ['插槽名', '说明', '作用域参数']
const rows: string[][] = [
  ['default', '节点内容', '<code>{ node, data }</code>，node 为内部 Node 实例'],
  [
    'expand-btn',
    '展开按钮内容；<code>show-node-num</code> 开启时折叠态的数字优先于该插槽',
    '<code>{ node, data, expanded, side }</code>，side 为 <code>right</code>（常规/右子树）或 <code>left</code>（OKR 左子树）',
  ],
  ['empty', '<code>data</code> 为空数组时在容器内渲染', '—'],
]
</script>
