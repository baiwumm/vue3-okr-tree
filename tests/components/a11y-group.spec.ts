import { describe, it, expect, expectTypeOf } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, markRaw, nextTick } from 'vue'
import { VueOkrTree, OkrTreeGroup, createTypedOkrTree, type TreeNode } from '../../src/lib'

const makeData = () => [
  {
    id: 1,
    label: 'A',
    children: [
      { id: 2, label: 'B', children: [{ id: 3, label: 'C' }] },
      { id: 4, label: 'D' },
    ],
  },
]
const makeLeft = () => [
  { id: 1, label: 'A', children: [{ id: 12, label: 'L', children: [{ id: 13, label: 'LC' }] }] },
]

// 左树节点的子容器位于标签之前，需取节点自身的标签（:scope > 标签）
const ownLabel = (n: any) =>
  n.find(':scope > .org-chart-node-label .org-chart-node-label-inner').text()
const itemByLabel = (w: any, label: string) =>
  w.findAll('.org-chart-node[role="treeitem"]').find((n: any) => ownLabel(n) === label)!
// 真实 <transition> 不产生包装元素；VTU 默认的 transition-stub 会破坏 `>` 选择器
const noTransitionStub = { global: { stubs: { transition: false } } }

describe('可访问性：ARIA 属性', () => {
  it('树 / treeitem / group 角色与 aria-level / aria-expanded / aria-selected', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), nodeKey: 'id', showCollapsable: true, defaultExpandedKeys: [1] },
    })
    expect(wrapper.find('[role="tree"]').exists()).toBe(true)
    const a = itemByLabel(wrapper, 'A')
    expect(a.attributes('aria-level')).toBe('1')
    expect(a.attributes('aria-expanded')).toBe('true')
    expect(a.attributes('aria-selected')).toBe('false')
    const b = itemByLabel(wrapper, 'B')
    expect(b.attributes('aria-level')).toBe('2')
    expect(b.attributes('aria-expanded')).toBe('false')
    const d = itemByLabel(wrapper, 'D')
    expect(d.attributes('aria-expanded')).toBeUndefined()
    expect(a.find('.org-chart-node-children').attributes('role')).toBe('group')
    expect(a.find('.org-chart-node-btn').attributes('aria-hidden')).toBe('true')

    await a.find('.org-chart-node-label-inner').trigger('click')
    expect(a.attributes('aria-selected')).toBe('true')
  })

  it('禁用节点 aria-disabled', () => {
    const wrapper = mount(VueOkrTree, { props: { data: [{ label: 'X', disabled: true }] } })
    expect(wrapper.find('[role="treeitem"]').attributes('aria-disabled')).toBe('true')
  })

  it('漫游 tabindex：初始第一个根节点为 0，其余 -1；聚焦后转移', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), nodeKey: 'id' },
      attachTo: document.body,
    })
    expect(itemByLabel(wrapper, 'A').attributes('tabindex')).toBe('0')
    expect(itemByLabel(wrapper, 'B').attributes('tabindex')).toBe('-1')
    await itemByLabel(wrapper, 'B').trigger('focus')
    expect(itemByLabel(wrapper, 'B').attributes('tabindex')).toBe('0')
    expect(itemByLabel(wrapper, 'A').attributes('tabindex')).toBe('-1')
    wrapper.unmount()
  })
})

describe('可访问性：键盘导航', () => {
  const mountTree = (extra: Record<string, any> = {}) =>
    mount(VueOkrTree, {
      props: {
        data: makeData(),
        nodeKey: 'id',
        showCollapsable: true,
        defaultExpandAll: true,
        ...extra,
      },
      attachTo: document.body,
    })

  it('ArrowDown / ArrowUp / Home / End 沿可见节点移动焦点', async () => {
    const wrapper = mountTree()
    const a = itemByLabel(wrapper, 'A')
    ;(a.element as HTMLElement).focus()
    await a.trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(itemByLabel(wrapper, 'B').element)
    await itemByLabel(wrapper, 'B').trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(itemByLabel(wrapper, 'C').element)
    await itemByLabel(wrapper, 'C').trigger('keydown', { key: 'ArrowUp' })
    expect(document.activeElement).toBe(itemByLabel(wrapper, 'B').element)
    await itemByLabel(wrapper, 'B').trigger('keydown', { key: 'End' })
    expect(document.activeElement).toBe(itemByLabel(wrapper, 'D').element)
    await itemByLabel(wrapper, 'D').trigger('keydown', { key: 'Home' })
    expect(document.activeElement).toBe(itemByLabel(wrapper, 'A').element)
    wrapper.unmount()
  })

  it('收起容器中的节点不参与方向键遍历', async () => {
    const wrapper = mountTree({ defaultExpandAll: false, defaultExpandedKeys: [1] })
    // A 展开（B、D 可见），B 收起（C 不可见）
    const b = itemByLabel(wrapper, 'B')
    ;(b.element as HTMLElement).focus()
    await b.trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(itemByLabel(wrapper, 'D').element)
    wrapper.unmount()
  })

  it('ArrowRight 展开或进入子节点，ArrowLeft 收起或回到父节点，并触发事件 / v-model', async () => {
    const wrapper = mountTree({ defaultExpandAll: false, expandedKeys: [] })
    const a = itemByLabel(wrapper, 'A')
    ;(a.element as HTMLElement).focus()
    await a.trigger('keydown', { key: 'ArrowRight' })
    expect((wrapper.vm as any).getNode(1).expanded).toBe(true)
    expect(wrapper.emitted('node-expand')).toHaveLength(1)
    expect(wrapper.emitted('update:expandedKeys')![0][0]).toEqual([1])
    // 已展开 → 进入第一个子节点
    await a.trigger('keydown', { key: 'ArrowRight' })
    expect(document.activeElement).toBe(itemByLabel(wrapper, 'B').element)
    // 子节点 ← 无展开子树 → 回到父节点
    await itemByLabel(wrapper, 'B').trigger('keydown', { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(itemByLabel(wrapper, 'A').element)
    // 父节点 ← 已展开 → 收起
    await a.trigger('keydown', { key: 'ArrowLeft' })
    expect((wrapper.vm as any).getNode(1).expanded).toBe(false)
    expect(wrapper.emitted('node-collapse')).toHaveLength(1)
    wrapper.unmount()
  })

  it('Enter / Space 选中节点并触发 node-click', async () => {
    const wrapper = mountTree()
    const b = itemByLabel(wrapper, 'B')
    await b.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('node-click')).toHaveLength(1)
    expect((wrapper.vm as any).getCurrentKey()).toBe(2)
    await itemByLabel(wrapper, 'D').trigger('keydown', { key: ' ' })
    expect((wrapper.vm as any).getCurrentKey()).toBe(4)
    wrapper.unmount()
  })

  it('OKR 模式：根节点 ← 进入左子树；左树节点 → 回到根节点', async () => {
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        leftData: makeLeft(),
        onlyBothTree: true,
        direction: 'horizontal',
        showCollapsable: true,
        defaultExpandAll: true,
        nodeKey: 'id',
      },
      attachTo: document.body,
      ...noTransitionStub,
    })
    const root = itemByLabel(wrapper, 'A')
    ;(root.element as HTMLElement).focus()
    await root.trigger('keydown', { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(itemByLabel(wrapper, 'L').element)
    await itemByLabel(wrapper, 'L').trigger('keydown', { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(itemByLabel(wrapper, 'LC').element)
    await itemByLabel(wrapper, 'LC').trigger('keydown', { key: 'ArrowRight' })
    expect(document.activeElement).toBe(itemByLabel(wrapper, 'L').element)
    // L 有展开子树：→ 先收起
    await itemByLabel(wrapper, 'L').trigger('keydown', { key: 'ArrowRight' })
    expect((wrapper.vm as any).store.leftNodesMap[12].leftExpanded).toBe(false)
    // 再 → 回到根节点
    await itemByLabel(wrapper, 'L').trigger('keydown', { key: 'ArrowRight' })
    expect(document.activeElement).toBe(root.element)
    wrapper.unmount()
  })

  it('焦点在节点内部控件时不拦截按键', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), nodeKey: 'id' },
      slots: { default: () => h('input', { class: 'inner' }) },
      attachTo: document.body,
    })
    const input = wrapper.find('input.inner')
    ;(input.element as HTMLElement).focus()
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('node-click')).toBeUndefined()
    wrapper.unmount()
  })
})

describe('node-component', () => {
  const Card = markRaw(
    defineComponent({
      props: { node: { type: Object, required: true }, data: { type: Object, required: true } },
      setup(props) {
        return () =>
          h(
            'b',
            { class: 'card' },
            `${(props.data as any).label}@${(props.node as TreeNode).level}`
          )
      },
    })
  )

  it('以 { node, data } 渲染组件', () => {
    const wrapper = mount(VueOkrTree, { props: { data: makeData(), nodeComponent: Card } })
    expect(wrapper.findAll('.card').map((c) => c.text())).toEqual(['A@1', 'B@2', 'C@3', 'D@2'])
  })

  it('优先级：#default 插槽 > node-component > render-content', () => {
    const renderContent = (hh: typeof h, node: TreeNode) => hh('i', { class: 'rc' }, node.label)
    const both = mount(VueOkrTree, {
      props: { data: [{ label: 'X' }], nodeComponent: Card, renderContent },
    })
    expect(both.find('.card').exists()).toBe(true)
    expect(both.find('.rc').exists()).toBe(false)
    const withSlot = mount(VueOkrTree, {
      props: { data: [{ label: 'X' }], nodeComponent: Card, renderContent },
      slots: { default: ({ data }: any) => h('u', { class: 'sl' }, data.label) },
    })
    expect(withSlot.find('.sl').text()).toBe('X')
    expect(withSlot.find('.card').exists()).toBe(false)
    const onlyRender = mount(VueOkrTree, { props: { data: [{ label: 'X' }], renderContent } })
    expect(onlyRender.find('.rc').text()).toBe('X')
  })
})

describe('OkrTreeGroup', () => {
  const okrProps = (left: any[]) => ({
    data: makeData(),
    leftData: left,
    onlyBothTree: true,
    direction: 'horizontal' as const,
    showCollapsable: true,
    defaultExpandAll: true,
    nodeKey: 'id',
  })

  it('测量组内左子树容器最大宽度并写入 --okr-group-left-width', async () => {
    // jsdom 无布局：按左容器内节点数模拟宽度
    const original = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = function (this: Element) {
      const rect = original.call(this)
      if (this.classList.contains('org-chart-node-left-children')) {
        return { ...rect, width: this.querySelectorAll('.org-chart-node').length * 100 } as DOMRect
      }
      return rect
    }
    try {
      const wrapper = mount(
        defineComponent({
          render: () =>
            h(OkrTreeGroup, { ref: 'group' }, () => [
              h(VueOkrTree, okrProps([{ id: 1, label: 'A', children: [{ id: 12, label: 'L' }] }])),
              h(VueOkrTree, okrProps(makeLeft())),
            ]),
        }),
        { attachTo: document.body, ...noTransitionStub }
      )
      await nextTick()
      await nextTick()
      const group = wrapper.find('.okr-tree-group')
      expect(group.classes()).toContain('is-measured')
      expect(group.classes()).not.toContain('is-measuring')
      // 第二棵树左侧 2 个节点 → 200px
      expect(group.attributes('style')).toContain('--okr-group-left-width: 200px')
      expect(typeof (wrapper.vm.$refs.group as any).refresh).toBe('function')
      wrapper.unmount()
    } finally {
      Element.prototype.getBoundingClientRect = original
    }
  })

  it('align=false 时不测量；组内无 OKR 树时不加 is-measured', async () => {
    const off = mount(OkrTreeGroup, {
      props: { align: false },
      slots: { default: () => h(VueOkrTree, okrProps(makeLeft())) },
      ...noTransitionStub,
    })
    await nextTick()
    expect(off.find('.okr-tree-group').classes()).not.toContain('is-measured')
    const plain = mount(OkrTreeGroup, {
      slots: { default: () => h(VueOkrTree, { data: makeData() }) },
    })
    await nextTick()
    await nextTick()
    expect(plain.find('.okr-tree-group').classes()).not.toContain('is-measured')
  })
})

describe('createTypedOkrTree<T>', () => {
  it('运行时返回同一组件，类型层收窄 data 与插槽作用域', () => {
    interface Dept {
      id: number
      label: string
      leader?: string
    }
    const DeptTree = createTypedOkrTree<Dept>()
    expect(DeptTree).toBe(VueOkrTree)
    type Inst = InstanceType<typeof DeptTree>
    expectTypeOf<Inst['$props']['data']>().toEqualTypeOf<Dept[]>()
    expectTypeOf<NonNullable<Inst['$slots']['default']>>()
      .parameter(0)
      .toHaveProperty('data')
      .toEqualTypeOf<Dept>()
    const wrapper = mount(DeptTree as any, {
      props: { data: [{ id: 1, label: 'X', leader: 'Y' }] },
    })
    expect(wrapper.text()).toContain('X')
  })
})
