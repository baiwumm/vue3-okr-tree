<template>
  <div>
    <h3 id="demo-15" class="tree-demo-title-h3">支持的事件(不可展开)</h3>
    <p>不可展开时支持的事件有 节点点击 和 鼠标右键点击。</p>
    <BaseCard>
      <template #header>
        <div class="component-wrapper">
          <EventLog ref="log" />
          <VueOkrTree
            :data="testData"
            @node-click="handleNodeClick"
            @node-contextmenu="handleCoxMenu"
          />
        </div>
      </template>
      <template #description>
        <code>node-click</code> 回调参数为 <code>(data, node, nodeComponent)</code>；
        <code>node-contextmenu</code> 回调参数为 <code>(event, data, node, nodeComponent)</code>。
        只有外部监听了 <code>node-contextmenu</code> 时组件才会阻止浏览器默认右键菜单。
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
import { baseData, baseDataSnippet } from '../../data'

const log = ref<InstanceType<typeof EventLog> | null>(null)
const testData = ref(baseData())

function handleNodeClick(data: TreeNodeData, node: TreeNode) {
  log.value?.push('node-click', `我是「${data.label}」(level ${node.level})，我被点击了`)
}
function handleCoxMenu(_event: MouseEvent, data: TreeNodeData) {
  log.value?.push('node-contextmenu', `我是「${data.label}」，我的右键被点击了`)
}

const code = `
<template>
  <vue-okr-tree
    :data="testData"
    @node-click="handleNodeClick"
    @node-contextmenu="handleCoxMenu"
  />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'

const testData = ref(${baseDataSnippet.replace('testData: ', '')})

function handleNodeClick(data, node, nodeComponent) {
  alert(\`我是\${data.label},我被点击了\`)
}
function handleCoxMenu(event, data, node, nodeComponent) {
  alert(\`我是\${data.label},我的右键被点击了\`)
}
<\/script>
`
</script>
