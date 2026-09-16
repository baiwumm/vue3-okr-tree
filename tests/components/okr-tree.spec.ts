import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { VueOkrTree } from '../../src/lib'
import type { TreeNode } from '../../src/lib'

const makeData = () => [
  {
    id: 1,
    label: 'xxx科技有限公司',
    children: [
      {
        id: 2,
        label: '产品研发部',
        children: [
          { id: 3, label: '研发-前端' },
          { id: 4, label: '研发-后端' },
        ],
      },
      { id: 6, label: '销售部', children: [{ id: 7, label: '销售一部' }] },
      { id: 9, label: '财务部' },
    ],
  },
]

const makeLeftData = () => [
  {
    id: 1,
    label: 'xxx科技有限公司',
    children: [
      { id: 12, label: '(左)产品研发部', children: [{ id: 13, label: '(左)研发-前端' }] },
      { id: 16, label: '(左)销售部' },
    ],
  },
]

const labels = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('.org-chart-node-label-inner').map((w) => w.text())

describe('渲染：三种模式', () => {
  it('垂直模式（默认）渲染全部节点', () => {
    const wrapper = mount(VueOkrTree, { props: { data: makeData() } })
    expect(wrapper.find('.org-chart-container').exists()).toBe(true)
    const rootChildren = wrapper.find('.org-chart-node-children')
    expect(rootChildren.classes()).toContain('vertical')
    expect(rootChildren.classes()).toContain('one-branch')
    expect(labels(wrapper)).toEqual([
      'xxx科技有限公司',
      '产品研发部',
      '研发-前端',
      '研发-后端',
      '销售部',
      '销售一部',
      '财务部',
    ])
    // 未开启 show-collapsable 时无展开按钮，且全部展开
    expect(wrapper.find('.org-chart-node-btn').exists()).toBe(false)
    expect(wrapper.findAll('.org-chart-node-children').length).toBeGreaterThan(1)
  })

  it('水平模式', () => {
    const wrapper = mount(VueOkrTree, { props: { data: makeData(), direction: 'horizontal' } })
    expect(wrapper.find('.org-chart-node-children').classes()).toContain('horizontal')
    expect(labels(wrapper)).toHaveLength(7)
  })

  it('多根数据不带 one-branch', () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: [{ label: 'A' }, { label: 'B' }] },
    })
    expect(wrapper.find('.org-chart-node-children').classes()).not.toContain('one-branch')
    expect(labels(wrapper)).toEqual(['A', 'B'])
  })

  it('OKR 模式渲染左右子树，根节点带 only-both-tree-node / align-root', () => {
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        leftData: makeLeftData(),
        onlyBothTree: true,
        direction: 'horizontal',
        nodeKey: 'id',
      },
    })
    const rootNode = wrapper.find('.org-chart-node')
    expect(rootNode.classes()).toContain('only-both-tree-node')
    expect(rootNode.classes()).toContain('align-root')
    const left = wrapper.find('.org-chart-node-left-children')
    expect(left.exists()).toBe(true)
    // 左树节点模板中子容器位于标签之前，DOM 顺序为 子 → 父 → 兄弟
    expect(left.findAll('.org-chart-node-label-inner').map((w) => w.text())).toEqual([
      '(左)研发-前端',
      '(左)产品研发部',
      '(左)销售部',
    ])
    expect(left.find('.org-chart-node').classes()).toContain('is-left-child-node')
    expect(labels(wrapper)).toHaveLength(10)
  })

  it('align-root=false 时不加 align-root 类', () => {
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        leftData: makeLeftData(),
        onlyBothTree: true,
        direction: 'horizontal',
        alignRoot: false,
      },
    })
    expect(wrapper.find('.org-chart-node').classes()).not.toContain('align-root')
  })

  it('OKR 模式缺 leftData 抛错', () => {
    expect(() =>
      mount(VueOkrTree, {
        props: { data: makeData(), onlyBothTree: true, direction: 'horizontal' },
      })
    ).toThrow('[Tree] leftData is required in onlyBothTree')
  })
})

describe('展开 / 折叠', () => {
  it('show-collapsable 默认折叠，点击按钮展开并触发 node-expand / node-collapse', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), showCollapsable: true, nodeKey: 'id' },
    })
    const rootNode = wrapper.find('.org-chart-node')
    // 原版语义：collapsed = !leftExpanded || !expanded，非 OKR 模式下 leftExpanded 恒为 false，
    // 该类常驻并由子容器连线覆盖其指示线，此处按原版保留，只断言按钮与容器状态
    expect(rootNode.classes()).toContain('collapsed')
    const btn = rootNode.find('.org-chart-node-btn')
    expect(btn.exists()).toBe(true)
    expect(btn.classes()).not.toContain('expanded')
    const children = rootNode.find('.org-chart-node-children')
    expect(children.attributes('style')).toContain('visibility: hidden')

    await btn.trigger('click')
    expect(wrapper.emitted('node-expand')).toHaveLength(1)
    const [data, node] = wrapper.emitted('node-expand')![0] as [any, TreeNode, any]
    expect(data.id).toBe(1)
    expect(node.expanded).toBe(true)
    expect(btn.classes()).toContain('expanded')
    expect(children.attributes('style') || '').not.toContain('visibility: hidden')

    await btn.trigger('click')
    expect(wrapper.emitted('node-collapse')).toHaveLength(1)
    expect(node.expanded).toBe(false)
    expect(btn.classes()).not.toContain('expanded')
    expect(children.attributes('style')).toContain('visibility: hidden')
  })

  it('default-expand-all 全部展开', () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), showCollapsable: true, defaultExpandAll: true },
    })
    expect(wrapper.find('.org-chart-node').classes()).not.toContain('collapsed')
    expect(wrapper.find('.org-chart-node-btn').classes()).toContain('expanded')
  })

  it('default-expanded-keys 展开指定节点及祖先', () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), showCollapsable: true, nodeKey: 'id', defaultExpandedKeys: [3] },
    })
    const vm = wrapper.vm as any
    expect(vm.getNode(1).expanded).toBe(true)
    expect(vm.getNode(2).expanded).toBe(true)
    expect(vm.getNode(3).expanded).toBe(true)
    expect(vm.getNode(6).expanded).toBe(false)
    const nodes = wrapper.findAll('.org-chart-node')
    const byLabel = (label: string) =>
      nodes.find((n) => n.find('.org-chart-node-label-inner').text() === label)!
    const childrenStyle = (label: string) =>
      byLabel(label).find('.org-chart-node-children').attributes('style') || ''
    expect(childrenStyle('xxx科技有限公司')).not.toContain('visibility: hidden')
    expect(childrenStyle('产品研发部')).not.toContain('visibility: hidden')
    expect(childrenStyle('销售部')).toContain('visibility: hidden')
  })

  it('show-node-num 在折叠态显示子节点数', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), showCollapsable: true, showNodeNum: true },
    })
    const btn = wrapper.find('.org-chart-node-btn')
    expect(btn.find('.org-chart-node-btn-text').text()).toBe('3')
    await btn.trigger('click')
    expect(btn.find('.org-chart-node-btn-text').exists()).toBe(false)
  })

  it('OKR 模式左侧按钮切换 leftExpanded 并触发事件', async () => {
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        leftData: makeLeftData(),
        onlyBothTree: true,
        direction: 'horizontal',
        showCollapsable: true,
        defaultExpandAll: true,
      },
    })
    const rootNode = wrapper.find('.org-chart-node')
    // 左树子节点的左按钮在 DOM 中位于根节点按钮之前，需通过根标签定位
    const leftBtn = rootNode.find('.is-root-label .org-chart-node-left-btn')
    expect(leftBtn.exists()).toBe(true)
    expect(leftBtn.classes()).toContain('expanded')
    await leftBtn.trigger('click')
    expect(wrapper.emitted('node-collapse')).toHaveLength(1)
    expect(leftBtn.classes()).not.toContain('expanded')
    expect(rootNode.find('.org-chart-node-left-children').attributes('style')).toContain(
      'visibility: hidden'
    )
    await leftBtn.trigger('click')
    expect(wrapper.emitted('node-expand')).toHaveLength(1)
  })
})

describe('选中与事件', () => {
  it('node-click 触发事件并设置 is-current / current-lable-class-name', async () => {
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        nodeKey: 'id',
        currentLableClassName: 'my-current',
        labelClassName: (node: TreeNode) => `lvl-${node.level}`,
      },
    })
    const inner = wrapper.findAll('.org-chart-node-label-inner')[1]
    expect(inner.classes()).toContain('lvl-2')
    await inner.trigger('click')
    const emitted = wrapper.emitted('node-click')!
    expect(emitted).toHaveLength(1)
    const [data, node, comp] = emitted[0] as [any, TreeNode, any]
    expect(data.label).toBe('产品研发部')
    expect(node.isCurrent).toBe(true)
    expect(comp).toBeTruthy()
    expect(inner.classes()).toContain('is-current')
    expect(inner.classes()).toContain('my-current')

    const vm = wrapper.vm as any
    expect(vm.getCurrentKey()).toBe(2)
    expect(vm.getCurrentNode().label).toBe('产品研发部')
    vm.setCurrentKey(null)
    await nextTick()
    expect(inner.classes()).not.toContain('is-current')
    expect(vm.getCurrentKey()).toBeNull()
  })

  it('setCurrentKey / setCurrentNode / current-node-key', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), nodeKey: 'id', currentNodeKey: 9 },
    })
    const vm = wrapper.vm as any
    expect(vm.getCurrentKey()).toBe(9)
    vm.setCurrentKey(3)
    await nextTick()
    expect(vm.getCurrentKey()).toBe(3)
    const current = wrapper
      .findAll('.org-chart-node-label-inner')
      .filter((w) => w.classes().includes('is-current'))
    expect(current).toHaveLength(1)
    expect(current[0].text()).toBe('研发-前端')
    vm.setCurrentNode(vm.getNode(7))
    expect(vm.getCurrentKey()).toBe(7)
  })

  it('禁用节点不可选中、不触发 node-click', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: [{ label: 'A', disabled: true }, { label: 'B' }] },
    })
    const [a, b] = wrapper.findAll('.org-chart-node-label-inner')
    expect(a.classes()).toContain('is-disabled')
    await a.trigger('click')
    expect(wrapper.emitted('node-click')).toBeUndefined()
    await b.trigger('click')
    expect(wrapper.emitted('node-click')).toHaveLength(1)
  })

  it('node-contextmenu：外部绑定时阻止默认菜单，未绑定时不阻止', async () => {
    const bound = mount(VueOkrTree, {
      props: { data: makeData(), onNodeContextmenu: vi.fn() },
    })
    const evt = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    bound.find('.org-chart-node').element.dispatchEvent(evt)
    await nextTick()
    expect(evt.defaultPrevented).toBe(true)
    expect(bound.emitted('node-contextmenu')).toHaveLength(1)
    const [event, data, node] = bound.emitted('node-contextmenu')![0] as any[]
    expect(event).toBe(evt)
    expect(data.id).toBe(1)
    expect(node.level).toBe(1)

    const unbound = mount(VueOkrTree, { props: { data: makeData() } })
    const evt2 = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    unbound.find('.org-chart-node').element.dispatchEvent(evt2)
    expect(evt2.defaultPrevented).toBe(false)
  })

  it('缺 node-key 时相关方法抛错（文案与原版一致）', () => {
    const wrapper = mount(VueOkrTree, { props: { data: makeData() } })
    const vm = wrapper.vm as any
    expect(() => vm.setCurrentKey(1)).toThrow('[Tree] nodeKey is required in setCurrentKey')
    expect(() => vm.getCurrentKey()).toThrow('[Tree] nodeKey is required in getCurrentKey')
    expect(() => vm.setCurrentNode(vm.root.childNodes[0])).toThrow(
      '[Tree] nodeKey is required in setCurrentNode'
    )
    expect(() => vm.updateKeyChildren(1, [])).toThrow(
      '[Tree] nodeKey is required in updateKeyChild'
    )
    expect(() => vm.filter('x')).toThrow('[Tree] filterNodeMethod is required when filter')
  })
})

describe('filter', () => {
  const filterNode = (value: string, data: any) => (!value ? true : data.label.includes(value))

  it('过滤后隐藏不匹配节点，空值恢复', async () => {
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        nodeKey: 'id',
        filterNodeMethod: filterNode,
        direction: 'horizontal',
      },
    })
    const vm = wrapper.vm as any
    vm.filter('前端')
    await nextTick()
    expect(labels(wrapper)).toEqual(['xxx科技有限公司', '产品研发部', '研发-前端'])
    vm.filter('')
    await nextTick()
    expect(labels(wrapper)).toHaveLength(7)
  })

  it('OKR 模式同时过滤左右子树', async () => {
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        leftData: makeLeftData(),
        onlyBothTree: true,
        direction: 'horizontal',
        nodeKey: 'id',
        filterNodeMethod: filterNode,
      },
    })
    const vm = wrapper.vm as any
    vm.filter('销售')
    await nextTick()
    expect(labels(wrapper)).toEqual(['(左)销售部', 'xxx科技有限公司', '销售部', '销售一部'])
  })
})

describe('自定义内容', () => {
  it('render-content 收到 (h, node) 并渲染', () => {
    const renderContent = vi.fn((createElement: typeof h, node: TreeNode) =>
      createElement('div', { class: 'custom' }, [
        createElement('b', node.label),
        createElement('i', node.data.id),
      ])
    )
    const wrapper = mount(VueOkrTree, {
      props: { data: [{ id: 1, label: 'Root' }], renderContent },
    })
    expect(renderContent).toHaveBeenCalled()
    expect(renderContent.mock.calls[0][0]).toBe(h)
    expect(renderContent.mock.calls[0][1].label).toBe('Root')
    expect(wrapper.find('.custom b').text()).toBe('Root')
    expect(wrapper.find('.custom i').text()).toBe('1')
  })

  it('node-btn-content 自定义按钮内容', () => {
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        showCollapsable: true,
        nodeBtnContent: (createElement: typeof h, node: TreeNode) =>
          createElement('span', { class: 'my-btn' }, node.expanded ? '-' : '+'),
      },
    })
    expect(wrapper.find('.org-chart-node-btn .my-btn').text()).toBe('+')
  })

  it('默认作用域插槽 #default="{ node, data }"', () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: [{ id: 1, label: 'Root', extra: 'X' }] },
      slots: {
        default: ({ node, data }: any) => h('em', `${node.label}/${data.extra}`),
      },
    })
    expect(wrapper.find('.org-chart-node-label-inner em').text()).toBe('Root/X')
  })

  it('label-width / label-height：number → px，string 原样', () => {
    const w1 = mount(VueOkrTree, {
      props: { data: [{ label: 'A' }], labelWidth: 120, labelHeight: 40 },
    })
    const style1 = w1.find('.org-chart-node-label-inner').attributes('style')!
    expect(style1).toContain('width: 120px')
    expect(style1).toContain('height: 40px')
    const w2 = mount(VueOkrTree, { props: { data: [{ label: 'A' }], labelWidth: '50%' } })
    expect(w2.find('.org-chart-node-label-inner').attributes('style')).toContain('width: 50%')
  })
})

describe('数据响应', () => {
  it('替换 data 引用后重新渲染', async () => {
    const wrapper = mount(VueOkrTree, { props: { data: makeData(), nodeKey: 'id' } })
    await wrapper.setProps({ data: [{ id: 100, label: 'New' }] })
    expect(labels(wrapper)).toEqual(['New'])
  })

  it('响应式 data 原地 push / 异步修改后视图更新（Q4）', async () => {
    const Parent = defineComponent({
      setup() {
        const data = ref(makeData())
        return { data }
      },
      render() {
        return h(VueOkrTree, { data: this.data, nodeKey: 'id', ref: 'tree' })
      },
    })
    const wrapper = mount(Parent)
    expect(labels(wrapper)).toHaveLength(7)
    const data = (wrapper.vm as any).data
    data[0].children.push({ id: 50, label: '新部门' })
    await nextTick()
    expect(labels(wrapper)).toContain('新部门')
    data[0].children.splice(0, 1)
    await nextTick()
    expect(labels(wrapper)).not.toContain('产品研发部')
    expect(labels(wrapper)).toHaveLength(5)
  })

  it('append / remove / insertBefore 等方法驱动视图更新', async () => {
    const wrapper = mount(VueOkrTree, { props: { data: makeData(), nodeKey: 'id' } })
    const vm = wrapper.vm as any
    vm.append({ id: 60, label: '新增' }, 6)
    await nextTick()
    expect(labels(wrapper)).toContain('新增')
    vm.remove(2)
    await nextTick()
    expect(labels(wrapper)).not.toContain('产品研发部')
    vm.insertBefore({ id: 61, label: '总部' }, 6)
    await nextTick()
    const l = labels(wrapper)
    expect(l.indexOf('总部')).toBe(l.indexOf('销售部') - 1)
    vm.updateKeyChildren(6, [{ id: 70, label: '销售三部' }])
    await nextTick()
    expect(labels(wrapper)).toContain('销售三部')
    expect(labels(wrapper)).not.toContain('销售一部')
  })

  it('leftData 更新后左子树更新，右树 data 更新后左子树不丢失', async () => {
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        leftData: makeLeftData(),
        onlyBothTree: true,
        direction: 'horizontal',
        nodeKey: 'id',
      },
    })
    await wrapper.setProps({
      leftData: [{ id: 1, label: 'L', children: [{ id: 99, label: '新左' }] }],
    })
    const leftLabels = () =>
      wrapper
        .find('.org-chart-node-left-children')
        .findAll('.org-chart-node-label-inner')
        .map((w) => w.text())
    expect(leftLabels()).toEqual(['新左'])
    await wrapper.setProps({
      data: [{ id: 1, label: 'Right2', children: [{ id: 300, label: 'R' }] }],
    })
    expect(leftLabels()).toEqual(['新左'])
    expect(labels(wrapper)).toContain('Right2')
  })
})
