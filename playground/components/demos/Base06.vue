<template>
  <div>
    <h3 id="demo-7" class="tree-demo-title-h3">节点自定义内容</h3>
    <p>可自行设置节点内容。</p>
    <BaseCard>
      <template #header>
        <div class="component-wrapper">
          <VueOkrTree
            :data="testData"
            direction="horizontal"
            show-collapsable
            default-expand-all
            :render-content="renderContent"
          />
        </div>
      </template>
      <template #description>
        通过 <code>render-content</code> 渲染节点内容，签名为 <code>(h, node)</code>：
        <code>h</code> 是 Vue 的渲染函数，<code>node</code> 是内部 Node 实例（源数据在
        <code>node.data</code>，还可读取 <code>node.isCurrent</code>、
        <code>node.expanded</code> 等状态）。也可以改用作用域插槽
        <code>#default="{ node, data }"</code>。
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
import { contentData } from '../../data'

const testData = ref(contentData())

function renderContent(h: typeof H, node: TreeNode) {
  return h('div', { class: ['diy-wrapper', node.isCurrent ? 'current-select' : ''] }, [
    h('div', { class: 'diy-con-name' }, node.data.label),
    h('div', { class: 'diy-con-content' }, node.data.content),
  ])
}

const code = `
<template>
  <vue-okr-tree
    :data="testData"
    direction="horizontal"
    show-collapsable
    default-expand-all
    :render-content="renderContent"
  />

  <!-- 等价的插槽写法 -->
  <vue-okr-tree :data="testData" direction="horizontal">
    <template #default="{ node, data }">
      <div class="diy-wrapper">
        <div class="diy-con-name">{{ data.label }}</div>
        <div class="diy-con-content">{{ data.content }}</div>
      </div>
    </template>
  </vue-okr-tree>
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'

const testData = ref([{
  label: 'xxx科技有有限公司', content: '这是一个有活力的公司',
  children: [{
    label: '产品研发部', content: '这是一个有活力的产品研发部',
    children: [
      { label: '研发-前端', content: '这是一个有活力的研发-前端' },
      { label: '研发-后端', content: '这是一个有活力的研发-后端' },
      { label: 'UI 设计', content: '这是一个有活力的UI 设计' }
    ]
  }, {
    label: '销售部', content: '这是一个有活力的销售部',
    children: [
      { label: '销售一部', content: '这是一个有活力的销售一部' },
      { label: '销售二部', content: '这是一个有活力的销售二部' }
    ]
  }, {
    label: '财务部', content: '这是一个有活力的财务部'
  }]
}])

// h 由组件传入；node 为内部 Node 实例
function renderContent(h, node) {
  return h('div', { class: ['diy-wrapper', node.isCurrent ? 'current-select' : ''] }, [
    h('div', { class: 'diy-con-name' }, node.data.label),
    h('div', { class: 'diy-con-content' }, node.data.content),
  ])
}
<\/script>

<style>
.diy-wrapper { display: flex; flex-direction: column; align-items: flex-start; }
.diy-wrapper .diy-con-name { font-size: 12px; line-height: 18px; color: #646a73; }
.diy-wrapper .diy-con-content { color: #1f2329; line-height: 22px; font-size: 14px; }
.diy-wrapper.current-select .diy-con-name { color: red; }
.diy-wrapper.current-select .diy-con-content { color: #1989fa; }
</style>
`
</script>

<style>
.diy-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.diy-wrapper .diy-con-name {
  font-size: 12px;
  line-height: 18px;
  color: #646a73;
}
.diy-wrapper .diy-con-content {
  color: #1f2329;
  line-height: 22px;
  word-break: break-word;
  font-size: 14px;
}
.diy-wrapper.current-select .diy-con-name {
  color: red;
}
.diy-wrapper.current-select .diy-con-content {
  color: #1989fa;
}
</style>
