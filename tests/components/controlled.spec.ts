import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { VueOkrTree, type TreeKey, type VueOkrTreeInstance } from '../../src/lib'
import { resetWarnings } from '../../src/lib/okr-tree/model/util'

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

const labels = (w: any) => w.findAll('.org-chart-node-label-inner').map((x: any) => x.text())
const nodeByLabel = (w: any, label: string) =>
  w
    .findAll('.org-chart-node')
    .find((n: any) => n.find('.org-chart-node-label-inner').text() === label)!

describe('v-model:expanded-keys（受控展开）', () => {
  it('传入 expandedKeys 时按列表展开，其余收起；点击按钮触发 update:expandedKeys', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), nodeKey: 'id', showCollapsable: true, expandedKeys: [1] },
    })
    const vm = wrapper.vm as any
    expect(vm.getNode(1).expanded).toBe(true)
    expect(vm.getNode(2).expanded).toBe(false)

    const btnB = nodeByLabel(wrapper, 'B').find('.org-chart-node-btn')
    await btnB.trigger('click')
    const emitted = wrapper.emitted('update:expandedKeys')!
    expect(emitted).toHaveLength(1)
    expect([...(emitted[0][0] as TreeKey[])].sort()).toEqual([1, 2])
    // 同时仍触发原有 node-expand
    expect(wrapper.emitted('node-expand')).toHaveLength(1)
  })

  it('父组件更新 expandedKeys 后同步展开态（双向）', async () => {
    const Parent = defineComponent({
      setup() {
        const keys = ref<TreeKey[]>([1])
        return { keys }
      },
      render() {
        return h(VueOkrTree, {
          data: makeData(),
          nodeKey: 'id',
          showCollapsable: true,
          expandedKeys: this.keys,
          'onUpdate:expandedKeys': (v: TreeKey[]) => (this.keys = v),
          ref: 'tree',
        })
      },
    })
    const wrapper = mount(Parent)
    const vm = wrapper.vm as any
    const tree = vm.$refs.tree as VueOkrTreeInstance
    // 父 → 子
    vm.keys = [1, 2]
    await nextTick()
    expect(tree.getNode(2)!.expanded).toBe(true)
    vm.keys = []
    await nextTick()
    expect(tree.getNode(1)!.expanded).toBe(false)
    // 子 → 父（点击根按钮展开）
    await nodeByLabel(wrapper, 'A').find('.org-chart-node-btn').trigger('click')
    expect(vm.keys).toEqual([1])
    // 方法调用也回写
    tree.expandAll()
    await nextTick()
    expect([...vm.keys].sort()).toEqual([1, 2, 3, 4])
    tree.collapseAll()
    await nextTick()
    expect(vm.keys).toEqual([])
  })

  it('未传 expandedKeys 时不触发 update:expandedKeys（非受控）', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), nodeKey: 'id', showCollapsable: true },
    })
    await nodeByLabel(wrapper, 'A').find('.org-chart-node-btn').trigger('click')
    expect(wrapper.emitted('update:expandedKeys')).toBeUndefined()
  })
})

describe('v-model:current-key（受控选中）', () => {
  it('初始选中、点击回写、父组件更新同步', async () => {
    const Parent = defineComponent({
      setup() {
        const current = ref<TreeKey | null>(4)
        return { current }
      },
      render() {
        return h(VueOkrTree, {
          data: makeData(),
          nodeKey: 'id',
          currentKey: this.current,
          'onUpdate:currentKey': (v: TreeKey | null) => (this.current = v),
          ref: 'tree',
        })
      },
    })
    const wrapper = mount(Parent)
    const vm = wrapper.vm as any
    const tree = vm.$refs.tree as VueOkrTreeInstance
    expect(tree.getCurrentKey()).toBe(4)
    expect(nodeByLabel(wrapper, 'D').find('.org-chart-node-label-inner').classes()).toContain(
      'is-current'
    )

    await nodeByLabel(wrapper, 'B').find('.org-chart-node-label-inner').trigger('click')
    expect(vm.current).toBe(2)

    vm.current = null
    await nextTick()
    expect(tree.getCurrentKey()).toBeNull()
    expect(wrapper.findAll('.is-current')).toHaveLength(0)

    tree.setCurrentKey(3)
    await nextTick()
    expect(vm.current).toBe(3)
  })
})

describe('新增方法', () => {
  it('expandNode / collapseNode 驱动视图', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), nodeKey: 'id', showCollapsable: true },
    })
    const vm = wrapper.vm as any
    vm.expandNode(3)
    await nextTick()
    const childrenOf = (label: string) =>
      nodeByLabel(wrapper, label).find('.org-chart-node-children').attributes('style') || ''
    expect(childrenOf('A')).not.toContain('visibility: hidden')
    expect(childrenOf('B')).not.toContain('visibility: hidden')
    vm.collapseNode(2)
    await nextTick()
    expect(childrenOf('B')).toContain('visibility: hidden')
    expect(childrenOf('A')).not.toContain('visibility: hidden')
  })

  it('scrollToNode 展开祖先并调用 scrollIntoView', async () => {
    const scrollSpy = vi.fn()
    Element.prototype.scrollIntoView = scrollSpy
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), nodeKey: 'id', showCollapsable: true },
      attachTo: document.body,
    })
    const vm = wrapper.vm as any
    expect(vm.getNode(2).expanded).toBe(false)
    const ok = await vm.scrollToNode(3, { behavior: 'auto' })
    expect(ok).toBe(true)
    expect(vm.getNode(2).expanded).toBe(true)
    expect(vm.getNode(1).expanded).toBe(true)
    expect(scrollSpy).toHaveBeenCalledTimes(1)
    expect(scrollSpy.mock.calls[0][0]).toMatchObject({ behavior: 'auto', block: 'center' })
    const target = scrollSpy.mock.instances[0] as HTMLElement
    expect(target.querySelector('.org-chart-node-label-inner')?.textContent).toBe('C')
    expect(await vm.scrollToNode(999)).toBe(false)
    wrapper.unmount()
  })
})

describe('插槽', () => {
  it('#expand-btn 替代 node-btn-content，收到 node / data / expanded / side', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), nodeKey: 'id', showCollapsable: true },
      slots: {
        'expand-btn': ({ expanded, side, data }: any) =>
          h('i', { class: 'my-btn' }, `${side}:${data.id}:${expanded ? '-' : '+'}`),
      },
    })
    const btn = nodeByLabel(wrapper, 'A').find('.org-chart-node-btn .my-btn')
    expect(btn.text()).toBe('right:1:+')
    await nodeByLabel(wrapper, 'A').find('.org-chart-node-btn').trigger('click')
    expect(nodeByLabel(wrapper, 'A').find('.org-chart-node-btn .my-btn').text()).toBe('right:1:-')
    // 递归透传到子节点
    expect(nodeByLabel(wrapper, 'B').find('.org-chart-node-btn .my-btn').text()).toBe('right:2:+')
  })

  it('OKR 模式左按钮的 side 为 left', () => {
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        leftData: [{ id: 1, label: 'A', children: [{ id: 12, label: 'L' }] }],
        onlyBothTree: true,
        direction: 'horizontal',
        showCollapsable: true,
        nodeKey: 'id',
      },
      slots: { 'expand-btn': ({ side }: any) => h('i', { class: 'my-btn' }, side) },
    })
    expect(wrapper.find('.is-root-label .org-chart-node-left-btn .my-btn').text()).toBe('left')
    expect(wrapper.find('.is-root-label .org-chart-node-btn .my-btn').text()).toBe('right')
  })

  it('show-node-num 优先于 #expand-btn（折叠时显示数字）', () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), showCollapsable: true, showNodeNum: true },
      slots: { 'expand-btn': () => h('i', { class: 'my-btn' }, 'x') },
    })
    const btn = wrapper.find('.org-chart-node-btn')
    expect(btn.find('.org-chart-node-btn-text').text()).toBe('2')
    expect(btn.find('.my-btn').exists()).toBe(false)
  })

  it('#empty 在 data 为空时渲染', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: [] },
      slots: { empty: () => h('p', { class: 'empty-tip' }, '暂无数据') },
    })
    expect(wrapper.find('.org-chart-empty .empty-tip').text()).toBe('暂无数据')
    await wrapper.setProps({ data: makeData() })
    expect(wrapper.find('.org-chart-empty').exists()).toBe(false)
    expect(labels(wrapper)).toHaveLength(4)
  })
})

describe('组件级开发期警告', () => {
  beforeEach(() => resetWarnings())

  it('onlyBothTree 非 horizontal、leftData 未开 onlyBothTree、受控 prop 缺 node-key 时警告', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(VueOkrTree, {
      props: {
        data: makeData(),
        leftData: [{ id: 1, label: 'A' }],
        onlyBothTree: true,
        direction: 'vertical',
      },
    })
    mount(VueOkrTree, { props: { data: makeData(), leftData: [{ id: 1, label: 'A' }] } })
    mount(VueOkrTree, { props: { data: makeData(), expandedKeys: [1], currentKey: 1 } })
    const messages = spy.mock.calls.map((c) => String(c[0]))
    expect(messages.some((m) => m.includes('onlyBothTree 仅在 direction="horizontal"'))).toBe(true)
    expect(messages.some((m) => m.includes('leftData 会被忽略'))).toBe(true)
    expect(messages.some((m) => m.includes('expanded-keys'))).toBe(true)
    expect(messages.some((m) => m.includes('current-key'))).toBe(true)
    spy.mockRestore()
  })

  it('配置正确时无警告', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(VueOkrTree, {
      props: {
        data: makeData(),
        nodeKey: 'id',
        expandedKeys: [1],
        currentKey: null,
        showCollapsable: true,
      },
    })
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
