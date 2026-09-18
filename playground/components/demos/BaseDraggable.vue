<template>
  <div>
    <h3 id="demo-draggable" class="tree-demo-title-h3">拖拽调整层级（draggable）</h3>
    <p>拖动节点卡片，放到目标节点的上 / 内 / 下三个区域完成移动（水平模式按纵向分区）。</p>
    <BaseCard>
      <template #header>
        <div class="component-wrapper">
          <EventLog ref="log" />
          <VueOkrTree
            :data="testData"
            direction="horizontal"
            show-collapsable
            draggable
            node-key="id"
            :allow-drag="allowDrag"
            :allow-drop="allowDrop"
            @node-drag-start="onDragStart"
            @node-drop="onDrop"
            @node-drag-end="onDragEnd"
          />
        </div>
      </template>
      <template #description>
        设置 <code>draggable</code> 开启拖拽，移动会<strong>同步修改源数据 children</strong>；
        放置位置对齐 el-tree：prev（目标前 25%）/ inner（中间，成为子节点并自动展开）/ next（后
        25%），指示线颜色可用
        <code>--okr-drop-color</code> 定制。硬性规则：不可放到自身或自己的子树内；
        <code>allow-drag(node)</code> 可禁止拖动（本例禁止拖「财务部」），
        <code>allow-drop(dragging, target, type)</code> 可按位置过滤；OKR 模式跨左右树默认禁止，
        <code>allow-drop</code> 返回 true 可放开。
      </template>
      <CodeBlock :code="code" />
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VueOkrTree, type TreeNode, type DropType } from 'vue3-okr-tree'
import BaseCard from '../BaseCard.vue'
import CodeBlock from '../CodeBlock.vue'
import EventLog from '../EventLog.vue'
import { keyedData } from '../../data'

const log = ref<InstanceType<typeof EventLog> | null>(null)
const testData = ref(keyedData())

// 示例：财务部（id 9）不允许被拖动
function allowDrag(node: TreeNode) {
  return node.key !== 9
}
// 示例：叶子节点不允许被掏空（不能把目标 inner 放置到叶子上没有意义，演示钩子用法）
function allowDrop(_dragging: TreeNode, target: TreeNode, _type: DropType) {
  return target.key !== 9
}
function onDragStart(node: TreeNode) {
  log.value?.push('node-drag-start', `开始拖动「${node.label}」`)
}
function onDrop(dragging: TreeNode, target: TreeNode, type: DropType) {
  log.value?.push('node-drop', `「${dragging.label}」→「${target.label}」的 ${type}`)
}
function onDragEnd(dragging: TreeNode, target: TreeNode | null, type: DropType | null) {
  if (!target || !type) log.value?.push('node-drag-end', `「${dragging.label}」未完成放置`)
  else log.value?.push('node-drag-end', `「${dragging.label}」放置完成`)
}

const code = `
<template>
  <vue-okr-tree
    ref="treeRef"
    :data="testData"
    direction="horizontal"
    show-collapsable
    draggable
    node-key="id"
    :allow-drag="allowDrag"
    :allow-drop="allowDrop"
    @node-drag-start="onDragStart"
    @node-drop="onDrop"
  />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'

const treeRef = ref()
const testData = ref([{ id: 1, label: 'xxx科技有有限公司', children: [/* … */] }])

const allowDrag = (node) => node.key !== 9
const allowDrop = (dragging, target, type) => type !== 'inner'
function onDrop(dragging, target, type) {
  console.log(dragging.label, target.label, type)
}
// 编程式移动（同样同步源数据）：
// treeRef.value.moveNode(12, 11, 'inner')
<\/script>
`
</script>
