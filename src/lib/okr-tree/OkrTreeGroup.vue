<template>
  <div
    ref="groupEl"
    class="okr-tree-group"
    :class="{ 'is-measured': measured }"
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
 * 测量：临时让左容器按 max-content 排布（`.is-measuring` 那条规则），读取各成员左子树
 * 容器的自然宽度取最大值，再统一写回 --okr-group-left-width。
 *
 * 两个坑，都是实测踩出来的：
 * 1. `is-measuring` 必须**直接写 DOM**，不能走响应式状态。走状态要等一次异步 patch 才落到
 *    DOM 上，而读取就在同一个同步块里 —— 于是那个类从来没生效过（两次真实测量期间组元素
 *    class 变更为 0），读到的一直是当前分配宽度。补 `await nextTick()` 倒是能让它落地，
 *    但测量就此跨帧，`is-measuring` 真被渲染出来会触发一次组件更新 → 子树 `onUpdated`
 *    再请求测量，容易绕成自持环。
 * 2. 加 is-measuring 的同时必须把 is-measured 摘掉。style.css 里 `.is-measured` 的
 *    `width: var(--okr-group-left-width)` 排在 `.is-measuring` 的 `width: max-content` **之后**，
 *    两条特异度相同，两个类同时在场时是钉宽那条赢 —— 只加不摘等于没加，读到的还是上一轮
 *    被钉住的那个值，宽度永远涨不上去（后果：320px 容器里首量得 140px，放宽到 1280px 仍 140px）。
 *
 * 全程在同一个同步任务里 add → 读（读 rect 会强制布局）→ 复原，浏览器不会绘制中间态，不闪。
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
  const wasMeasured = el.classList.contains('is-measured')
  el.classList.remove('is-measured')
  el.classList.add('is-measuring')
  let max = 0
  try {
    for (const left of lefts) {
      const w = Math.ceil(left.getBoundingClientRect().width)
      if (w > max) max = w
    }
  } finally {
    el.classList.remove('is-measuring')
    if (wasMeasured) el.classList.add('is-measured')
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
