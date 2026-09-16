<template>
  <div>
    <h3 id="demo-11" class="tree-demo-title-h3">OKR 展示模式之自定义节点内容</h3>
    <p>与上常规 Tree 一样，我们也可以通过自定义渲染函数来制定节点的内容。</p>
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
            default-expand-all
            :render-content="renderContent"
          />
        </div>
      </template>
      <template #description>
        通过 <code>render-content</code> 渲染节点内容，通过返回 node 中的
        <code>isLeftChild</code> 判断是否是左边的树（本例左树节点加了红色描边）。
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
  const cls = ['diy-wrapper2']
  if (node.isCurrent) cls.push('current-select')
  if (node.isLeftChild) cls.push('left-child')
  return h('div', { class: cls }, [
    h('div', { class: 'diy-con-name' }, node.data.label),
    h('div', { class: 'diy-con-content' }, node.data.content),
  ])
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
    default-expand-all
    :render-content="renderContent"
  />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'

const testData = ref([/* 右树：id + label + content */])
const testLeftData = ref([/* 左树：id + label + content */])

function renderContent(h, node) {
  const cls = ['diy-wrapper2']
  if (node.isCurrent) cls.push('current-select')
  if (node.isLeftChild) cls.push('left-child')
  return h('div', { class: cls }, [
    h('div', { class: 'diy-con-name' }, node.data.label),
    h('div', { class: 'diy-con-content' }, node.data.content),
  ])
}
<\/script>

<style>
.diy-wrapper2 { padding: 10px; }
.no-padding { padding: 0 !important; }
.diy-wrapper2.left-child { border: 1px solid red; }
</style>
`
</script>

<style>
.diy-wrapper2 {
  padding: 10px;
}
.no-padding {
  padding: 0 !important;
}
.diy-wrapper2.left-child {
  border: 1px solid red;
}
</style>
