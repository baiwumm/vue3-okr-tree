<template>
  <ApiTable title="Methods" anchor="api-methods" :columns="columns" :rows="rows">
    通过组件 <code>ref</code> 调用。增删类方法会同步修改传入的源数据（与 vue-okr-tree 一致）。
  </ApiTable>
</template>

<script setup lang="ts">
import ApiTable from './ApiTable.vue'

const columns = ['方法名', '说明', '参数']
const rows: string[][] = [
  [
    'filter',
    '对树节点进行筛选操作；onlyBothTree 模式下同时过滤左右子树。未设置 filter-node-method 时抛错',
    '(value) 在 filter-node-method 中作为第一个参数',
  ],
  [
    'updateKeyChildren',
    '通过 key 设置节点的子元素，使用此方法必须设置 node-key 属性（缺失抛错）',
    '(key, data) 1. 节点的 key 2. 子节点数据',
  ],
  [
    'getNode',
    '根据 data / key / Node 实例获取内部 Node。OKR 模式下右树优先，右树不存在时回退到左树',
    '(data) 要获得 node 的 key、data 对象或 Node 实例',
  ],
  [
    'setCurrentNode',
    '通过 node 设置某个节点的当前选中状态，必须设置 node-key（缺失抛错）',
    '(node) 待被选节点的 Node 实例',
  ],
  [
    'setCurrentKey',
    '通过 key 设置某个节点的当前选中状态，必须设置 node-key（缺失抛错）',
    '(key) 待被选节点的 key，若为 null 则取消当前高亮',
  ],
  [
    'getCurrentKey',
    '获取当前被选中节点的 key，若没有节点被选中则返回 null。必须设置 node-key（缺失抛错）',
    '—',
  ],
  ['getCurrentNode', '获取当前被选中节点的 data，若没有节点被选中则返回 null', '—'],
  [
    'remove',
    '删除 Tree 中的一个节点，使用此方法必须设置 node-key（未设置时静默无效）。会同步删除源数据中的对应项',
    '(data) 要删除的节点的 data、key 或 Node 实例',
  ],
  [
    'append',
    '为 Tree 中的一个节点追加一个子节点。会同步写入源数据的 children',
    '(data, parentNode) 1. 要追加的子节点的 data 2. 父节点的 data、key 或 Node 实例（省略则追加为根）',
  ],
  [
    'insertBefore',
    '为 Tree 的一个节点的前面增加一个节点。会同步写入源数据',
    '(data, refNode) 1. 要增加的节点的 data 2. 参考节点的 data、key 或 Node 实例',
  ],
  [
    'insertAfter',
    '为 Tree 的一个节点的后面增加一个节点。会同步写入源数据',
    '(data, refNode) 1. 要增加的节点的 data 2. 参考节点的 data、key 或 Node 实例',
  ],
]
</script>
