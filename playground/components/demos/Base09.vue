<template>
  <div>
    <h3 id="demo-17" class="tree-demo-title-h3">受控状态与方法（1.2.0 新增）</h3>
    <p>
      用 <code>v-model:expanded-keys</code> /
      <code>v-model:current-key</code> 双向绑定展开态与选中态； 配合 <code>expandAll</code> /
      <code>collapseAll</code> / <code>expandNode</code> / <code>collapseNode</code> /
      <code>scrollToNode</code> 方法，以及 <code>#expand-btn</code> 插槽。
    </p>
    <BaseCard>
      <template #header>
        <div class="component-wrapper">
          <div class="demo-controls">
            <span
              >expandedKeys：<code>{{ JSON.stringify(expandedKeys) }}</code></span
            >
            <span
              >currentKey：<code>{{ JSON.stringify(currentKey) }}</code></span
            >
          </div>
          <div class="btns-wrap">
            <button @click="tree?.expandAll()">expandAll()</button>
            <button @click="tree?.collapseAll()">collapseAll()</button>
            <button @click="tree?.expandNode(5)">expandNode(5) 展开到「UI 设计」</button>
            <button @click="tree?.collapseNode(2)">collapseNode(2) 收起「产品研发部」</button>
            <button @click="expandedKeys = [1, 6]">expandedKeys = [1, 6]（父 → 子）</button>
            <button @click="currentKey = 8">currentKey = 8（父 → 子）</button>
            <button @click="currentKey = null">currentKey = null</button>
            <button @click="tree?.scrollToNode(8)">scrollToNode(8) 滚到「销售二部」</button>
            <button @click="useSlot = !useSlot">
              {{ useSlot ? '关闭' : '开启' }} #expand-btn 插槽
            </button>
          </div>
          <VueOkrTree
            ref="tree"
            v-model:expanded-keys="expandedKeys"
            v-model:current-key="currentKey"
            :data="testData"
            direction="horizontal"
            show-collapsable
            node-key="id"
          >
            <template v-if="useSlot" #expand-btn="{ expanded, side }">
              <span class="org-chart-node-btn-text" :title="side">{{ expanded ? '−' : '＋' }}</span>
            </template>
          </VueOkrTree>
        </div>
      </template>
      <template #description>
        <code>expanded-keys</code> 传入后为受控模式：列表内节点展开、其余收起，点击 +/-
        或调用展开/收起方法都会触发
        <code>update:expandedKeys</code> 回写；未传时保持原版非受控行为。
        <code>current-key</code> 同理，<code>null</code> 表示无选中。两者都需要
        <code>node-key</code>。<code>#expand-btn</code> 插槽参数为
        <code>{ node, data, expanded, side }</code>，<code>show-node-num</code> 开启时数字优先。
      </template>
      <CodeBlock :code="code" />
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VueOkrTree, type TreeKey, type VueOkrTreeInstance } from 'vue3-okr-tree'
import BaseCard from '../BaseCard.vue'
import CodeBlock from '../CodeBlock.vue'
import { keyedData, keyedDataSnippet } from '../../data'

const tree = ref<VueOkrTreeInstance | null>(null)
const testData = ref(keyedData())
const expandedKeys = ref<TreeKey[]>([1])
const currentKey = ref<TreeKey | null>(null)
const useSlot = ref(true)

const code = `
<template>
  <button @click="tree.expandAll()">expandAll()</button>
  <button @click="tree.collapseAll()">collapseAll()</button>
  <button @click="tree.expandNode(5)">expandNode(5)</button>
  <button @click="tree.scrollToNode(8)">scrollToNode(8)</button>

  <vue-okr-tree
    ref="tree"
    v-model:expanded-keys="expandedKeys"
    v-model:current-key="currentKey"
    :data="testData"
    direction="horizontal"
    show-collapsable
    node-key="id"
  >
    <!-- 自定义展开按钮：side 为 'left' | 'right'，expanded 为该侧当前是否展开 -->
    <template #expand-btn="{ expanded, side }">
      <span class="org-chart-node-btn-text">{{ expanded ? '−' : '＋' }}</span>
    </template>
  </vue-okr-tree>
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'

const tree = ref(null)
const expandedKeys = ref([1])   // 受控：只展开 id 为 1 的根节点
const currentKey = ref(null)    // 受控：无选中
const testData = ref(${keyedDataSnippet.replace('testData: ', '')})
<\/script>
`
</script>
