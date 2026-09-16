<template>
  <div>
    <h3 id="demo-6" class="tree-demo-title-h3">节点的样式</h3>
    <p>可自行设置节点的默认样式、选中的样式，以及节点的宽高。</p>
    <BaseCard>
      <template #header>
        <div class="component-wrapper">
          <div class="demo-controls">
            <label>
              label-width
              <input v-model.number="labelWidth" type="number" min="0" step="10" />
            </label>
            <label>
              label-height
              <input v-model.number="labelHeight" type="number" min="0" step="10" />
            </label>
            <span>（0 表示 auto；点击节点查看选中样式）</span>
          </div>
          <VueOkrTree
            :data="testData"
            direction="horizontal"
            show-collapsable
            default-expand-all
            :label-width="labelWidth || undefined"
            :label-height="labelHeight || undefined"
            :label-class-name="renderLabelClass"
            :current-lable-class-name="renderCurrentClass"
          />
        </div>
      </template>
      <template #description>
        通过 <code>label-class-name</code> 设置节点的样式，支持字符和函数方式；通过
        <code>current-lable-class-name</code> 设置当前节点选中的样式，支持字符和函数方式。
        <code>label-width</code> / <code>label-height</code> 为 number 时单位 px，为 string
        时直接作为 style 值。函数形式的参数是内部 Node 实例（源数据在 <code>node.data</code>）。
      </template>
      <CodeBlock :code="code" />
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VueOkrTree, type TreeNode } from 'vue3-okr-tree'
import BaseCard from '../BaseCard.vue'
import CodeBlock from '../CodeBlock.vue'
import { baseData, baseDataSnippet } from '../../data'

const testData = ref(baseData())
const labelWidth = ref(0)
const labelHeight = ref(0)

function renderLabelClass(_node: TreeNode) {
  return 'label-class-blue'
}
function renderCurrentClass(_node: TreeNode) {
  return 'label-bg-blue'
}

const code = `
<template>
  <vue-okr-tree
    :data="testData"
    direction="horizontal"
    show-collapsable
    default-expand-all
    :label-width="140"
    :label-class-name="renderLabelClass"
    :current-lable-class-name="renderCurrentClass"
  />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'

const testData = ref(${baseDataSnippet.replace('testData: ', '')})

// 参数 node 为内部 Node 实例，可按 node.data / node.level 等返回不同 class
const renderLabelClass = (node) => 'label-class-blue'
const renderCurrentClass = (node) => 'label-bg-blue'
<\/script>

<style>
.label-class-blue { color: #1989fa; }
.label-bg-blue { background: #1989fa; color: #fff; }
</style>
`
</script>

<style>
.label-class-blue {
  color: #1989fa;
}
.label-bg-blue {
  background: #1989fa;
  color: #fff;
}
</style>
