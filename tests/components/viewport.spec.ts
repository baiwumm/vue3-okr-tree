import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import {
  VueOkrTree,
  OkrTreeViewport,
  type OkrTreeViewportInstance,
  type ViewportOffset,
} from '../../src/lib'
import { clampZoom, computeFit } from '../../src/lib/okr-tree/viewport'

// 模拟 html-to-image 不可安装的环境，验证 exportImage 的错误信息
vi.mock('html-to-image', () => {
  throw new Error('simulated: html-to-image is not installed')
})

const makeData = () => [
  {
    id: 1,
    label: 'A',
    children: [
      { id: 2, label: 'B' },
      { id: 3, label: 'C' },
    ],
  },
]

/** jsdom 的 MouseEvent 属性只读且无 PointerEvent：手动构造事件派发 */
function fireMouse(el: { element: Element }, type: string, props: Record<string, any> = {}) {
  const ev = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: props.clientX ?? 0,
    clientY: props.clientY ?? 0,
    ctrlKey: props.ctrlKey ?? false,
    button: props.button ?? 0,
  })
  const ctorProps = new Set(['clientX', 'clientY', 'ctrlKey', 'button'])
  for (const [key, value] of Object.entries(props)) {
    if (!ctorProps.has(key)) Object.defineProperty(ev, key, { value })
  }
  el.element.dispatchEvent(ev)
}

const mountViewport = (props: Record<string, any> = {}) =>
  mount({
    render() {
      return h(OkrTreeViewport, { ref: 'vp', ...props }, () => [
        h(VueOkrTree, { data: makeData(), nodeKey: 'id' }),
      ])
    },
  })

/**
 * 一次平移到「松手落在画布外」的形态：元素侧的 @pointerup 收不到那一次，
 * 只有 window 上的常驻监听能收尾（浏览器在 down / up 目标不同时不会在画布里派发 click）。
 */
const panAndReleaseOutside = (vpEl: { element: Element }) => {
  fireMouse(vpEl, 'pointerdown', { pointerId: 1, clientX: 0, clientY: 0 })
  fireMouse(vpEl, 'pointermove', { pointerId: 1, clientX: 60, clientY: 40 })
  fireMouse({ element: window as unknown as Element }, 'pointerup', { pointerId: 1 })
}

const setDims = (wrapper: any, width: number, height: number) => {
  const vpEl = wrapper.find('.okr-viewport').element as HTMLElement
  const contentEl = wrapper.find('.okr-viewport-content').element as HTMLElement
  Object.defineProperty(vpEl, 'clientWidth', { value: width, configurable: true })
  Object.defineProperty(vpEl, 'clientHeight', { value: height, configurable: true })
  Object.defineProperty(contentEl, 'offsetWidth', { value: width, configurable: true })
  Object.defineProperty(contentEl, 'offsetHeight', { value: height, configurable: true })
}

describe('纯函数：clampZoom / computeFit', () => {
  it('clampZoom 钳制到 [min, max]', () => {
    expect(clampZoom(0.5, 0.2, 4)).toBe(0.5)
    expect(clampZoom(0.01, 0.2, 4)).toBe(0.2)
    expect(clampZoom(99, 0.2, 4)).toBe(4)
  })

  it('computeFit 等比缩小并居中', () => {
    const fit = computeFit(2000, 1000, 1280, 800, 20, 0.2, 4)
    expect(fit.zoom).toBeCloseTo(Math.min(1240 / 2000, 760 / 1000))
    expect(fit.offset.x).toBeCloseTo((1280 - 2000 * fit.zoom) / 2)
    expect(fit.offset.y).toBeCloseTo((800 - 1000 * fit.zoom) / 2)
  })

  it('computeFit 内容小于窗口时放大到 min(限制内) 居中', () => {
    const fit = computeFit(100, 100, 1280, 800, 20, 0.2, 4)
    expect(fit.zoom).toBe(4) // min(1240/100, 760/100)=7.6 → 钳制到 max 4
    expect(fit.offset.x).toBeCloseTo((1280 - 400) / 2)
  })

  it('computeFit 超大内容钳制到 minZoom', () => {
    const fit = computeFit(50000, 50000, 1280, 800, 20, 0.2, 4)
    expect(fit.zoom).toBe(0.2)
  })
})

describe('OkrTreeViewport：缩放与复位', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('zoomIn / zoomOut 受 min-zoom / max-zoom 钳制', () => {
    const wrapper = mountViewport({ minZoom: 0.5, maxZoom: 2, zoomStep: 2 })
    const vp = wrapper.vm.$refs.vp as OkrTreeViewportInstance
    vp.zoomIn()
    expect(vp.getZoom()).toBe(2) // 1 * 2 → 钳制到 max
    vp.zoomIn()
    expect(vp.getZoom()).toBe(2) // 已到上界
    vp.zoomOut()
    vp.zoomOut()
    expect(vp.getZoom()).toBe(0.5) // 1 / 2 → 0.5，再除钳制到 min
    vp.zoomOut()
    expect(vp.getZoom()).toBe(0.5)
  })

  it('受控 v-model:zoom：方法触发 update:zoom（钳制后）', async () => {
    const emitted: number[] = []
    const wrapper = mountViewport({
      zoom: 1,
      zoomStep: 1.2,
      maxZoom: 1.5,
      'onUpdate:zoom': (z: number) => emitted.push(z),
    })
    const vp = wrapper.vm.$refs.vp as OkrTreeViewportInstance
    vp.zoomIn() // 1.2
    vp.zoomIn() // 1.44
    vp.zoomIn() // 1.728 → 钳制到 1.5
    expect(emitted).toEqual([1.2, 1.44, 1.5])
    wrapper.unmount()
  })

  it('dblclick 复位缩放与偏移', async () => {
    const wrapper = mountViewport()
    const vp = wrapper.vm.$refs.vp as OkrTreeViewportInstance
    vp.zoomIn()
    await wrapper.find('.okr-viewport').trigger('dblclick')
    expect(vp.getZoom()).toBe(1)
    expect(vp.getOffset()).toEqual({ x: 0, y: 0 })
  })

  it('fitToScreen 用内容尺寸计算并应用', async () => {
    const wrapper = mountViewport()
    const vp = wrapper.vm.$refs.vp as OkrTreeViewportInstance
    setDims(wrapper, 1280, 800)
    vp.fitToScreen(20)
    const zoom = vp.getZoom()
    const offset = vp.getOffset()
    expect(zoom).toBeGreaterThan(0)
    expect(offset.x).toBeCloseTo((1280 - 1280 * zoom) / 2)
    expect(offset.y).toBeCloseTo((800 - 800 * zoom) / 2)
  })
})

describe('OkrTreeViewport：滚轮行为', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('wheel-behavior: scroll 不劫持滚轮（不缩放）', async () => {
    const wrapper = mountViewport({ wheelBehavior: 'scroll' })
    const vp = wrapper.vm.$refs.vp as OkrTreeViewportInstance
    fireMouse(wrapper.find('.okr-viewport'), 'wheel', { deltaY: -120 })
    expect(vp.getZoom()).toBe(1)
  })

  it('wheel-behavior: ctrl-zoom（默认）未按 Ctrl 不缩放，按住 Ctrl 缩放', async () => {
    const wrapper = mountViewport()
    const vp = wrapper.vm.$refs.vp as OkrTreeViewportInstance
    const vpEl = wrapper.find('.okr-viewport')
    fireMouse(vpEl, 'wheel', { deltaY: -120 })
    expect(vp.getZoom()).toBe(1)
    fireMouse(vpEl, 'wheel', { deltaY: -120, ctrlKey: true })
    expect(vp.getZoom()).toBeCloseTo(1.2)
  })

  it('wheel-behavior: zoom 不需要 Ctrl 即缩放，且不超过 max-zoom', async () => {
    const wrapper = mountViewport({ wheelBehavior: 'zoom', maxZoom: 1.44 })
    const vp = wrapper.vm.$refs.vp as OkrTreeViewportInstance
    const vpEl = wrapper.find('.okr-viewport')
    fireMouse(vpEl, 'wheel', { deltaY: -120 })
    fireMouse(vpEl, 'wheel', { deltaY: -120 })
    fireMouse(vpEl, 'wheel', { deltaY: -120 })
    expect(vp.getZoom()).toBe(1.44)
  })
})

describe('OkrTreeViewport：拖拽平移', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('pointer 拖拽超过阈值后更新偏移；未超阈值不影响', async () => {
    const wrapper = mountViewport()
    const vp = wrapper.vm.$refs.vp as OkrTreeViewportInstance
    const vpEl = wrapper.find('.okr-viewport')
    fireMouse(vpEl, 'pointerdown', { pointerId: 1, clientX: 100, clientY: 100 })
    fireMouse(vpEl, 'pointermove', { pointerId: 1, clientX: 102, clientY: 101 })
    expect(vp.getOffset()).toEqual({ x: 0, y: 0 }) // 未过阈值不平移
    fireMouse(vpEl, 'pointermove', { pointerId: 1, clientX: 160, clientY: 140 })
    expect(vp.getOffset()).toEqual({ x: 60, y: 40 })
    fireMouse(vpEl, 'pointerup', { pointerId: 1, clientX: 160, clientY: 140 })
  })

  it('受控 v-model:offset：拖拽触发 update:offset', async () => {
    const emitted: ViewportOffset[] = []
    const wrapper = mountViewport({
      offset: { x: 0, y: 0 },
      'onUpdate:offset': (o: ViewportOffset) => emitted.push(o),
    })
    const vpEl = wrapper.find('.okr-viewport')
    fireMouse(vpEl, 'pointerdown', { pointerId: 1, clientX: 0, clientY: 0 })
    fireMouse(vpEl, 'pointermove', { pointerId: 1, clientX: 50, clientY: 30 })
    fireMouse(vpEl, 'pointerup', { pointerId: 1 })
    await wrapper.vm.$nextTick()
    expect(emitted.length).toBeGreaterThan(0)
    expect(emitted[emitted.length - 1]).toEqual({ x: 50, y: 30 })
  })

  it('松手落在画布外：手势照样收尾，之后不按键的悬停不再拖动画布', async () => {
    const wrapper = mountViewport()
    const vp = wrapper.vm.$refs.vp as OkrTreeViewportInstance
    const vpEl = wrapper.find('.okr-viewport')
    panAndReleaseOutside(vpEl)
    await wrapper.vm.$nextTick()

    // 卡住的 is-panning 与残留的 panStart 是一件事的两面：都清掉了才不会再被悬推动
    expect(vpEl.classes()).not.toContain('is-panning')
    expect(vp.getOffset()).toEqual({ x: 60, y: 40 })
    fireMouse(vpEl, 'pointermove', { pointerId: 1, clientX: 400, clientY: 300 })
    expect(vp.getOffset()).toEqual({ x: 60, y: 40 })
  })
})

/**
 * 平移后那次 click 由「标志 + 常驻的捕获阶段处理」吞掉，而不是每次平移都
 * addEventListener('click', …, { once: true })——触摸平移不派发 click，那种写法
 * 会按平移次数往元素上累积监听，卸载时仍挂在那里。
 */
describe('OkrTreeViewport：平移后吞掉一次 click', () => {
  const mountWithNodeClick = (onNodeClick: () => void) =>
    mount({
      render() {
        return h(OkrTreeViewport, { ref: 'vp' }, () => [
          h(VueOkrTree, { data: makeData(), nodeKey: 'id', onNodeClick }),
        ])
      },
    })

  /** 一次完整的触摸平移：按下 → 过阈值 → 抬手，其后不派发任何 click */
  const panOnce = (vpEl: { element: Element }) => {
    fireMouse(vpEl, 'pointerdown', { pointerId: 1, clientX: 0, clientY: 0 })
    fireMouse(vpEl, 'pointermove', { pointerId: 1, clientX: 60, clientY: 40 })
    fireMouse(vpEl, 'pointerup', { pointerId: 1, clientX: 60, clientY: 40 })
  }

  it('只吞掉平移后的那一次点击，第二次照常送到节点', () => {
    const onNodeClick = vi.fn()
    const wrapper = mountWithNodeClick(onNodeClick)
    const label = wrapper.find('.org-chart-node-label-inner')
    panOnce(wrapper.find('.okr-viewport'))
    fireMouse(label, 'click')
    expect(onNodeClick).not.toHaveBeenCalled()
    fireMouse(label, 'click')
    expect(onNodeClick).toHaveBeenCalledTimes(1)
  })

  it('画布外松手不武装吞点击：紧接着的第一次点击照常送到节点', () => {
    const onNodeClick = vi.fn()
    const wrapper = mountWithNodeClick(onNodeClick)
    panAndReleaseOutside(wrapper.find('.okr-viewport'))
    // 松手在画布外，浏览器不会在画布里补出一次 click 来消费这个标志；
    // 若把它武装上，用户回到画布里的第一次正常点击就会被无故吃掉
    fireMouse(wrapper.find('.org-chart-node-label-inner'), 'click')
    expect(onNodeClick).toHaveBeenCalledTimes(1)
  })

  it('平移后没有 click 时不在视口元素上留监听', () => {
    const onNodeClick = vi.fn()
    const wrapper = mountWithNodeClick(onNodeClick)
    const vpEl = wrapper.find('.okr-viewport')
    // @click.capture 挂载时就挂好了，这里只统计平移过程中新增的注册
    const addSpy = vi.spyOn(vpEl.element as HTMLElement, 'addEventListener')
    for (let i = 0; i < 3; i++) panOnce(vpEl)
    expect(addSpy.mock.calls.filter(([type]) => type === 'click')).toHaveLength(0)
  })
})

describe('OkrTreeViewport：centerNode 与 exportImage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('centerNode 展开祖先并居中目标节点', async () => {
    const wrapper = mountViewport({ minZoom: 1, maxZoom: 1 })
    const vp = wrapper.vm.$refs.vp as OkrTreeViewportInstance
    // jsdom 中 rect 为 0，主要验证能找到节点并完成流程
    await expect(vp.centerNode(2)).resolves.toBe(true)
    await expect(vp.centerNode(999)).resolves.toBe(false)
  })

  it('exportImage 未安装 html-to-image 时给出明确错误', async () => {
    const wrapper = mountViewport()
    const vp = wrapper.vm.$refs.vp as OkrTreeViewportInstance
    await expect(vp.exportImage()).rejects.toThrow(/html-to-image/)
  })

  it('exportImage 使用传入的 toPng 渲染并触发下载', async () => {
    const clickSpy = vi.fn()
    const created: HTMLAnchorElement[] = []
    const originalCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreate(tag)
      if (tag === 'a') {
        created.push(el as HTMLAnchorElement)
        ;(el as HTMLAnchorElement).click = clickSpy
      }
      return el
    })
    const toPng = vi.fn(
      async (_el: HTMLElement, _opts?: Record<string, any>) => 'data:image/png;base64,xyz'
    )
    const wrapper = mountViewport()
    const vp = wrapper.vm.$refs.vp as OkrTreeViewportInstance
    const dataUrl = await vp.exportImage({ toPng, scale: 3, background: '#ffffff' })
    expect(dataUrl).toBe('data:image/png;base64,xyz')
    expect(toPng).toHaveBeenCalledTimes(1)
    expect(toPng.mock.calls[0][1]).toMatchObject({ pixelRatio: 3, backgroundColor: '#ffffff' })
    expect(created).toHaveLength(1)
    expect(created[0].download).toMatch(/\.png$/)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    vi.restoreAllMocks()
  })

  it('exportImage 支持 svg 类型（toSvg）', async () => {
    const toSvg = vi.fn(
      async (_el: HTMLElement, _opts?: Record<string, any>) => 'data:image/svg+xml;base64,abc'
    )
    const wrapper = mountViewport()
    const vp = wrapper.vm.$refs.vp as OkrTreeViewportInstance
    const dataUrl = await vp.exportImage({ type: 'svg', toSvg })
    expect(dataUrl).toBe('data:image/svg+xml;base64,abc')
    expect(toSvg).toHaveBeenCalledTimes(1)
  })
})

describe('OkrTreeViewport：与 OkrTree 组合', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('插槽内的树正常渲染，OkrTreeGroup 可包裹', async () => {
    const wrapper = mount({
      render() {
        return h(OkrTreeViewport, null, () => [
          h(VueOkrTree, { data: makeData(), nodeKey: 'id', showCollapsable: true }),
        ])
      },
    })
    await wrapper.find('.okr-viewport .org-chart-node-btn').trigger('click')
    const labels = wrapper
      .findAll('.okr-viewport .org-chart-node-label-inner')
      .map((x: any) => x.text())
    expect(labels).toContain('B')
    wrapper.unmount()
  })

  it('受控 zoom/offset 组合属性双向同步', async () => {
    const zoom = ref(1)
    const offset = ref<ViewportOffset>({ x: 0, y: 0 })
    const Parent = defineComponent({
      setup() {
        return { zoom, offset }
      },
      render() {
        return h(
          OkrTreeViewport,
          {
            zoom: zoom.value,
            offset: offset.value,
            'onUpdate:zoom': (z: number) => (zoom.value = z),
            'onUpdate:offset': (o: ViewportOffset) => (offset.value = o),
          },
          () => [h(VueOkrTree, { data: makeData() })]
        )
      },
    })
    const wrapper = mount(Parent)
    const vpEl = wrapper.find('.okr-viewport')
    fireMouse(vpEl, 'wheel', { deltaY: -120, ctrlKey: true })
    expect(zoom.value).toBeCloseTo(1.2)
    fireMouse(vpEl, 'pointerdown', { pointerId: 1, clientX: 0, clientY: 0 })
    fireMouse(vpEl, 'pointermove', { pointerId: 1, clientX: 30, clientY: 20 })
    fireMouse(vpEl, 'pointerup', { pointerId: 1 })
    expect(offset.value).toEqual({ x: 30, y: 20 })
    wrapper.unmount()
  })
})
