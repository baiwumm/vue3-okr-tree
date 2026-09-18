<template>
  <div>
    <h3 id="demo-node-click-expand" class="tree-demo-title-h3">
      点击节点内容展开（expand-on-click-node）
    </h3>
    <p>点击节点内容区域即可切换该节点的展开 / 收起（默认关闭，保持原版行为）。</p>
    <BaseCard>
      <template #header>
        <div class="component-wrapper">
          <VueOkrTree
            :data="testData"
            direction="horizontal"
            show-collapsable
            expand-on-click-node
          />
        </div>
      </template>
      <template #description>
        设置 <code>expand-on-click-node</code> 后，点击节点内容切换展开，选中态与
        <code>node-click</code>
        事件照常触发；叶子节点点击只选中不切换。OKR
        模式下根节点点击内容只切换右侧子树（左侧仍由左侧按钮控制）。
      </template>
      <CodeBlock :code="code" />
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'
import BaseCard from '../BaseCard.vue'
import CodeBlock from '../CodeBlock.vue'
import { baseData, baseDataSnippet } from '../../data'

const testData = ref(baseData())

const code = `
<template>
  <vue-okr-tree :data="testData" direction="horizontal" show-collapsable expand-on-click-node />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'

const testData = ref(${baseDataSnippet.replace('testData: ', '')})
<\/script>
`
</script>
