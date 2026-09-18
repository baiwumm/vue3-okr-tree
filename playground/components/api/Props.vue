<template>
  <ApiTable title="Props" anchor="api-props" :columns="columns" :rows="rows">
    通过 <code>props</code> 属性传入的字段映射配置。
  </ApiTable>
</template>

<script setup lang="ts">
import ApiTable from './ApiTable.vue'

const columns = ['参数', '说明', '类型', '默认值']
const rows: string[][] = [
  [
    'label',
    '指定节点文本为节点对象的某个属性值，或由函数返回',
    'string / function(data, node)',
    'label',
  ],
  ['children', '指定子树为节点对象的某个属性值', 'string', 'children'],
  [
    'disabled',
    '指定禁用字段（Vue 3 版实现真实禁用：禁用节点带 <code>is-disabled</code> 类，点击不选中、不触发 node-click）',
    'string / function(data, node)',
    'disabled',
  ],
  [
    'isLeaf',
    '指定叶子字段（Vue 3 版新增）：lazy 模式下未加载节点的 isLeaf 取该字段，标记为叶子的节点不显示展开按钮、不触发 load',
    'string / function(data, node)',
    '—',
  ],
]
</script>
