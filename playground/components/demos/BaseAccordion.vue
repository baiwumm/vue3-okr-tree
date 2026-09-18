<template>
  <div>
    <h3 id="demo-accordion" class="tree-demo-title-h3">手风琴模式（accordion）</h3>
    <p>同级节点互斥展开：展开某一节点时，自动收起同级已展开的兄弟节点。</p>
    <BaseCard>
      <template #header>
        <div class="component-wrapper">
          <VueOkrTree :data="testData" direction="horizontal" show-collapsable accordion />
        </div>
      </template>
      <template #description>
        设置 <code>accordion</code> 开启手风琴模式。与 el-tree
        语义一致：只作用于<strong>交互展开</strong>（点击 +/− 按钮、点击节点内容、键盘操作）；<code
          >expandNode</code
        >
        等程序化方法与受控 <code>expanded-keys</code> 不受互斥限制。
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
  <vue-okr-tree :data="testData" direction="horizontal" show-collapsable accordion />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'

const testData = ref(${baseDataSnippet.replace('testData: ', '')})
<\/script>
`
</script>
