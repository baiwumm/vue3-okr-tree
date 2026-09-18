<template>
  <div>
    <h3 id="demo-18" class="tree-demo-title-h3">懒加载子节点</h3>
    <p>
      <code>lazy</code> + <code>load</code>（Vue 3 版 1.4.0 新增）：初始只给顶层节点，子级在首次展开时通过
      <code>load</code> 异步获取（本用例模拟 800ms 接口延迟）；resolve 后写入源数据并展开，加载过的节点不会重复请求。
      <code>reject</code> 或抛错时节点回到折叠态、可重试；加载中按钮带 <code>is-loading</code> 旋转指示，
      <code>#expand-btn</code> 作用域新增 <code>loading</code>。
    </p>
    <BaseCard>
      <template #header>
        <div class="component-wrapper">
          <VueOkrTree
            :data="lazyData"
            node-key="id"
            direction="horizontal"
            show-collapsable
            lazy
            :load="loadNode"
          />
        </div>
      </template>
      <template #description>
        已发起 <strong>{{ loadCount }}</strong> 次加载请求（每个节点至多一次）。
      </template>
      <CodeBlock :code="code" />
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VueOkrTree, type TreeLoadFunction } from 'vue3-okr-tree'
import BaseCard from '../BaseCard.vue'
import CodeBlock from '../CodeBlock.vue'

let uid = 100
const lazyData = ref([{ id: 1, label: 'xxx科技有有限公司' }])
const loadCount = ref(0)

/** 模拟 800ms 异步接口：按当前节点生成两个子节点 */
const loadNode: TreeLoadFunction = (node, resolve) => {
  loadCount.value++
  setTimeout(() => {
    resolve([
      { id: ++uid, label: `${node.data.label}-子 A` },
      { id: ++uid, label: `${node.data.label}-子 B` },
    ])
  }, 800)
}

const code = `
<template>
  <vue-okr-tree
    :data="lazyData"
    node-key="id"
    direction="horizontal"
    show-collapsable
    lazy
    :load="loadNode"
  />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree, TreeLoadFunction } from 'vue3-okr-tree'

const lazyData = ref([{ id: 1, label: 'xxx科技有有限公司' }])

// 模拟 800ms 异步接口；reject 或抛错时节点回到折叠态、可重试
const loadNode = (node, resolve, reject) => {
  fetchChildren(node.data.id)
    .then(resolve)
    .catch(() => reject())
}
<\/script>
`
</script>
