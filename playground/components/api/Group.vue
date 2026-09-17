<template>
  <ApiTable title="OkrTreeGroup 与键盘导航" anchor="api-group" :columns="columns" :rows="rows">
    Vue 3 版新增。<code>OkrTreeGroup</code> 包裹多棵 OKR
    模式的树，使组内根节点水平坐标一致（原版需在业务层手动测量 DOM）；需成员树开启
    <code>align-root</code>（默认）。键盘导航为所有树内置。
  </ApiTable>
</template>

<script setup lang="ts">
import ApiTable from './ApiTable.vue'

const columns = ['名称', '类型', '说明']
const rows: string[][] = [
  ['align（prop）', 'boolean，默认 true', '是否对齐；为 false 时各树独立排布'],
  ['default（slot）', '—', '放置若干 <code>&lt;vue-okr-tree only-both-tree&gt;</code>'],
  [
    'refresh()（method）',
    '—',
    '手动重新测量（字体加载完成、外部样式变化等场景；组件已自动响应成员挂载/更新与尺寸变化）',
  ],
  [
    '键盘导航',
    '—',
    'Tab 进入，↑/↓ 在可见节点间移动，→ 展开或进入子节点，← 收起或回到父节点，Enter/Space 选中，Home/End 首尾；OKR 根节点 ← 进入左子树，左树节点镜像。节点带 <code>role=treeitem</code> / <code>aria-expanded</code> / <code>aria-selected</code> / <code>aria-level</code>，焦点环可用 <code>--okr-focus-color</code> / <code>--okr-focus-width</code> 定制',
  ],
]
</script>
