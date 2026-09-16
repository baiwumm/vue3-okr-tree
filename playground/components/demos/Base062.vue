<template>
  <div>
    <h3 id="demo-8" class="tree-demo-title-h3">节点展开按钮自定义内容</h3>
    <p>可自行设置节点展开按钮内容。</p>
    <BaseCard>
      <template #header>
        <div class="component-wrapper">
          <VueOkrTree
            :data="testData"
            direction="horizontal"
            show-collapsable
            default-expand-all
            :node-btn-content="renderBtnContent"
          />
        </div>
      </template>
      <template #description>
        通过 <code>node-btn-content</code> 渲染展开按钮内容，签名同样为
        <code>(h, node)</code>。本例把按钮内容替换为文字「智」。
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

function renderBtnContent(h: typeof H, _node: TreeNode) {
  return h('div', { class: 'org-chart-node-btn-text' }, '智')
}

const code = `
<template>
  <vue-okr-tree
    :data="testData"
    direction="horizontal"
    show-collapsable
    default-expand-all
    :node-btn-content="renderBtnContent"
  />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'

const testData = ref([/* ...同上 */])

function renderBtnContent(h, node) {
  // 组件自带 .org-chart-node-btn-text 样式：铺满圆形按钮并居中显示
  return h('div', { class: 'org-chart-node-btn-text' }, '智')
}
<\/script>
`
</script>
