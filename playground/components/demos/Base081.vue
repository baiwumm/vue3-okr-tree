<template>
  <div>
    <h3 id="demo-12" class="tree-demo-title-h3">OKR 展示模式显示节点数</h3>
    <p>通过 <code>show-node-num</code> 可以显示展开的子节点数。</p>
    <BaseCard>
      <template #header>
        <div class="component-wrapper">
          <VueOkrTree
            :data="testData"
            :left-data="testLeftData"
            only-both-tree
            direction="horizontal"
            show-collapsable
            node-key="id"
            label-class-name="no-padding"
            show-node-num
            :render-content="renderContent"
            :node-btn-content="renderBtnContent"
          />
        </div>
      </template>
      <template #description>
        <code>show-node-num</code> 在节点折叠时于圆形按钮内显示子节点数量；配合
        <code>node-btn-content</code> 时显示自定义按钮内容。本例先收起几个节点（点击 +/-
        按钮）观察数字。
      </template>
      <CodeBlock :code="code" />
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref, type h as H } from 'vue'
import { VueOkrTree, type TreeNode } from 'vue3-okr-tree'
import BaseCard from '../BaseCard.vue'
import CodeBlock from '../CodeBlock.vue'
import { okrContentData, okrContentLeftData } from '../../data'

const testData = ref(okrContentData())
const testLeftData = ref(okrContentLeftData())

function renderContent(h: typeof H, node: TreeNode) {
  const cls = ['diy-wrapper3']
  if (node.isCurrent) cls.push('current-select')
  if (node.isLeftChild) cls.push('left-child')
  return h('div', { class: cls }, [
    h('div', { class: 'diy-con-name' }, node.data.label),
    h('div', { class: 'diy-con-content' }, node.data.content),
  ])
}

function renderBtnContent(h: typeof H, node: TreeNode) {
  return h('div', { class: 'org-chart-node-btn-text' }, String(node.childNodes.length || 0))
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
    label-class-name="no-padding"
    show-node-num
    :render-content="renderContent"
    :node-btn-content="renderBtnContent"
  />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'

const testData = ref([/* 右树 */])
const testLeftData = ref([/* 左树 */])

function renderContent(h, node) { /* 同上一例 */ }

function renderBtnContent(h, node) {
  return h('div', { class: 'org-chart-node-btn-text' }, String(node.childNodes.length || 0))
}
<\/script>
`
</script>

<style>
.diy-wrapper3 {
  padding: 10px;
}
.no-padding {
  padding: 0 !important;
}
.diy-wrapper3.left-child {
  border: 1px solid red;
}
</style>
