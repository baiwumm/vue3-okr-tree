<template>
  <div>
    <h3 id="demo-10" class="tree-demo-title-h3">OKR 展示模式</h3>
    <p>
      该模式的出现，是为了实现跟飞书 OKR 展示的视图一样效果，所以在 Tree
      的模式下，扩展成左右两棵子树并根据最长的一个根进行根对齐。
    </p>
    <BaseCard>
      <template #header>
        <div class="component-wrapper okr-align-demo">
          <div class="demo-controls">
            <button
              class="demo-btn"
              :class="{ 'is-active': alignRoot }"
              @click="alignRoot = !alignRoot"
            >
              align-root（内建根对齐）：{{ alignRoot ? '开启' : '关闭' }}
            </button>
            <span style="color: #909399; font-size: 12px">
              第二棵树的左侧层级更深，开启后两棵树的根节点自动对齐；关闭可对比原始行为
            </span>
          </div>
          <VueOkrTree
            :data="testData"
            :left-data="testLeftData"
            only-both-tree
            direction="horizontal"
            show-collapsable
            node-key="id"
            :align-root="alignRoot"
            default-expand-all
          />
          <VueOkrTree
            :data="testData"
            :left-data="testLeftData2"
            only-both-tree
            direction="horizontal"
            show-collapsable
            node-key="id"
            :align-root="alignRoot"
            default-expand-all
          />
        </div>
      </template>
      <template #description>
        该模式必须设置 <code>onlyBothTree</code>，以及通过
        <code>leftData</code> 表示左子树的结构。Vue 3 版内建
        <code>align-root</code> 根对齐（默认开启，纯 CSS
        实现），展开/收起不会改变根节点位置，不再需要原版 Demo 中手动测量 DOM 宽度的代码；设为
        <code>false</code> 可回到手动控制。
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
import { keyedData, keyedDataSnippet, leftData, leftData2, leftDataSnippet } from '../../data'

const alignRoot = ref(true)
const testData = ref(keyedData())
const testLeftData = ref(leftData())
const testLeftData2 = ref(leftData2())

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
  />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'

const testData = ref(${keyedDataSnippet.replace('testData: ', '')})

const testLeftData = ref(${leftDataSnippet.replace('testLeftData: ', '')})

// 左侧层级更深的第二棵树（根对齐对比）
const testLeftData2 = ref([
  { id: 1, label: 'xxx科技有有限公司', children: [
    { id: 12, label: '(左)产品研发部', children: [
      { id: 13, label: '(左)研发-前端', children: [
        { id: 131, label: '(左)前端一部' },
        { id: 132, label: '(左)前端二部' }
      ] },
      { id: 14, label: '(左)研发-后端' },
      { id: 15, label: '(左)UI 设计' }
    ] },
    { id: 16, label: '(左)销售部', children: [
      { id: 17, label: '(左)销售一部' },
      { id: 18, label: '(左)销售二部' }
    ] },
    { id: 19, label: '(左)财务部' }
  ] }
])
<\/script>
`
</script>

<style>
.okr-align-demo {
  padding-left: 0;
}
/*
 * 演示：两棵树并排对比根对齐。align-root 让每棵树的根节点在容器内居中，
 * 因此两棵树的根节点天然对齐（即原 Demo 手动测量想要达到的效果）。
 * 本例内容总宽超出卡片宽度，与原 Demo 一样会出现横向滚动；这里仿照原 Demo
 * 手动测量的语义，给两棵树的左子树容器统一 min-width，保证两侧根节点坐标一致
 * （!important 仅用于覆盖组件内 align-root 的 min-width: max-content）。
 */
.okr-align-demo
  .org-chart-container
  .org-chart-node.only-both-tree-node.align-root
  > .org-chart-node-left-children {
  min-width: 562px !important;
}
</style>
