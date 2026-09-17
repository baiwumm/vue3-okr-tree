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
              align-root + OkrTreeGroup：{{ alignRoot ? '开启' : '关闭' }}
            </button>
            <span style="color: #909399; font-size: 12px">
              第二棵树的左侧层级更深；OkrTreeGroup
              测量组内最大左子树宽度并统一，两棵树的根节点严格对齐。关闭可对比原始行为
            </span>
          </div>
          <OkrTreeGroup :align="alignRoot">
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
          </OkrTreeGroup>
        </div>
      </template>
      <template #description>
        该模式必须设置 <code>onlyBothTree</code>，以及通过
        <code>leftData</code> 表示左子树的结构。Vue 3 版内建 <code>align-root</code>（默认开启，纯
        CSS）让每棵树的根节点在自身容器内居中，展开/收起不会位移。 多棵树并排且宽度不足时，用
        <code>&lt;OkrTreeGroup&gt;</code>
        包裹：它会测量组内所有左子树容器的最大自然宽度并统一设置，使各树根节点水平坐标完全一致——即原版
        README 里"结合业务层手动测量 DOM 实现对齐"的正规替代。组件自动响应成员的挂载 / 更新 /
        尺寸变化，也可通过 <code>ref.refresh()</code> 手动触发。
      </template>
      <CodeBlock :code="code" />
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VueOkrTree, OkrTreeGroup } from 'vue3-okr-tree'
import BaseCard from '../BaseCard.vue'
import CodeBlock from '../CodeBlock.vue'
import { keyedData, keyedDataSnippet, leftData, leftData2, leftDataSnippet } from '../../data'

const alignRoot = ref(true)
const testData = ref(keyedData())
const testLeftData = ref(leftData())
const testLeftData2 = ref(leftData2())

const code = `
<template>
  <!-- 多棵树并排对比时用 OkrTreeGroup 包裹，组内根节点严格对齐 -->
  <okr-tree-group>
    <vue-okr-tree :data="testData" :left-data="testLeftData" only-both-tree direction="horizontal" show-collapsable node-key="id" default-expand-all />
    <vue-okr-tree :data="testData" :left-data="testLeftData2" only-both-tree direction="horizontal" show-collapsable node-key="id" default-expand-all />
  </okr-tree-group>
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree, OkrTreeGroup } from 'vue3-okr-tree'

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
</style>
