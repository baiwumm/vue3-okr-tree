<template>
  <ApiTable title="Events" anchor="api-events" :columns="columns" :rows="rows">
    <code>node</code> 均为内部 Node 实例，<code>nodeComponent</code> 为递归节点组件实例。
  </ApiTable>
</template>

<script setup lang="ts">
import ApiTable from './ApiTable.vue'

const columns = ['事件名称', '说明', '回调参数']
const rows: string[][] = [
  ['node-click', '节点被点击时的回调（同时设置当前选中态）', '(data, node, nodeComponent)'],
  ['node-expand', '节点被展开时触发的事件', '(data, node, nodeComponent)'],
  ['node-collapse', '节点被关闭时触发的事件', '(data, node, nodeComponent)'],
  [
    'node-contextmenu',
    '当某一节点被鼠标右键点击时会触发该事件。仅当外部绑定了该事件时才阻止浏览器默认右键菜单',
    '(event, data, node, nodeComponent)',
  ],
]
</script>
