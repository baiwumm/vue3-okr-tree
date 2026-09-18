import type { TreeNode } from './model/node'
import type { TreeNodeData, TreeKey } from '../../types'

/** 画布平移偏移（px，屏幕坐标下内容原点的位置） */
export interface ViewportOffset {
  x: number
  y: number
}

/** 滚轮行为：zoom 始终缩放；scroll 不缩放（页面滚动）；ctrl-zoom 仅按住 Ctrl/⌘ 时缩放（默认） */
export type ViewportWheelBehavior = 'zoom' | 'scroll' | 'ctrl-zoom'

/** 将缩放值钳制到 [minZoom, maxZoom] */
export function clampZoom(zoom: number, minZoom: number, maxZoom: number): number {
  const min = minZoom > 0 ? minZoom : 0.01
  return Math.min(Math.max(zoom, min), maxZoom > min ? maxZoom : min)
}

/**
 * 计算「适应窗口」的缩放与偏移：内容完整可见并居中，四周留 padding。
 * 纯函数（tests/components/viewport.spec.ts 直接覆盖）。
 */
export function computeFit(
  contentWidth: number,
  contentHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  padding = 20,
  minZoom = 0.2,
  maxZoom = 4
): { zoom: number; offset: ViewportOffset } {
  const w = Math.max(1, contentWidth)
  const h = Math.max(1, contentHeight)
  const availW = Math.max(1, viewportWidth - padding * 2)
  const availH = Math.max(1, viewportHeight - padding * 2)
  const zoom = clampZoom(Math.min(availW / w, availH / h), minZoom, maxZoom)
  return {
    zoom,
    offset: {
      x: (viewportWidth - w * zoom) / 2,
      y: (viewportHeight - h * zoom) / 2,
    },
  }
}

/** exportImage 选项 */
export interface ExportImageOptions {
  /** 导出格式，默认 png */
  type?: 'png' | 'svg'
  /** 放大倍数（像素密度），默认 2 */
  scale?: number
  /** 背景色（透明区域填充），如 '#ffffff' */
  background?: string
  /**
   * 自定义 PNG 渲染函数（签名与 html-to-image 的 toPng 一致）。
   * 传入后不再动态 import html-to-image——打包器无法静态分析动态导入时推荐使用。
   */
  toPng?: (el: HTMLElement, options?: Record<string, any>) => Promise<string>
  /** 自定义 SVG 渲染函数（签名与 html-to-image 的 toSvg 一致） */
  toSvg?: (el: HTMLElement, options?: Record<string, any>) => Promise<string>
}

/**
 * 动态加载 html-to-image；未安装 / 不可解析时抛出带修复指引的错误。
 * 通过 @vite-ignore 标记避免库构建时因可选依赖解析失败。
 */
export async function loadHtmlToImage(): Promise<{
  toPng: (el: HTMLElement, options?: Record<string, any>) => Promise<string>
  toSvg: (el: HTMLElement, options?: Record<string, any>) => Promise<string>
}> {
  try {
    return await import(/* @vite-ignore */ 'html-to-image')
  } catch {
    throw new Error(
      '[vue3-okr-tree] exportImage 需要依赖 html-to-image：请先安装（npm i html-to-image），' +
        '或通过 exportImage({ toPng / toSvg }) 传入渲染函数。'
    )
  }
}

/** 渲染并返回 dataURL（png/svg 由 type 决定） */
export async function renderToDataUrl(
  el: HTMLElement,
  options: ExportImageOptions = {}
): Promise<string> {
  const { type = 'png', scale = 2, background, toPng, toSvg } = options
  const renderOptions: Record<string, any> = { pixelRatio: scale }
  if (background !== undefined) renderOptions.backgroundColor = background
  if (type === 'svg') {
    const render = toSvg ?? (await loadHtmlToImage()).toSvg
    return render(el, renderOptions)
  }
  const render = toPng ?? (await loadHtmlToImage()).toPng
  return render(el, renderOptions)
}

/** Viewport 内注册的树实例能力（centerNode 定位用） */
export interface ViewportTreeApi {
  /** 按 key / data / Node 获取节点对应的 DOM 元素 */
  getNodeEl: (data: TreeNode | TreeKey | TreeNodeData) => HTMLElement | null
  /** 展开指定节点（连同祖先），供 centerNode 先让目标可见 */
  expandNode: (data: TreeNode | TreeKey | TreeNodeData, expandParent?: boolean) => TreeNode | null
}
