<template>
  <div>
    <h3 id="demo-9" class="tree-demo-title-h3">节点动画</h3>
    <p>
      该组件内置多种过渡动画，可以直接使用。默认过渡动画是
      <code>okr-zoom-in-center</code>，更多动画详见最底部的 API 文档。
    </p>
    <BaseCard>
      <template #header>
        <div class="component-wrapper">
          <div class="demo-controls">
            <span>animate-name：</span>
            <button
              v-for="name in animateNames"
              :key="name"
              class="demo-btn"
              :class="{ 'is-active': animateName === name }"
              @click="animateName = name"
            >
              {{ name }}
            </button>
            <label>
              animate-duration
              <input v-model.number="animateDuration" type="number" min="0" step="100" />
            </label>
          </div>
          <VueOkrTree
            :data="testData"
            direction="horizontal"
            show-collapsable
            default-expand-all
            animate
            :animate-name="animateName"
            :animate-duration="animateDuration"
          />
        </div>
      </template>
      <template #description>
        使用动画需要传入 <code>animate</code> 属性，通过
        <code>animate-name</code> 指定动画的类型，默认动画是 <code>okr-zoom-in-center</code>；
        <code>animate-duration</code> 控制时长（ms）。切换上方按钮后点击节点的 +/-
        按钮观察展开/收起过渡效果。
      </template>
      <CodeBlock :code="code" />
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VueOkrTree, type AnimateName } from 'vue3-okr-tree'
import BaseCard from '../BaseCard.vue'
import CodeBlock from '../CodeBlock.vue'
import { baseData, baseDataSnippet } from '../../data'

const testData = ref(baseData())
const animateNames: AnimateName[] = [
  'okr-zoom-in-center',
  'okr-zoom-in-top',
  'okr-zoom-in-bottom',
  'okr-zoom-in-left',
  'okr-fade-in',
  'okr-fade-in-linear',
]
const animateName = ref<AnimateName>('okr-zoom-in-center')
const animateDuration = ref(200)

const code = `
<template>
  <vue-okr-tree
    :data="testData"
    direction="horizontal"
    show-collapsable
    default-expand-all
    animate
    animate-name="okr-zoom-in-top"
    :animate-duration="200"
  />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'

const testData = ref(${baseDataSnippet.replace('testData: ', '')})
<\/script>
`
</script>
