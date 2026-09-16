<template>
  <div>
    <h3 id="demo-1" class="tree-demo-title-h3">基础用法</h3>
    <p>基础的树形结构展示，默认方式垂直方向。</p>
    <BaseCard>
      <template #header>
        <div class="component-wrapper">
          <VueOkrTree :data="testData" />
        </div>
      </template>
      <template #description>
        只需传入 <code>data</code>，默认自上而下（<code>direction="vertical"</code>）渲染。
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
  <vue-okr-tree :data="testData" />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'
import 'vue3-okr-tree/dist/style.css'

const testData = ref(${baseDataSnippet.replace('testData: ', '')})
<\/script>
`
</script>
