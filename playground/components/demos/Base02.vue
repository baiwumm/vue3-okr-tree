<template>
  <div>
    <h3 id="demo-2" class="tree-demo-title-h3">水平方向</h3>
    <p>基础的树形结构展示，自左向右水平方向。</p>
    <BaseCard>
      <template #header>
        <div class="component-wrapper">
          <VueOkrTree :data="testData" direction="horizontal" />
        </div>
      </template>
      <template #description>
        将 <code>direction</code> 设置为 <code>horizontal</code> 来展示水平方向。
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
  <vue-okr-tree :data="testData" direction="horizontal" />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'

const testData = ref(${baseDataSnippet.replace('testData: ', '')})
<\/script>
`
</script>
