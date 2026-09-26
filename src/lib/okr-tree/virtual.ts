import { computed, shallowRef, watch, type ComputedRef, type Ref, type ShallowRef } from 'vue'
import type { TreeNode } from './model/node'

/**
 * 虚拟滚动（virtual prop）：只对「同层可见兄弟数 ≥ 阈值」的行做窗口化渲染。
 *
 * 机制（2026-09-26 spike 结论，探针 _scratch/spike-virtual.spec.ts）：
 * - 连接线的每段线都由节点自绘（::before 左半段 / ::after 右半段 + 穿自身竖线），
 *   真正依赖 DOM 相邻的只有边界帽（:first-child / :last-child / :only-child）。
 * - 窗口化不删兄弟的"位置"：用**等尺寸 spacer 占位块**顶住未渲染兄弟的位置，float 行
 *   （vertical）的总宽与每个渲染节点的 x 偏移、flex 列（horizontal）的总高与每个渲染
 *   节点的 y 偏移，都与全量渲染逐像素一致；spacer 自带连线段续接线，行首/行末的
 *   spacer 天然占据 :first-child / :last-child，真实节点的边界帽语义自动正确，
 *   不需要任何覆盖类。
 * - 尺寸来自**模型**而非 DOM（未渲染的兄弟量不到）：vertical 用宽度模型
 *   （叶/折叠 = labelWidth + 2×sibling 间距，展开 = max(labelWidth, Σ 子盒宽) + 2×sibling
 *   间距），horizontal 用高度模型（叶/折叠 = labelHeight + 2×node-y，展开取 max/Σ）。
 *   容器内 box-sizing: border-box，数字型 label-width / label-height 即卡片最终尺寸。
 *   因此 **virtual 要求数字型 label-width**（horizontal 还要求 label-height）；auto
 *   尺寸下模型不可知，达标行退回全量渲染。
 * - 滚动 / 缩放 / 平移经 tick 广播（OkrTree 在 document 捕获阶段挂 scroll、监听
 *   resize、MutationObserver 盯 viewport canvas 的 transform），行组件在一个 computed
 *   里重算窗口：模型读取的 expanded / childNodes / visible 都是响应式的，展开、过滤、
 *   换数据自动跟随，无需额外事件。
 */

/** 参与 virtual 的最小同层可见兄弟数：低于它的行全量渲染（窗口化无收益） */
export const VIRTUAL_THRESHOLD = 50
/** 主轴方向视口外扩的像素数（overscan） */
export const VIRTUAL_OVERSCAN_PX = 300
/** 视口外（交叉轴）行的最小渲染条数：保持少量真实结构，高度近似有界 */
export const VIRTUAL_MIN_WINDOW = 12
/** 交叉轴参与判定时视口的外扩余量 */
export const VIRTUAL_CROSS_MARGIN = 400
/** 揭示请求（scrollToNode / 键盘漫游）强制窗口的半宽（条数） */
export const VIRTUAL_REVEAL_HALF = 10

/** OkrTree provide 给行组件的虚拟滚动上下文（virtual 关闭时不 provide） */
export interface OkrTreeVirtualContext {
  /** 窗口化主轴：vertical 布局兄弟横排 → 'x'；horizontal 布局兄弟竖排 → 'y' */
  axis: 'x' | 'y'
  /** 度量时钟：滚动 / resize / viewport 变换时 +1，行组件据此重算窗口 */
  tick: ShallowRef<number>
  /** 滚动视口矩形（滚动容器或 documentElement 的 getBoundingClientRect） */
  viewRect: ShallowRef<DOMRect | null>
  /** 揭示请求：scrollToNode / 键盘漫游要求某节点必须渲染时递增 */
  reveal: ShallowRef<{ node: TreeNode; n: number } | null>
  /** 卡片定宽（labelWidth 数字值）；0 表示不可用（达标行退回全量渲染） */
  labelW: number
  /** 卡片定高（labelHeight 数字值），仅 axis === 'y' 需要；0 同上 */
  labelH: number
  /** --okr-gap-sibling 解析值（宽度模型的水平内边距） */
  gapSibling: number
  /** --okr-gap-node-y 解析值（高度模型的卡片纵向外边距） */
  gapNodeY: number
}

/** vertical（兄弟横排）节点盒宽：与 float shrink-wrap 的 DOM 结果一致 */
export function vNodeWidth(node: TreeNode, ctx: OkrTreeVirtualContext): number {
  const pad = ctx.gapSibling * 2
  const base = ctx.labelW + pad
  if (!node.expanded) return base
  let row = 0
  let has = false
  for (const child of node.childNodes) {
    if (!child.visible) continue
    has = true
    row += vNodeWidth(child, ctx)
  }
  if (!has) return base
  return Math.max(ctx.labelW, row) + pad
}

/** horizontal（兄弟竖排）节点盒高：与 flex 纵向堆叠的 DOM 结果一致 */
export function hNodeHeight(node: TreeNode, ctx: OkrTreeVirtualContext): number {
  const base = ctx.labelH + ctx.gapNodeY * 2
  if (!node.expanded) return base
  let stack = 0
  let has = false
  for (const child of node.childNodes) {
    if (!child.visible) continue
    has = true
    stack += hNodeHeight(child, ctx)
  }
  if (!has) return base
  return Math.max(base, stack)
}

/** 行窗口状态；null = 该行不参与窗口化（全量渲染） */
export interface VirtualWindowState {
  /** 渲染区间 [start, end)，基于「可见兄弟」下标 */
  start: number
  end: number
  /** 行首占位块的尺寸（vertical 为宽、horizontal 为高），0 表示无 */
  leadSize: number
  /** 行末占位块的尺寸，0 表示无 */
  trailSize: number
  /** 行内全部可见兄弟的尺寸总和（vertical 为行宽、horizontal 为列高），供容器显式定宽/高 */
  totalSize: number
}

export interface VirtualWindow {
  active: ComputedRef<boolean>
  state: ComputedRef<VirtualWindowState | null>
}

/**
 * 行级窗口：items 为该行「可见兄弟」列表（模型序），containerRef 为子容器元素。
 * state 为 null 时全量渲染；非空时只渲染 [start, end) 并以 leadSize/trailSize 占位。
 */
export function useVirtualWindow(options: {
  ctx: OkrTreeVirtualContext | undefined
  items: ComputedRef<TreeNode[]>
  containerRef: Ref<HTMLElement | null>
  sizeOf: (node: TreeNode, ctx: OkrTreeVirtualContext) => number
}): VirtualWindow {
  const { ctx, items, containerRef, sizeOf } = options

  /** 揭示请求的强制窗口：保持到下一次滚动度量（tick 变化）为止 */
  const forced = shallowRef<[number, number] | null>(null)
  if (ctx) {
    watch(ctx.reveal, (req) => {
      if (!req) return
      const idx = items.value.indexOf(req.node)
      if (idx < 0) return
      forced.value = [
        Math.max(0, idx - VIRTUAL_REVEAL_HALF),
        Math.min(items.value.length, idx + VIRTUAL_REVEAL_HALF + 1),
      ]
    })
    watch(ctx.tick, () => {
      if (forced.value) forced.value = null
    })
  }

  const usable = computed(() => {
    if (!ctx) return false
    if (!ctx.labelW) return false
    if (ctx.axis === 'y' && !ctx.labelH) return false
    return items.value.length >= VIRTUAL_THRESHOLD
  })

  const active = computed(() => usable.value)

  const state = computed<VirtualWindowState | null>(() => {
    const list = items.value
    if (!usable.value || !ctx) return null
    // 前缀尺寸和：spacer 的占位尺寸与窗口定位都从这里出（O(n)，仅达标行求值）
    const prefix = new Float64Array(list.length + 1)
    for (let i = 0; i < list.length; i++) prefix[i + 1] = prefix[i] + sizeOf(list[i], ctx)
    const total = prefix[list.length]
    if (forced.value) {
      const [s, e] = forced.value
      return {
        start: s,
        end: e,
        leadSize: prefix[s],
        trailSize: total - prefix[e],
        totalSize: total,
      }
    }
    const el = containerRef.value
    const view = ctx.viewRect.value
    // SSR / 首帧（容器或视口未知）：小窗口兜底，挂载后的第一次 tick 修正
    if (!el || !view || typeof el.getBoundingClientRect !== 'function') {
      return {
        start: 0,
        end: Math.min(list.length, VIRTUAL_MIN_WINDOW),
        leadSize: 0,
        trailSize: total - prefix[Math.min(list.length, VIRTUAL_MIN_WINDOW)],
        totalSize: total,
      }
    }
    const rect = el.getBoundingClientRect()
    const crossA = ctx.axis === 'x' ? rect.top : rect.left
    const crossB = ctx.axis === 'x' ? rect.bottom : rect.right
    const viewA = ctx.axis === 'x' ? view.top : view.left
    const viewB = ctx.axis === 'x' ? view.bottom : view.right
    if (crossB < viewA - VIRTUAL_CROSS_MARGIN || crossA > viewB + VIRTUAL_CROSS_MARGIN) {
      // 行整体在视口交叉轴之外：少量结构占位（尺寸由 spacer 保持，不影响滚动几何）
      const end = Math.min(list.length, VIRTUAL_MIN_WINDOW)
      return { start: 0, end, leadSize: 0, trailSize: total - prefix[end], totalSize: total }
    }
    const lo =
      (ctx.axis === 'x' ? view.left - rect.left : view.top - rect.top) - VIRTUAL_OVERSCAN_PX
    const hi =
      (ctx.axis === 'x' ? view.right - rect.left : view.bottom - rect.top) + VIRTUAL_OVERSCAN_PX
    // 二分：start = 第一个右端越过 lo 的条目；end = 第一个起点不早于 hi 的条目
    let start = 0
    while (start < list.length && prefix[start + 1] <= lo) start++
    let end = start
    while (end < list.length && prefix[end] < hi) end++
    if (start >= list.length) {
      // 视口在行内容主轴之外（如 transform 平移后）：少量结构占位
      return {
        start: 0,
        end: Math.min(list.length, VIRTUAL_MIN_WINDOW),
        leadSize: 0,
        trailSize: total - prefix[Math.min(list.length, VIRTUAL_MIN_WINDOW)],
        totalSize: total,
      }
    }
    start = Math.max(0, start - 2)
    end = Math.min(list.length, end + 2)
    return { start, end, leadSize: prefix[start], trailSize: total - prefix[end], totalSize: total }
  })

  return { active, state }
}
