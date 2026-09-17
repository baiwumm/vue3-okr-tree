<template>
  <div
    ref="groupEl"
    class="okr-tree-group"
    :class="{ 'is-measured': measured, 'is-measuring': measuring }"
    :style="measured ? { '--okr-group-left-width': `${groupLeftWidth}px` } : undefined"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { OKR_TREE_GROUP_INJECTION_KEY } from './context'

defineOptions({ name: 'OkrTreeGroup' })

const props = defineProps({
  /**
   * 是否对组内的 OKR 树做跨实例根对齐（测量所有成员左子树容器的最大自然宽度，
   * 统一设为该宽度，使各组根节点水平坐标一致）。默认开启；关闭后各树独立排布。
   */
  align: { type: Boolean, default: true },
})

defineSlots<{ default?: () => any }>()

const groupEl = ref<HTMLElement | null>(null)
const measured = ref(false)
const measuring = ref(false)
const groupLeftWidth = ref(0)

let pending = false
/** 去重的测量请求：成员挂载/更新/卸载时高频调用 */
function requestMeasure() {
  if (!props.align) return
  if (pending) return
  pending = true
  nextTick(() => {
    pending = false
    measure()
  })
}

/**
 * 测量：给组加 is-measuring 类（左容器临时按 max-content 排布），
 * 读取各成员左子树容器的自然宽度取最大值，再统一写回 --okr-group-left-width。
 */
function measure() {
  const el = groupEl.value
  if (!el || !props.align) return
  const lefts = Array.from(
    el.querySelectorAll<HTMLElement>(
      '.org-chart-container .horizontal .org-chart-node.only-both-tree-node.align-root > .org-chart-node-left-children'
    )
  )
  if (!lefts.length) {
    measured.value = false
    return
  }
  measuring.value = true
  let max = 0
  try {
    for (const left of lefts) {
      const w = Math.ceil(left.getBoundingClientRect().width)
      if (w > max) max = w
    }
  } finally {
    measuring.value = false
  }
  if (max > 0) {
    if (groupLeftWidth.value !== max) groupLeftWidth.value = max
    measured.value = true
  }
}

// 成员树展开/收起会改变内容尺寸，用 ResizeObserver 观察组内变化
let observer: ResizeObserver | null = null
onMounted(() => {
  if (typeof ResizeObserver !== 'undefined' && groupEl.value) {
    observer = new ResizeObserver(() => requestMeasure())
    observer.observe(groupEl.value)
  }
  // 字体加载完成会改变文本宽度
  if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
    ;(document as any).fonts.ready.then(() => requestMeasure()).catch(() => {})
  }
})
onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

watch(
  () => props.align,
  (on) => {
    if (!on) {
      measured.value = false
      groupLeftWidth.value = 0
    } else {
      requestMeasure()
    }
  }
)

provide(OKR_TREE_GROUP_INJECTION_KEY, { requestMeasure })

defineExpose({
  /** 手动触发一次重新测量（字体加载、外部样式变化等场景） */
  refresh: requestMeasure,
})
</script>
