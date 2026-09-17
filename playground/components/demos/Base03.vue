<template>
  <div>
    <h3 id="demo-3" class="tree-demo-title-h3">节点是否可被展开</h3>
    <p>节点可被展开，默认是不展开。</p>
    <BaseCard>
      <template #header>
        <div class="component-wrapper">
          <VueOkrTree :data="testData" direction="horizontal" show-collapsable />
        </div>
      </template>
      <template #description>
        通过 <code>show-collapsable</code> 设置节点可被展开；此时节点默认折叠，点击圆形 +/-
        按钮展开或收起。<strong>键盘操作</strong>（Vue 3 版新增，符合 WAI-ARIA tree 模式）：Tab
        进入树后，↑/↓ 在可见节点间移动，→ 展开或进入子节点，← 收起或回到父节点，Enter/Space
        选中，Home/End 到首尾；OKR 模式下根节点 ← 进入左子树，左树节点方向键镜像。
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
  <vue-okr-tree :data="testData" direction="horizontal" show-collapsable />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'

const testData = ref(${baseDataSnippet.replace('testData: ', '')})
<\/script>
`
</script>
