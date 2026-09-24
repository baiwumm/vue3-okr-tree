import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { VueOkrTree, type VueOkrTreeInstance } from '../../src/lib'

const makeData = () => [
  {
    id: 1,
    label: 'Root',
    children: [
      { id: 11, label: 'A', children: [{ id: 111, label: 'A1' }] },
      { id: 12, label: 'B' },
    ],
  },
]

const mountSvg = (props: Record<string, any> = {}) =>
  mount(VueOkrTree, { props: { data: makeData(), connector: 'svg', nodeKey: 'id', ...props } })

const paths = (w: any) => w.findAll('.okr-connector-svg path')
const pathDs = (w: any) => paths(w).map((p: any) => p.attributes('d'))
/** 残枝路径使用相对指令 l */
const stubDs = (w: any) => pathDs(w).filter((d: string) => d.includes(' l '))

/** 重绘经 rAF 调度：等一个帧后再等 Vue flush */
const flushFrame = async () => {
  await nextTick()
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
  await nextTick()
}

describe('connector 模式', () => {
  it('默认 css：无覆盖层、无 connector-svg 类', () => {
    const wrapper = mount(VueOkrTree, { props: { data: makeData() } })
    expect(wrapper.find('.okr-connector-svg').exists()).toBe(false)
    expect(wrapper.find('.org-chart-container').classes()).not.toContain('connector-svg')
  })

  it('svg 模式：渲染覆盖层与路径，路径数量等于可见父子边数', async () => {
    const wrapper = mountSvg()
    await flushFrame()
    expect(wrapper.find('.org-chart-container').classes()).toContain('connector-svg')
    // Root→A、A→A1、Root→B，共 3 条（show-collapsable=false 时强制全展开）
    expect(paths(wrapper).length).toBe(3)
    expect(pathDs(wrapper).every((d: string) => d.startsWith('M '))).toBe(true)
  })

  it('非法 connector 值：按 css 渲染并输出开发期警告', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(VueOkrTree, { props: { data: makeData(), connector: 'none' as any } })
    expect(wrapper.find('.okr-connector-svg').exists()).toBe(false)
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('运行时切换 connector：svg ↔ css 即时生效', async () => {
    const wrapper = mount(VueOkrTree, { props: { data: makeData(), nodeKey: 'id' } })
    await wrapper.setProps({ connector: 'svg' })
    await flushFrame()
    expect(wrapper.find('.okr-connector-svg').exists()).toBe(true)
    expect(paths(wrapper).length).toBe(3)
    await wrapper.setProps({ connector: 'css' })
    await nextTick()
    expect(wrapper.find('.okr-connector-svg').exists()).toBe(false)
    expect(wrapper.find('.org-chart-container').classes()).not.toContain('connector-svg')
  })
})

describe('路径形状', () => {
  it('curve 含贝塞尔 C 指令（默认）', () => {
    const wrapper = mountSvg({ connectorShape: 'curve' })
    expect(pathDs(wrapper).every((d: string) => d.includes('C '))).toBe(true)
  })

  it('orthogonal 为直角折线（只含 L 指令）', () => {
    const wrapper = mountSvg({ connectorShape: 'orthogonal' })
    const ds = pathDs(wrapper)
    expect(ds.every((d: string) => d.includes('L '))).toBe(true)
    expect(ds.every((d: string) => !d.includes('C '))).toBe(true)
  })

  it('straight 为两点直线', () => {
    const wrapper = mountSvg({ connectorShape: 'straight' })
    const ds = pathDs(wrapper)
    expect(ds.every((d: string) => /^M [\d.]+ [\d.]+ L [\d.]+ [\d.]+$/.test(d))).toBe(true)
  })

  it('非法 connectorShape 警告并回退 curve', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mountSvg({ connectorShape: 'zigzag' as any })
    expect(pathDs(wrapper).every((d: string) => d.includes('C '))).toBe(true)
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})

describe('展开 / 收起与过滤后的重绘', () => {
  it('展开节点后：A→A1 实体边替换收起残枝（onUpdated 重绘）', async () => {
    const wrapper = mountSvg({ showCollapsable: true, defaultExpandedKeys: [1] })
    await flushFrame()
    // 初始：Root→A、Root→B 两条实体边 + A 的收起残枝
    expect(paths(wrapper).length).toBe(3)
    expect(stubDs(wrapper).length).toBe(1)
    // 展开 A
    const vm = wrapper.vm as VueOkrTreeInstance
    vm.expandNode(11)
    await flushFrame()
    expect(stubDs(wrapper).length).toBe(0)
    expect(paths(wrapper).length).toBe(3)
  })

  it('收起残枝：收起带子节点的节点时保留 stub 路径', async () => {
    const wrapper = mountSvg({ showCollapsable: true, defaultExpandedKeys: [1, 11] })
    await flushFrame()
    // 初始全展开：3 条实体边、无残枝
    expect(stubDs(wrapper).length).toBe(0)
    const vm = wrapper.vm as VueOkrTreeInstance
    vm.collapseNode(11)
    await flushFrame()
    // A→A1 实体边被残枝替换
    expect(stubDs(wrapper).length).toBe(1)
    expect(paths(wrapper).length).toBe(3)
  })

  it('filter 隐藏节点后对应边消失', async () => {
    const wrapper = mountSvg({
      filterNodeMethod: (value: string, data: any) => !value || data.label.includes(value),
    })
    await flushFrame()
    const vm = wrapper.vm as VueOkrTreeInstance
    vm.filter('B')
    await flushFrame()
    // 只剩 Root→B（A 子树被隐藏）
    expect(paths(wrapper).length).toBe(1)
    vm.filter('')
    await flushFrame()
    expect(paths(wrapper).length).toBe(3)
  })

  it('稳态不自持重排：静置后不再产生任何测量', async () => {
    const orig = Element.prototype.getBoundingClientRect
    let calls = 0
    const spy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element
    ) {
      calls += 1
      return orig.call(this)
    })
    try {
      const wrapper = mountSvg({ showCollapsable: true, defaultExpandedKeys: [1, 11] })
      for (let i = 0; i < 4; i++) await flushFrame()
      /**
       * 前置自检：探针必须真的在计数（实测此处为 10），否则下面的「增量为 0」会退化成
       * 「探针从没响过」的假绿。姊妹包 react-okr-tree 补同形用例时，同一种自增计数器
       * 在那边**一步都不动**——它的 stubCards 对同名方法做实例级 `vi.spyOn`，会把原型层
       * 那个 mock 的自定义实现作废（`mock.calls` 仍增长），那边只能改数 `mock.calls`。
       * 两边写法看着同形，能响的东西并不相同，所以这条自检两边都留着。
       */
      expect(calls, 'rect 一次都没被读到——探针没生效').toBeGreaterThan(0)
      const settled = calls
      for (let i = 0; i < 8; i++) await flushFrame()
      // 无条件换 connectorEdges 引用会让「写 ref → 重渲染 → onUpdated 再排帧」闭成环，
      // 每一帧都把全树重测一遍；短路后静置窗内应当一次测量都没有。
      expect(calls - settled).toBe(0)
      // 短路不能冻住覆盖层：几何真的变了仍要重绘（A→A1 实体边换成收起残枝）
      const vm = wrapper.vm as VueOkrTreeInstance
      expect(stubDs(wrapper).length).toBe(0)
      vm.collapseNode(11)
      await flushFrame()
      expect(stubDs(wrapper).length).toBe(1)
    } finally {
      spy.mockRestore()
    }
  })
})

describe('OKR 模式左树', () => {
  it('根节点与左树顶层节点之间绘制镜像连线', async () => {
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        leftData: [{ id: 1, label: 'Root', children: [{ id: 21, label: 'L1' }] }],
        onlyBothTree: true,
        direction: 'horizontal',
        connector: 'svg',
        nodeKey: 'id',
      },
    })
    await flushFrame()
    // 右树 3 条 + 根→L1 共 4 条
    expect(paths(wrapper).length).toBe(4)
    // 收起左侧后：根→L1 的边替换为残枝，总数不变
    const vm = wrapper.vm as VueOkrTreeInstance
    vm.getNode(1)!.leftExpanded = false
    await flushFrame()
    expect(paths(wrapper).length).toBe(4)
    expect(stubDs(wrapper).some((d: string) => d === 'M 0 0 l -20 0')).toBe(true)
  })
})
