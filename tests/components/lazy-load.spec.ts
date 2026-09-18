import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { VueOkrTree, type TreeKey, type VueOkrTreeInstance } from '../../src/lib'
import { resetWarnings } from '../../src/lib/okr-tree/model/util'

const makeLazyData = () => [
  { id: 1, label: 'A' },
  { id: 2, label: 'B', leaf: true },
]

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0))

const labels = (w: any) => w.findAll('.org-chart-node-label-inner').map((x: any) => x.text())
const nodeByLabel = (w: any, label: string) =>
  w
    .findAll('.org-chart-node')
    .find((n: any) => n.find('.org-chart-node-label-inner').text() === label)!

describe('懒加载：组件交互', () => {
  it('点击展开按钮出现 is-loading，resolve 后渲染子节点并展开', async () => {
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeLazyData(),
        nodeKey: 'id',
        showCollapsable: true,
        lazy: true,
        load: (node: any, resolve: (c: any[]) => void) => {
          setTimeout(() => resolve([{ id: 11, label: 'A-子' }]), 0)
        },
      },
    })
    const btn = nodeByLabel(wrapper, 'A').find('.org-chart-node-btn')
    expect(btn.exists()).toBe(true) // 未加载节点也有展开按钮
    await btn.trigger('click')
    expect(nodeByLabel(wrapper, 'A').find('.org-chart-node-btn').classes()).toContain('is-loading')
    expect(labels(wrapper)).toEqual(['A', 'B'])

    await flushMicrotasks()
    await nextTick()
    expect(labels(wrapper)).toEqual(['A', 'A-子', 'B'])
    expect(nodeByLabel(wrapper, 'A').find('.org-chart-node-btn').classes()).not.toContain(
      'is-loading'
    )
  })

  it('reject 后按钮回到折叠态，可再次点击重试', async () => {
    let attempts = 0
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeLazyData(),
        nodeKey: 'id',
        showCollapsable: true,
        lazy: true,
        load: (node: any, resolve: (c: any[]) => void, reject?: () => void) => {
          attempts++
          setTimeout(() => (attempts === 1 ? reject?.() : resolve([{ id: 11, label: 'A-子' }])), 0)
        },
      },
    })
    const btn = () => nodeByLabel(wrapper, 'A').find('.org-chart-node-btn')
    await btn().trigger('click')
    await flushMicrotasks()
    await nextTick()
    expect(labels(wrapper)).toEqual(['A', 'B']) // 无子节点
    await btn().trigger('click')
    await flushMicrotasks()
    await nextTick()
    expect(attempts).toBe(2)
    expect(labels(wrapper)).toEqual(['A', 'A-子', 'B'])
  })

  it('show-node-num 未加载时不显示数字，加载后显示', async () => {
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeLazyData(),
        nodeKey: 'id',
        showCollapsable: true,
        showNodeNum: true,
        lazy: true,
        load: (node: any, resolve: (c: any[]) => void) => {
          setTimeout(() => resolve([{ id: 11, label: 'A-子' }]), 0)
        },
      },
    })
    const btn = nodeByLabel(wrapper, 'A').find('.org-chart-node-btn')
    expect(btn.find('.org-chart-node-btn-text').exists()).toBe(false)
    await flushMicrotasks()
    // 未点开过不加载，数字保持隐藏；手动展开后加载完成再显示
    await btn.trigger('click')
    await flushMicrotasks()
    await nextTick()
    await nodeByLabel(wrapper, 'A').find('.org-chart-node-btn').trigger('click') // 收起
    await nextTick()
    expect(
      nodeByLabel(wrapper, 'A').find('.org-chart-node-btn .org-chart-node-btn-text').text()
    ).toBe('1')
  })

  it('#expand-btn 作用域包含 loading', async () => {
    const scopes: any[] = []
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeLazyData(),
        nodeKey: 'id',
        showCollapsable: true,
        lazy: true,
        load: (node: any, resolve: (c: any[]) => void) => {
          setTimeout(() => resolve([{ id: 11, label: 'A-子' }]), 0)
        },
      },
      slots: {
        'expand-btn': (scope: any) => {
          scopes.push(scope)
          return h('i', { class: 'my-btn' }, scope.loading ? '…' : '+')
        },
      },
    })
    await nodeByLabel(wrapper, 'A').find('.org-chart-node-btn').trigger('click')
    expect(scopes[scopes.length - 1].loading).toBe(true)
    await flushMicrotasks()
    await nextTick()
    expect(scopes[scopes.length - 1].loading).toBe(false)
  })

  it('expandNode / scrollToNode 对未加载节点先加载再展开/滚动', async () => {
    const scrollSpy = vi.fn()
    Element.prototype.scrollIntoView = scrollSpy
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeLazyData(),
        nodeKey: 'id',
        showCollapsable: true,
        lazy: true,
        load: (node: any, resolve: (c: any[]) => void) => {
          const children =
            node.key === 1 ? [{ id: 11, label: 'A-子' }] : [{ id: 111, label: 'A-孙' }]
          setTimeout(() => resolve(children), 0)
        },
      },
      attachTo: document.body,
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    expect(vm.expandNode(1)).toBeTruthy()
    await flushMicrotasks()
    await nextTick()
    expect(labels(wrapper)).toEqual(['A', 'A-子', 'B'])

    // 目标节点（A-子，11）已注册但未加载：scrollToNode 触发其加载，完成后滚动
    const ok = await vm.scrollToNode(11, { behavior: 'auto' })
    expect(ok).toBe(true)
    await nextTick()
    expect(scrollSpy).toHaveBeenCalled()
    expect(labels(wrapper)).toContain('A-孙')
    wrapper.unmount()
  })

  it('v-model:expanded-keys 受控展开在加载完成后回写', async () => {
    // data 需固定引用：render 内每次新建数组会触发 deep watch 重建树、丢掉加载中的节点
    const data = makeLazyData()
    const Parent = defineComponent({
      setup() {
        const keys = ref<TreeKey[]>([])
        return { keys }
      },
      render() {
        return h(VueOkrTree, {
          data,
          nodeKey: 'id',
          showCollapsable: true,
          lazy: true,
          load: (node: any, resolve: (c: any[]) => void) => {
            setTimeout(() => resolve([{ id: 11, label: 'A-子' }]), 0)
          },
          expandedKeys: this.keys,
          'onUpdate:expandedKeys': (v: TreeKey[]) => (this.keys = v),
          ref: 'tree',
        })
      },
    })
    const wrapper = mount(Parent)
    const vm = wrapper.vm as any
    await nodeByLabel(wrapper, 'A').find('.org-chart-node-btn').trigger('click')
    expect(vm.keys).toEqual([]) // 加载完成前不回写
    await flushMicrotasks()
    expect([...vm.keys]).toEqual([1])
    wrapper.unmount()
  })
})

describe('懒加载：开发期警告', () => {
  beforeEach(() => resetWarnings())

  it('lazy 缺 load、load 缺 lazy 时警告；配置完整时无警告', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(VueOkrTree, { props: { data: makeLazyData(), lazy: true } })
    mount(VueOkrTree, { props: { data: makeLazyData(), load: () => {} } })
    mount(VueOkrTree, {
      props: {
        data: makeLazyData(),
        lazy: true,
        load: (node: any, resolve: (c: any[]) => void) => resolve([]),
      },
    })
    const messages = spy.mock.calls.map((c) => String(c[0]))
    expect(messages.some((m) => m.includes('lazy 需要同时提供 load'))).toBe(true)
    expect(messages.some((m) => m.includes('未开启 lazy'))).toBe(true)
    spy.mockRestore()
  })

  it('props.isLeaf 标记的叶子节点无展开按钮', () => {
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeLazyData(),
        nodeKey: 'id',
        showCollapsable: true,
        lazy: true,
        props: { isLeaf: 'leaf' },
        load: (node: any, resolve: (c: any[]) => void) => {
          setTimeout(() => resolve([{ id: 11, label: 'A-子' }]), 0)
        },
      },
    })
    expect(nodeByLabel(wrapper, 'B').find('.org-chart-node-btn').exists()).toBe(false)
    expect(nodeByLabel(wrapper, 'A').find('.org-chart-node-btn').exists()).toBe(true)
  })
})
