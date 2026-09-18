<template>
  <div>
    <h3 id="demo-19" class="tree-demo-title-h3">画布组件 OkrTreeViewport（1.4.0 新增）</h3>
    <p>
      <code>&lt;okr-tree-viewport&gt;</code>
      包裹树即可获得缩放与平移能力（不侵入树本体）：滚轮缩放以指针为中心、按住拖拽平移、双击复位、触控双指捏合。
      默认 <code>wheel-behavior="ctrl-zoom"</code>——按住 <kbd>Ctrl</kbd> / <kbd>⌘</kbd> +
      滚轮缩放，避免劫持页面滚动；设为 <code>zoom</code> 始终缩放、<code>scroll</code> 从不缩放。
    </p>
    <BaseCard>
      <template #header>
        <div class="component-wrapper">
          <OkrTreeViewport
            ref="vp"
            style="--okr-viewport-height: 480px"
            toolbar
            :wheel-behavior="wheelMode"
          >
            <VueOkrTree :data="orgData" node-key="id" direction="horizontal" show-collapsable />
            <template #toolbar="{ zoom, zoomIn, zoomOut, reset, fit }">
              <button
                class="okr-viewport-toolbar-btn"
                :class="{ 'is-active': wheelMode === 'zoom' }"
                :title="wheelMode === 'zoom' ? '当前：滚轮直接缩放' : '切换为滚轮直接缩放'"
                @click="wheelMode = wheelMode === 'zoom' ? 'ctrl-zoom' : 'zoom'"
              >
                {{ wheelMode === 'zoom' ? '滚轮缩放' : 'Ctrl+滚轮' }}
              </button>
              <button class="okr-viewport-toolbar-btn" title="缩小" @click="zoomOut()">−</button>
              <span class="okr-viewport-toolbar-zoom">{{ Math.round(zoom * 100) }}%</span>
              <button class="okr-viewport-toolbar-btn" title="放大" @click="zoomIn()">＋</button>
              <button class="okr-viewport-toolbar-btn" @click="reset()">重置</button>
              <button class="okr-viewport-toolbar-btn" @click="fit()">适应窗口</button>
              <button class="okr-viewport-toolbar-btn" @click="exportPng()">导出 PNG</button>
            </template>
          </OkrTreeViewport>
        </div>
      </template>
      <template #description>
        工具栏通过 <code>#toolbar</code> 作用域插槽自定义（作用域含
        <code>zoom / zoomIn / zoomOut / reset / fit</code>）；导出基于 html-to-image（默认动态
        import，也可通过 <code>exportImage({ toPng })</code> 传入渲染函数，本用例即后者）。
        <code>centerNode(key)</code> 可先展开祖先再把视口中心对准指定节点。
      </template>
      <CodeBlock :code="code" />
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { toPng, toSvg } from 'html-to-image'
import { OkrTreeViewport, VueOkrTree, type OkrTreeViewportInstance } from 'vue3-okr-tree'
import BaseCard from '../BaseCard.vue'
import CodeBlock from '../CodeBlock.vue'

const vp = ref<OkrTreeViewportInstance | null>(null)
const wheelMode = ref<'ctrl-zoom' | 'zoom' | 'scroll'>('ctrl-zoom')

/** 组织架构大图（三份拼装出足够的宽度，便于体验缩放平移） */
const dept = (id: number, label: string, depth = 2): any => ({
  id,
  label,
  children:
    depth <= 0
      ? undefined
      : [dept(id * 10 + 1, `${label}-A`, depth - 1), dept(id * 10 + 2, `${label}-B`, depth - 1)],
})
const orgData = ref([dept(1, 'xxx科技有有限公司', 3)])

function exportPng() {
  vp.value
    ?.exportImage({ type: 'png', scale: 2, background: '#ffffff', toPng, toSvg })
    .then(() => {
      /* 下载已触发 */
    })
    .catch((err) => alert(err.message))
}

const code = `
<template>
  <okr-tree-viewport ref="vp" toolbar :wheel-behavior="wheelMode">
    <vue-okr-tree :data="orgData" node-key="id" direction="horizontal" show-collapsable />
    <template #toolbar="{ zoom, zoomIn, zoomOut, reset, fit }">
      <button @click="zoomOut()">−</button>
      <span>{{ Math.round(zoom * 100) }}%</span>
      <button @click="zoomIn()">＋</button>
      <button @click="reset()">重置</button>
      <button @click="fit()">适应窗口</button>
      <button @click="exportPng()">导出 PNG</button>
    </template>
  </okr-tree-viewport>
</template>

<script setup>
import { ref } from 'vue'
import { toPng } from 'html-to-image'
import { OkrTreeViewport, VueOkrTree } from 'vue3-okr-tree'

const vp = ref(null)
const wheelMode = ref('ctrl-zoom') // ctrl-zoom（默认）/ zoom / scroll
const orgData = ref([{ id: 1, label: 'xxx科技有有限公司', children: [/* ... */] }])

function exportPng() {
  // 传入 toPng 可免去动态 import 依赖；不传则按需 import('html-to-image')
  vp.value.exportImage({ type: 'png', scale: 2, background: '#fff', toPng })
}
<\/script>
`
</script>
