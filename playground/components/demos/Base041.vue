<template>
  <div>
    <h3 id="demo-5" class="tree-demo-title-h3">可将 Tree 的某些节点设置为默认展开</h3>
    <BaseCard>
      <template #header>
        <div class="component-wrapper">
          <VueOkrTree
            :data="testData"
            direction="horizontal"
            show-collapsable
            node-key="id"
            :default-expanded-keys="[5]"
          />
        </div>
      </template>
      <template #description>
        通过 <code>default-expanded-keys</code> 设置默认展开的节点（本例展开 id 为 5 的「UI
        设计」，其祖先节点会一并展开）。需要注意的是，此时必须设置
        <code>node-key</code>，其值为节点数据中的一个字段名，该字段在整棵树中是唯一的。
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
import { keyedData, keyedDataSnippet } from '../../data'

const testData = ref(keyedData())

const code = `
<template>
  <vue-okr-tree
    :data="testData"
    direction="horizontal"
    show-collapsable
    node-key="id"
    :default-expanded-keys="[5]"
  />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'

const testData = ref(${keyedDataSnippet.replace('testData: ', '')})
<\/script>
`
</script>
