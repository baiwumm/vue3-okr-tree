import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 3000 节点的 store 构建在慢机上不止 5s：整文件放宽单用例超时
vi.setConfig({ testTimeout: 30_000 })
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { VueOkrTree } from '../../src/lib'
import { resetWarnings } from '../../src/lib/okr-tree/model/util'

/**
 * 虚拟滚动（virtual）单测。jsdom 没有真实布局（getBoundingClientRect 全零），
 * 窗口计算走「视口矩形 + 容器矩形全零」的确定性分支：lo = -300、hi = +300，
 * labelWidth 110px 的行渲染 [0, 5)（+overscan 余量 2）——正好可以精确断言窗口边界。
 * 度量时序：onMounted → nextTick → measureVirtual（rAF）→ tick，等一个 macrotask
 * 让整条链落地（jsdom 的 rAF 按 setTimeout 节奏触发）。
 */

const makeData = (n: number) => [
  {
    id: 0,
    label: 'Root',
    children: Array.from({ length: n }, (_, i) => ({ id: i + 1, label: `N${i + 1}` })),
  },
]

/** 等待挂载度量链（nextTick → rAF → tick → 重渲染）落地 */
const settle = async () => {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 30))
  await nextTick()
}

const NODE_W = 110 // labelWidth 100 + 左右 sibling 间距 2×5

describe('virtual 关闭（默认）', () => {
  it('不产生任何占位块，行为与旧版一致', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(200), nodeKey: 'id', labelWidth: 100, defaultExpandAll: true },
    })
    await settle()
    expect(wrapper.findAll('.okr-v-spacer, .okr-h-spacer')).toHaveLength(0)
    expect(wrapper.findAll('.org-chart-node').length).toBe(201)
  })
})

describe('virtual 开启（vertical，宽度模型）', () => {
  beforeEach(() => resetWarnings())
  afterEach(() => {
    delete (Element.prototype as any).scrollIntoView
  })

  it('达标行只渲染窗口内节点，行末占位块的宽度等于未渲染兄弟的总宽', async () => {
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(3000),
        nodeKey: 'id',
        labelWidth: 100,
        defaultExpandAll: true,
        virtual: true,
      },
    })
    await settle()
    const nodes = wrapper.findAll('.org-chart-node')
    // 视口矩形全零 → 窗口 [0, 5)，加根节点共 6 个，远小于全量 3001
    expect(nodes.length).toBe(6)
    const spacer = wrapper.find('.okr-v-spacer')
    expect(spacer.exists()).toBe(true)
    expect(spacer.attributes('style')).toContain(`width: ${(3000 - 5) * NODE_W}px`)
    // 模型不撒谎：可见节点数与 aria 语义都按全量算
    expect((wrapper.vm as any).getVisibleNodes().length).toBe(3001)
    expect(nodes[1].attributes('aria-setsize')).toBe('3000')
    expect(nodes[1].attributes('aria-posinset')).toBe('1')
  })

  it('scrollToNode 先揭示再滚动：窗口外的目标也能定位', async () => {
    const scrollSpy = vi.fn()
    Element.prototype.scrollIntoView = scrollSpy
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(3000),
        nodeKey: 'id',
        labelWidth: 100,
        defaultExpandAll: true,
        virtual: true,
      },
    })
    await settle()
    const ok = await (wrapper.vm as any).scrollToNode(2500)
    await nextTick()
    expect(ok).toBe(true)
    // 目标元素已被揭示渲染，且 scrollIntoView 落在它身上
    const labels = wrapper.findAll('.org-chart-node-label-inner')
    const target = labels.find((n) => n.text() === 'N2500')
    expect(target).toBeTruthy()
    expect(scrollSpy).toHaveBeenCalled()
    const revealed = wrapper.findAll('.org-chart-node').length
    expect(revealed).toBeGreaterThan(6)
    expect(revealed).toBeLessThan(60)
  })

  it('filter 后可见兄弟跌破阈值：占位块消失、全量渲染可见节点', async () => {
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(3000),
        nodeKey: 'id',
        labelWidth: 100,
        defaultExpandAll: true,
        virtual: true,
        filterNodeMethod: (value: string, data: any) => data.label.includes(value),
      },
    })
    await settle()
    ;(wrapper.vm as any).filter('N250')
    await settle()
    // 匹配 N250、N2500..N2509 共 11 个 < 50：全量渲染、无占位块
    expect(wrapper.findAll('.okr-v-spacer')).toHaveLength(0)
    expect(wrapper.findAll('.org-chart-node').length).toBe(12)
    ;(wrapper.vm as any).filter('')
    await settle()
    expect(wrapper.find('.okr-v-spacer').exists()).toBe(true)
  })

  it('expandAll 后 DOM 数量仍有界（窗口随宽度模型自动重算）', async () => {
    const data = [
      {
        id: 0,
        label: 'Root',
        children: Array.from({ length: 100 }, (_, i) => ({
          id: i + 1,
          label: `P${i + 1}`,
          children: Array.from({ length: 50 }, (_, j) => ({
            id: (i + 1) * 100 + j,
            label: `L${j}`,
          })),
        })),
      },
    ]
    const wrapper = mount(VueOkrTree, {
      props: { data, nodeKey: 'id', labelWidth: 100, virtual: true },
    })
    await settle()
    expect(wrapper.findAll('.org-chart-node').length).toBeLessThan(30)
    ;(wrapper.vm as any).expandAll()
    await settle()
    const total = 1 + 100 + 5000
    expect((wrapper.vm as any).getVisibleNodes().length).toBe(total)
    // 展开后每个父宽 50×110+10，视口 300px 只容得下第一个父的窗口
    expect(wrapper.findAll('.org-chart-node').length).toBeLessThan(30)
    expect(wrapper.findAll('.org-chart-node').length).toBeGreaterThan(1)
  })

  it('未给数字型 label-width：输出开发期警告，行退回全量渲染', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(200), nodeKey: 'id', defaultExpandAll: true, virtual: true },
    })
    await nextTick()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('label-width'))
    expect(wrapper.findAll('.org-chart-node').length).toBe(201)
    expect(wrapper.findAll('.okr-v-spacer')).toHaveLength(0)
    warnSpy.mockRestore()
  })

  it('运行时改 virtual：输出快照 prop 警告', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(10), nodeKey: 'id', virtual: true },
    })
    await wrapper.setProps({ virtual: false })
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('virtual 运行时变更不会生效'))
    warnSpy.mockRestore()
  })

  it('过滤筛空整行：窗口为空、无占位块（vNodeWidth 的 base 分支）', async () => {
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(300),
        nodeKey: 'id',
        labelWidth: 100,
        defaultExpandAll: true,
        virtual: true,
        filterNodeMethod: (v: string, d: any) => d.label.includes(v),
      },
    })
    await settle()
    ;(wrapper.vm as any).filter('不存在的关键字')
    await settle()
    // 第一层节点自身参与过滤（Q1 语义）：筛空后整树 0 渲染、无占位块，
    // 子行窗口为空——vNodeWidth 走「展开但无可见子节点」的 base 分支
    expect(wrapper.findAll('.org-chart-node').length).toBe(0)
    expect(wrapper.findAll('.okr-v-spacer')).toHaveLength(0)
    ;(wrapper.vm as any).filter('')
    await settle()
    // 清空过滤词后恢复窗口化（不是全量 301——达标行回到 [0, 5) 窗口）
    expect(wrapper.findAll('.org-chart-node').length).toBe(6)
  })
  it('行整体在视口交叉轴之外：只渲染少量结构占位', async () => {
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(3000),
        nodeKey: 'id',
        labelWidth: 100,
        defaultExpandAll: true,
        virtual: true,
      },
    })
    await settle()
    // 把 Root 的子容器推到「视口下方 1 万 px」：交叉轴判定走离屏分支
    const container = wrapper.get('.org-chart-node-children')
    container.element.getBoundingClientRect = () =>
      ({
        top: 10000,
        bottom: 10001,
        left: 0,
        right: 100,
        width: 100,
        height: 1,
        x: 0,
        y: 10000,
        toJSON: () => ({}),
      }) as DOMRect
    await settle()
    const nodes = wrapper.findAll('.org-chart-node').length
    expect(nodes).toBeGreaterThan(1)
    expect(nodes).toBeLessThan(30)
  })

  it('scrollToNode 尾部节点：reveal 窗口 clamp 到列表末尾', async () => {
    const scrollSpy = vi.fn()
    Element.prototype.scrollIntoView = scrollSpy
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(3000),
        nodeKey: 'id',
        labelWidth: 100,
        defaultExpandAll: true,
        virtual: true,
      },
    })
    await settle()
    expect(await (wrapper.vm as any).scrollToNode(3000)).toBe(true)
    const labels = wrapper.findAll('.org-chart-node-label-inner')
    expect(labels.find((n) => n.text() === 'N3000')).toBeTruthy()
    // 末尾节点是真实末节点（:last-child 语义），其后再无占位块
    const rowChildren = wrapper.get('.org-chart-node-children').element.children
    expect(
      (rowChildren[rowChildren.length - 1] as HTMLElement).classList.contains('okr-v-spacer')
    ).toBe(false)
  })
})

describe('virtual 开启（horizontal，高度模型）', () => {
  beforeEach(() => resetWarnings())

  it('达标行按高度窗口化，占位块带高度并使用竖向连线类', async () => {
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(3000),
        nodeKey: 'id',
        direction: 'horizontal',
        labelWidth: 120,
        labelHeight: 40,
        defaultExpandAll: true,
        virtual: true,
      },
    })
    await settle()
    const nodes = wrapper.findAll('.org-chart-node')
    // 高度模型 60px/条：视口 300px 容 5 条 + overscan 2 = 7 个子节点 + 根
    expect(nodes.length).toBe(8)
    const spacer = wrapper.find('.okr-h-spacer')
    expect(spacer.exists()).toBe(true)
    expect(spacer.attributes('style')).toContain(`height: ${(3000 - 7) * 60}px`)
    // 缺 label-height 时警告并退回全量
    resetWarnings()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(VueOkrTree, {
      props: {
        data: makeData(100),
        nodeKey: 'id',
        direction: 'horizontal',
        labelWidth: 120,
        defaultExpandAll: true,
        virtual: true,
      },
    })
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('label-height'))
    warnSpy.mockRestore()
  })

  it('horizontal 嵌套：展开父的高度按模型参与窗口计算', async () => {
    const wrapper = mount(VueOkrTree, {
      props: {
        data: [
          {
            id: 0,
            label: 'Root',
            children: Array.from({ length: 60 }, (_, i) => ({
              id: i + 1,
              label: `P${i + 1}`,
              children: [{ id: (i + 1) * 100, label: 'Leaf' }],
            })),
          },
        ],
        nodeKey: 'id',
        direction: 'horizontal',
        labelWidth: 120,
        labelHeight: 40,
        defaultExpandAll: true,
        virtual: true,
      },
    })
    await settle()
    // 高度模型：叶 60px，展开父 = max(60, 60) = 60；视口 300px 容 5 条 + overscan
    const nodes = wrapper.findAll('.org-chart-node').length
    expect(nodes).toBeGreaterThan(1)
    expect(nodes).toBeLessThan(30)
    expect(wrapper.findAll('.okr-h-spacer').length).toBeGreaterThan(0)
  })

  it('OKR 左树：左行窗口化与占位块（leftWindow 路径）', async () => {
    const wrapper = mount(VueOkrTree, {
      props: {
        data: [
          {
            id: 1,
            label: 'OKR 根',
            children: [{ id: 11, label: 'R-1' }],
          },
        ],
        leftData: [
          {
            id: 1,
            label: 'O-根',
            children: Array.from({ length: 80 }, (_, i) => ({
              id: i + 2,
              label: `L${i + 1}`,
            })),
          },
        ],
        onlyBothTree: true,
        direction: 'horizontal',
        nodeKey: 'id',
        labelWidth: 120,
        labelHeight: 40,
        defaultExpandAll: true,
        virtual: true,
      },
    })
    await settle()
    // 左树 80 个可见兄弟 ≥ 阈值：左行窗口化，占位块走竖向连线类
    const leftSpacers = wrapper.findAll('.org-chart-node-left-children .okr-h-spacer')
    expect(leftSpacers.length).toBeGreaterThan(0)
    const nodes = wrapper.findAll('.org-chart-node').length
    expect(nodes).toBeGreaterThan(1)
    expect(nodes).toBeLessThan(60)
  })
})
