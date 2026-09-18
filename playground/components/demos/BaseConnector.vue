<template>
  <div>
    <h3 id="demo-connector" class="tree-demo-title-h3">SVG 连接线模式（connector）</h3>
    <p>
      连接线渲染模式可切换：css（默认，伪元素像素几何）/ svg（覆盖层路径，支持曲线 / 直角 /
      直线三种形状）。
    </p>
    <BaseCard>
      <template #header>
        <div class="component-wrapper">
          <div class="demo-connector-toolbar">
            <button
              v-for="mode in ['css', 'svg']"
              :key="mode"
              class="demo-btn"
              :class="{ 'is-active': connector === mode }"
              @click="connector = mode"
            >
              connector: {{ mode }}
            </button>
            <button
              v-for="shape in ['curve', 'orthogonal', 'straight']"
              :key="shape"
              class="demo-btn"
              :class="{ 'is-active': shape_ === shape }"
              :disabled="connector !== 'svg'"
              @click="shape_ = shape"
            >
              {{ shape }}
            </button>
          </div>
          <VueOkrTree
            :data="testData"
            :connector="connector"
            :connector-shape="shape_"
            direction="horizontal"
            show-collapsable
            node-key="id"
            :default-expanded-keys="[1]"
            animate
          />
        </div>
      </template>
      <template #description>
        <code>connector="svg"</code> 时布局与 css 模式完全一致（只替换线条渲染），随展开/收起、
        <code>animate</code> 过渡、尺寸变化自动重绘，无残影；<code>connector-shape</code>
        支持曲线（默认）/ 直角 / 直线，仅在 svg 模式生效。线色 / 线宽继续走
        <code>--okr-line-color</code> / <code>--okr-line-width</code>，主题与
        <code>--okr-drop-color</code> 等变量通用；可与画布缩放、OKR 模式组合。
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
import { keyedData } from '../../data'

const connector = ref<'css' | 'svg'>('svg')
const shape_ = ref<'curve' | 'orthogonal' | 'straight'>('curve')
const testData = ref(keyedData())

const code = `
<template>
  <vue-okr-tree
    :data="testData"
    connector="svg"
    connector-shape="curve"
    direction="horizontal"
    show-collapsable
    animate
  />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'

const testData = ref([{ id: 1, label: 'xxx科技有有限公司', children: [/* … */] }])
// 运行时切换 connector / connector-shape 均即时生效
<\/script>
`
</script>

<style scoped>
.demo-connector-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.demo-connector-toolbar .demo-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
