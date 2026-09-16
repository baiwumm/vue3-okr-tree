<template>
  <div>
    <h3 id="demo-16" class="tree-demo-title-h3">支持的事件(可被展开)</h3>
    <p>可展开时支持的事件有 节点点击、鼠标右键点击，节点的展开以及节点的关闭。</p>
    <BaseCard>
      <template #header>
        <div class="component-wrapper">
          <EventLog ref="log" />
          <VueOkrTree
            :data="testData"
            :left-data="testLeftData"
            only-both-tree
            direction="horizontal"
            show-collapsable
            node-key="id"
            default-expand-all
            @node-click="handleNodeClick"
            @node-contextmenu="handleCoxMenu"
            @node-expand="handleNodeExpand"
            @node-collapse="handleNodeCollapse"
          />
        </div>
      </template>
      <template #description>
        该模式必须设置 <code>onlyBothTree</code>，以及通过 <code>leftData</code>
        表示左子树的结构。点击根节点左右两侧的 +/- 按钮会分别触发
        <code>node-expand</code> / <code>node-collapse</code>。
      </template>
      <CodeBlock :code="code" />
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VueOkrTree, type TreeNode, type TreeNodeData } from 'vue3-okr-tree'
import BaseCard from '../BaseCard.vue'
import CodeBlock from '../CodeBlock.vue'
import EventLog from '../EventLog.vue'
import { keyedData, leftData } from '../../data'

const log = ref<InstanceType<typeof EventLog> | null>(null)
const testData = ref(keyedData())
const testLeftData = ref(leftData())

const side = (node: TreeNode) => (node.isLeftChild ? '左树' : '右树')

function handleNodeClick(data: TreeNodeData, node: TreeNode) {
  log.value?.push('node-click', `[${side(node)}] 我是「${data.label}」，我被点击了`)
}
function handleCoxMenu(_event: MouseEvent, data: TreeNodeData, node: TreeNode) {
  log.value?.push('node-contextmenu', `[${side(node)}] 我是「${data.label}」，我的右键被点击了`)
}
function handleNodeExpand(data: TreeNodeData, node: TreeNode) {
  log.value?.push('node-expand', `[${side(node)}] 我是「${data.label}」，我被展开了`)
}
function handleNodeCollapse(data: TreeNodeData, node: TreeNode) {
  log.value?.push('node-collapse', `[${side(node)}] 我是「${data.label}」，我被收起了`)
}

const code = `
<template>
  <vue-okr-tree
    :data="testData"
    :left-data="testLeftData"
    only-both-tree
    direction="horizontal"
    show-collapsable
    node-key="id"
    default-expand-all
    @node-click="handleNodeClick"
    @node-contextmenu="handleCoxMenu"
    @node-expand="handleNodeExpand"
    @node-collapse="handleNodeCollapse"
  />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'

const testData = ref([/* 右树 */])
const testLeftData = ref([/* 左树 */])

const handleNodeClick = (data, node) => alert(\`我是\${data.label},我被点击了\`)
const handleCoxMenu = (event, data, node) => alert(\`我是\${data.label},我的右键被点击了\`)
const handleNodeExpand = (data, node) => alert(\`我是\${data.label},我被展开了\`)
const handleNodeCollapse = (data, node) => alert(\`我是\${data.label},我被收起了\`)
<\/script>
`
</script>
