<template>
  <div
    ref="viewportEl"
    class="okr-viewport"
    :class="{ 'is-panning': panning }"
    @wheel="handleWheel"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerUp"
    @dblclick="handleDblClick"
  >
    <div class="okr-viewport-canvas" :style="canvasStyle">
      <div ref="contentEl" class="okr-viewport-content">
        <slot />
      </div>
    </div>
    <div v-if="toolbarVisible" class="okr-viewport-toolbar" @dblclick.stop>
      <slot name="toolbar" v-bind="toolbarScope">
        <button type="button" class="okr-viewport-toolbar-btn" aria-label="缩小" @click="zoomOut()">
          −
        </button>
        <span class="okr-viewport-toolbar-zoom">{{ Math.round(currentZoom * 100) }}%</span>
        <button type="button" class="okr-viewport-toolbar-btn" aria-label="放大" @click="zoomIn()">
          ＋
        </button>
        <button type="button" class="okr-viewport-toolbar-btn" @click="reset()">重置</button>
        <button type="button" class="okr-viewport-toolbar-btn" @click="fitToScreen()">
          适应窗口
        </button>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  shallowReactive,
  useSlots,
  watch,
  type CSSProperties,
  type PropType,
} from 'vue'
import {
  clampZoom,
  computeFit,
  renderToDataUrl,
  type ExportImageOptions,
  type ViewportOffset,
  type ViewportTreeApi,
  type ViewportWheelBehavior,
} from './viewport'
import { OKR_TREE_VIEWPORT_INJECTION_KEY } from './context'

defineOptions({ name: 'OkrTreeViewport' })

const props = defineProps({
  /** 最小缩放 */
  minZoom: { type: Number, default: 0.2 },
  /** 最大缩放 */
  maxZoom: { type: Number, default: 4 },
  /** 每次 zoomIn / zoomOut / 滚轮一格的缩放系数（乘除） */
  zoomStep: { type: Number, default: 1.2 },
  /** 受控缩放（v-model:zoom）；未传时内部维护 */
  zoom: { type: Number, default: undefined },
  /** 受控平移偏移（v-model:offset）；未传时内部维护 */
  offset: {
    type: Object as PropType<ViewportOffset>,
    default: undefined,
  },
  /**
   * 滚轮行为：ctrl-zoom（默认，按住 Ctrl/⌘ 才缩放，避免劫持页面滚动）/ zoom（始终缩放）/
   * scroll（从不缩放，滚轮交给页面）。
   */
  wheelBehavior: {
    type: String as PropType<ViewportWheelBehavior>,
    default: 'ctrl-zoom',
  },
  /** 显示默认工具栏（传入 #toolbar 插槽时无需开启） */
  toolbar: { type: Boolean, default: false },
})

const emit = defineEmits<{
  (e: 'update:zoom', zoom: number): void
  (e: 'update:offset', offset: ViewportOffset): void
}>()

defineSlots<{
  default?: () => any
  toolbar?: (scope: {
    zoom: number
    zoomIn: () => void
    zoomOut: () => void
    reset: () => void
    fit: () => void
  }) => any
}>()

// ---- 缩放 / 偏移状态：内部值始终为当前事实，受控时额外 emit（与树组件的受控策略一致） ----
const innerZoom = ref(props.zoom ?? 1)
const innerOffset = shallowReactive<ViewportOffset>({ x: 0, y: 0 })
const isZoomControlled = () => props.zoom !== undefined
const isOffsetControlled = () => props.offset !== undefined
const currentZoom = computed(() => innerZoom.value)
const currentOffset = computed(() => innerOffset)

watch(
  () => props.zoom,
  (v) => {
    if (v !== undefined) innerZoom.value = v
  }
)
watch(
  () => props.offset,
  (v) => {
    if (v) Object.assign(innerOffset, v)
  },
  { deep: true }
)

function applyZoom(next: number) {
  const clamped = clampZoom(next, props.minZoom, props.maxZoom)
  innerZoom.value = clamped
  if (isZoomControlled()) emit('update:zoom', clamped)
}

function applyOffset(next: ViewportOffset) {
  Object.assign(innerOffset, next)
  if (isOffsetControlled()) emit('update:offset', { ...next })
}

const canvasStyle = computed<CSSProperties>(() => ({
  transform: `translate(${currentOffset.value.x}px, ${currentOffset.value.y}px) scale(${currentZoom.value})`,
}))

const viewportEl = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)

// ---- 滚轮缩放（以指针为中心） ----
function handleWheel(event: WheelEvent) {
  const behavior = props.wheelBehavior
  if (behavior === 'scroll') return // 不劫持页面滚动
  if (behavior === 'ctrl-zoom' && !(event.ctrlKey || event.metaKey)) return
  event.preventDefault()
  const vp = viewportEl.value
  if (!vp) return
  const rect = vp.getBoundingClientRect()
  zoomAt(
    currentZoom.value * (event.deltaY < 0 ? props.zoomStep : 1 / props.zoomStep),
    event.clientX - rect.left,
    event.clientY - rect.top
  )
}

/** 以视口内某点为锚缩放：锚点下的内容点保持不动 */
function zoomAt(nextZoom: number, anchorX: number, anchorY: number) {
  const prevZoom = currentZoom.value
  const clamped = clampZoom(nextZoom, props.minZoom, props.maxZoom)
  const contentX = (anchorX - currentOffset.value.x) / prevZoom
  const contentY = (anchorY - currentOffset.value.y) / prevZoom
  applyZoom(clamped)
  applyOffset({ x: anchorX - contentX * clamped, y: anchorY - contentY * clamped })
}

/** 缩放锚点：可视区中心。用 clientWidth / clientHeight 与 fitToScreen 同口径——有滚动条时 rect 含滚动条宽，两者会差半条，缩放中心就偏 */
function viewportCenter(): [number, number] {
  const vp = viewportEl.value
  return vp ? [vp.clientWidth / 2, vp.clientHeight / 2] : [0, 0]
}

function zoomIn() {
  const [cx, cy] = viewportCenter()
  zoomAt(currentZoom.value * props.zoomStep, cx, cy)
}

function zoomOut() {
  const [cx, cy] = viewportCenter()
  zoomAt(currentZoom.value / props.zoomStep, cx, cy)
}

function reset() {
  applyZoom(1)
  applyOffset({ x: 0, y: 0 })
}

/** 适应窗口：内容完整可见并居中，四周留 padding */
function fitToScreen(padding = 20) {
  const content = contentEl.value
  const vp = viewportEl.value
  if (!content || !vp) return
  const fit = computeFit(
    content.offsetWidth,
    content.offsetHeight,
    vp.clientWidth,
    vp.clientHeight,
    padding,
    props.minZoom,
    props.maxZoom
  )
  applyZoom(fit.zoom)
  applyOffset(fit.offset)
}

// ---- 拖拽平移与双指捏合（Pointer Events 统一处理鼠标 / 触控） ----
const panning = ref(false)
const pointers = new Map<number, { x: number; y: number }>()
let panStart: { px: number; py: number; ox: number; oy: number } | null = null
let pinchStart: {
  dist: number
  zoom: number
  cx: number
  cy: number
  ox: number
  oy: number
} | null = null
/** 拖拽位移超过该阈值才算平移（避免干扰节点点击） */
const PAN_THRESHOLD = 3
let moved = false

function handlePointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  moved = false
  if (pointers.size === 1) {
    panStart = {
      px: event.clientX,
      py: event.clientY,
      ox: currentOffset.value.x,
      oy: currentOffset.value.y,
    }
  } else if (pointers.size === 2) {
    pinchStart = capturePinch()
  }
}

function capturePinch() {
  const [a, b] = [...pointers.values()]
  const vp = viewportEl.value
  const rect = vp?.getBoundingClientRect()
  return {
    dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
    zoom: currentZoom.value,
    cx: rect ? (a.x + b.x) / 2 - rect.left : 0,
    cy: rect ? (a.y + b.y) / 2 - rect.top : 0,
    ox: currentOffset.value.x,
    oy: currentOffset.value.y,
  }
}

function handlePointerMove(event: PointerEvent) {
  if (!pointers.has(event.pointerId)) return
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

  if (pointers.size >= 2 && pinchStart) {
    const pinch = pinchStart
    const [a, b] = [...pointers.values()]
    const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
    const nextZoom = pinch.zoom * (dist / pinch.dist)
    const contentX = (pinch.cx - pinch.ox) / pinch.zoom
    const contentY = (pinch.cy - pinch.oy) / pinch.zoom
    const clamped = clampZoom(nextZoom, props.minZoom, props.maxZoom)
    moved = true
    applyZoom(clamped)
    applyOffset({ x: pinch.cx - contentX * clamped, y: pinch.cy - contentY * clamped })
    return
  }

  if (panStart) {
    const dx = event.clientX - panStart.px
    const dy = event.clientY - panStart.py
    if (!moved && Math.hypot(dx, dy) > PAN_THRESHOLD) {
      moved = true
      panning.value = true
    }
    if (moved) applyOffset({ x: panStart.ox + dx, y: panStart.oy + dy })
  }
}

function handlePointerUp(event: PointerEvent) {
  pointers.delete(event.pointerId)
  if (pointers.size < 2) pinchStart = null
  if (pointers.size === 1) {
    const [p] = [...pointers.values()]
    panStart = { px: p.x, py: p.y, ox: currentOffset.value.x, oy: currentOffset.value.y }
    pinchStart = null
  } else if (pointers.size === 0) {
    panStart = null
    panning.value = false
  }
  // 平移过则吞掉随后的一次 click，避免误触 node-click
  if (moved) {
    const el = viewportEl.value
    if (el) {
      el.addEventListener(
        'click',
        (e) => {
          e.stopPropagation()
          e.preventDefault()
        },
        { capture: true, once: true }
      )
    }
    moved = false
  }
}

function handleDblClick() {
  reset()
}

// ---- 工具栏 ----
const slots = useSlots()
const toolbarVisible = computed(() => props.toolbar || !!slots.toolbar)
const toolbarScope = computed(() => ({
  zoom: currentZoom.value,
  zoomIn,
  zoomOut,
  reset,
  fit: fitToScreen,
}))

// ---- 组内树实例登记（centerNode 定位） ----
const trees = new Set<ViewportTreeApi>()

// ---- 对外方法 ----
/** 居中指定节点（key / data / Node）：先展开其祖先使其可见，再将视口中心对准该节点 */
async function centerNode(data: Parameters<ViewportTreeApi['getNodeEl']>[0]) {
  for (const tree of trees) tree.expandNode(data as any)
  await nextTick()
  const el = findNodeEl(data)
  if (!el) return false
  const content = contentEl.value
  const vp = viewportEl.value
  if (!content || !vp) return false
  const zoom = currentZoom.value
  const nodeRect = el.getBoundingClientRect()
  const contentRect = content.getBoundingClientRect()
  const contentCx = (nodeRect.left + nodeRect.width / 2 - contentRect.left) / zoom
  const contentCy = (nodeRect.top + nodeRect.height / 2 - contentRect.top) / zoom
  applyOffset({
    x: vp.clientWidth / 2 - contentCx * zoom,
    y: vp.clientHeight / 2 - contentCy * zoom,
  })
  return true
}

function findNodeEl(data: Parameters<ViewportTreeApi['getNodeEl']>[0]): HTMLElement | null {
  for (const tree of trees) {
    const el = tree.getNodeEl(data as any)
    if (el) return el
  }
  return null
}

/** 导出画布内容为 PNG / SVG 并触发下载，返回 dataURL */
async function exportImage(options: ExportImageOptions = {}): Promise<string> {
  const content = contentEl.value
  if (!content) throw new Error('[vue3-okr-tree] exportImage: 画布尚未挂载')
  const type = options.type ?? 'png'
  const dataUrl = await renderToDataUrl(content, options)
  const link = document.createElement('a')
  link.download = `okr-tree-${Date.now()}.${type}`
  link.href = dataUrl
  link.click()
  return dataUrl
}

onMounted(() => {
  // 初始受控值越界时钳制
  if (
    props.zoom !== undefined &&
    props.zoom !== clampZoom(props.zoom, props.minZoom, props.maxZoom)
  ) {
    applyZoom(props.zoom)
  }
})

onBeforeUnmount(() => {
  trees.clear()
})

provide(OKR_TREE_VIEWPORT_INJECTION_KEY, {
  registerTree: (api: ViewportTreeApi) => {
    trees.add(api)
  },
  unregisterTree: (api: ViewportTreeApi) => {
    trees.delete(api)
  },
})

defineExpose({
  zoomIn,
  zoomOut,
  reset,
  fitToScreen,
  centerNode,
  exportImage,
  /** 当前缩放（只读镜像，受控值或内部值） */
  getZoom: () => currentZoom.value,
  getOffset: (): ViewportOffset => ({ ...currentOffset.value }),
})
</script>
