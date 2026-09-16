<template>
  <div>
    <h3 id="demo-4" class="tree-demo-title-h3">节点默认全部展开</h3>
    <BaseCard>
      <template #header>
        <div class="component-wrapper">
          <VueOkrTree :data="testData" direction="horizontal" show-collapsable default-expand-all />
        </div>
      </template>
      <template #description>
        通过设置 <code>default-expand-all</code> 默认展开所有节点，该参数只有在
        <code>show-collapsable</code> 为 <code>true</code> 时有效（未开启 show-collapsable
        时组件本身就是全部展开的）。
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
  <vue-okr-tree
    :data="testData"
    direction="horizontal"
    show-collapsable
    default-expand-all
  />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'

const testData = ref(${baseDataSnippet.replace('testData: ', '')})
<\/script>
`
</script>
