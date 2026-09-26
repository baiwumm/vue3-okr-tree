<template>
  <div>
    <h3 id="demo-virtual" class="tree-demo-title-h3">虚拟滚动</h3>
    <p>
      <code>virtual</code>（Vue 3 版 1.16.0
      新增）：同层可见兄弟数达阈值（50）的行只渲染视口内窗口，用等尺寸占位块保持布局与连接线
      逐像素等价。要求数字型 <code>label-width</code>（本用例 120）；关闭开关可对比全量渲染 3000
      个节点的卡顿。
    </p>
    <BaseCard>
      <template #header>
        <div class="component-wrapper">
          <div class="virtual-toolbar">
            <label>
              <input v-model="virtualOn" type="checkbox" data-test="virtual-toggle" />
              virtual（{{ virtualOn ? '开' : '关' }}）
            </label>
            <button data-test="scroll-btn" @click="scrollRandom">滚动到随机节点</button>
            <span data-test="stat" class="virtual-stat">
              可见节点 {{ visibleCount }} / DOM 节点 {{ domCount }} / 总数 {{ total }}
            </span>
          </div>
          <div class="virtual-stage">
            <VueOkrTree
              ref="treeRef"
              :key="virtualOn ? 'virtual' : 'plain'"
              :data="data"
              node-key="id"
              :label-width="120"
              :default-expand-all="true"
              :virtual="virtualOn"
            />
          </div>
        </div>
      </template>
      <template #description>
        滚动横向滚动条：窗口随滚动移动；「滚动到随机节点」走 <code>scrollToNode</code>
        （窗口外目标先揭示再滚动）。DOM 节点数始终有界，与总数 3000 无关。
      </template>
      <CodeBlock :code="code" />
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'
import BaseCard from '../BaseCard.vue'
import CodeBlock from '../CodeBlock.vue'

const total = 3000
const data = [
  {
    id: 0,
    label: 'Root',
    children: Array.from({ length: total }, (_, i) => ({ id: i + 1, label: `N${i + 1}` })),
  },
]

const virtualOn = ref(true)
const treeRef = ref<InstanceType<typeof VueOkrTree> | null>(null)

const visibleCount = computed(() =>
  virtualOn.value ? (treeRef.value?.getVisibleNodes().length ?? 0) : total + 1
)
const domCount = ref(0)
let observer: MutationObserver | null = null
const countDom = () => {
  domCount.value = document.querySelectorAll('.virtual-stage .org-chart-node').length
}
onMounted(() => {
  countDom()
  observer = new MutationObserver(countDom)
  const stage = document.querySelector('.virtual-stage')
  if (stage) observer.observe(stage, { childList: true, subtree: true })
})
onBeforeUnmount(() => observer?.disconnect())

const scrollRandom = () => {
  const key = 1 + Math.floor(Math.random() * total)
  treeRef.value?.scrollToNode(key)
}

const code = `<script setup lang="ts">
import { VueOkrTree } from 'vue3-okr-tree'

const data = [
  {
    id: 0,
    label: 'Root',
    children: Array.from({ length: 3000 }, (_, i) => ({ id: i + 1, label: \`N\${i + 1}\` })),
  },
]
<\/script>

<template>
  <div style="width: 800px; overflow: auto">
    <VueOkrTree :data="data" node-key="id" :label-width="120" default-expand-all virtual />
  </div>
</template>`
</script>

<style scoped>
.virtual-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}
.virtual-stat {
  color: #909090;
  font-size: 13px;
}
.virtual-stage {
  width: 800px;
  height: 220px;
  overflow: auto;
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 8px;
}
</style>
