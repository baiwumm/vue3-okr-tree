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

  /**
   * 锁定态（requirements 第 5 节点名的「传值但不传回调」写法）实测行为：**不冻结视图**。
   * 展开态的渲染源是 store，受控 prop 只在创建期与宿主传入值变化时回灌，宿主不回写就没有
   * 第二次同步 —— 点击照常折叠，emit 照发。react 侧同批把三种写法（只绑 prop / 绑了不回写
   * 的监听 / 真受控写回）逐字测过，折叠结果与此一致，所以这不是复刻偏差而是两仓共同语义。
   * 这两条钉住现状：不报错、不警告、监听器照常收到新值、视图跟着交互走；哪天要改成
   * 「不回写即冻结」，这里会红，届时无需动代码先拍语义。
   */
  it('锁定态：传 expandedKeys 而不接 update 时不警告，点击照常生效', async () => {
    /**
     * 必须自己清一次去重表：`warn()` 默认按文案去重、且是**模块级**的，本文件前面的用例
     * 已经把「expanded-keys（v-model）需要同时设置 node-key」那条发掉了，不清表的话
     * `not.toHaveBeenCalled()` 是白断的（实测把 node-key 守卫改成无条件警告，这条照样绿）。
     */
    resetWarnings()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), nodeKey: 'id', showCollapsable: true, expandedKeys: [1] },
    })
    const vm = wrapper.vm as any
    expect(vm.getNode(1).expanded).toBe(true)
    await nodeByLabel(wrapper, 'A').find('.org-chart-node-btn').trigger('click')
    expect(vm.getNode(1).expanded, '宿主没回写，视图仍按 store 走').toBe(false)
    expect(warnSpy, '锁定态是合法配置，不该警告').not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('锁定态：绑了不回写的 update 监听时，监听收到新值而视图不被拉回', async () => {
    const onUpdate = vi.fn()
    const Host = defineComponent({
      render() {
        return h(VueOkrTree, {
          data: makeData(),
          nodeKey: 'id',
          showCollapsable: true,
          expandedKeys: [1],
          'onUpdate:expandedKeys': onUpdate,
        })
      },
    })
    const wrapper = mount(Host)
    const tree = wrapper.findComponent(VueOkrTree).vm as any
    await nodeByLabel(wrapper, 'A').find('.org-chart-node-btn').trigger('click')
    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect([...(onUpdate.mock.calls[0][0] as TreeKey[])], '收起 A 之后新值就是空列表').toEqual([])
    expect(tree.getNode(1).expanded, 'prop 恒为 [1]，但没人回灌就不该被拉回').toBe(false)
  })

  /**
   * 锁定态的**第二种强度**（react 文档站 `guide/controlled.mdx:91-93` 的说法，两仓实测逐字一致）：
   * `expandedKeys` 传「每次渲染新建的数组字面量」＝完全锁定，传「引用稳定的数组」＝交互结果保留
   * 到 prop 真的变化为止。机制上就是 `props.expandedKeys` 那条 watch 的触发条件——引用变了、
   * 或（`deep: true`）内容变了，才会把 store 按 prop 回灌一次。
   *
   * **前提是宿主那份 `data` 也必须是稳定引用**：第一批探针里宿主重渲染时 `data` 同时换了引用，
   * 走的是 `props.data` 那条 watch ⇒ 整树重建 ⇒ 两条路径混在一起分不出来（两个分支的观测结果
   * 逐字相同，正是被整树重建主导的那种「相同」）。这里 `data` 在外层一次创建、闭包捕获。
   */
  const lockHost = (keysOf: () => TreeKey[]) => {
    const data = makeData()
    const tick = ref(0)
    const Host = defineComponent({
      render() {
        // tick 必须被渲染出去，宿主才真的会重渲染；keysOf() 每次调用都现场决定引用
        return h('div', [
          h('span', String(tick.value)),
          h(VueOkrTree, { data, nodeKey: 'id', showCollapsable: true, expandedKeys: keysOf() }),
        ])
      },
    })
    return { Host, tick }
  }

  it('锁定态·内联字面量：宿主一重渲染就把交互结果拉回（＝完全锁定）', async () => {
    const { Host, tick } = lockHost(() => [1])
    const wrapper = mount(Host)
    const tree = wrapper.findComponent(VueOkrTree).vm as VueOkrTreeInstance
    expect(tree.getNode(1)!.expanded).toBe(true)

    await nodeByLabel(wrapper, 'A').find('.org-chart-node-btn').trigger('click')
    expect(tree.getNode(1)!.expanded, '交互本身照常生效').toBe(false)

    tick.value += 1
    await nextTick()
    expect(tree.getNode(1)!.expanded, '引用变了 ⇒ 按 prop 回灌，折叠被拉回').toBe(true)
    // 拉回不是一次性的：还能再收，收完再渲染又回来
    await nodeByLabel(wrapper, 'A').find('.org-chart-node-btn').trigger('click')
    expect(tree.getNode(1)!.expanded).toBe(false)
  })

  it('锁定态·引用稳定的数组：不回灌到 prop 真的换引用为止（原地改不算）', async () => {
    let keys: TreeKey[] = [1]
    const { Host, tick } = lockHost(() => keys)
    const wrapper = mount(Host)
    const tree = wrapper.findComponent(VueOkrTree).vm as VueOkrTreeInstance

    await nodeByLabel(wrapper, 'A').find('.org-chart-node-btn').trigger('click')
    expect(tree.getNode(1)!.expanded).toBe(false)

    tick.value += 1
    await nextTick()
    expect(tree.getNode(1)!.expanded, '引用与内容都没变 ⇒ watcher 不触发，折叠结果保留').toBe(false)

    /**
     * 原地 push 也不回灌：这条不是想当然，是实测——watcher 确实带 `deep: true`，但深遍历
     * 要能挂上依赖，源得先是响应式的。宿主传进来的就是一份普通数组（没经 `ref` /
     * `reactive`），Vue 没有任何东西可通知，`deep` 便无事可做。
     * 换句话说「引用稳定 = 保留到 prop 真的变化」里的“变化”，实际等价于**换引用**
     * （或由 `ref` 包着的数组改内容）。
     */
    keys.push(2)
    await nextTick()
    expect(tree.getNode(2)!.expanded, '非响应式数组的原地变更不会回灌').toBe(false)
    expect(tree.getNode(1)!.expanded).toBe(false)

    keys = [1, 2]
    tick.value += 1
    await nextTick()
    expect(tree.getNode(1)!.expanded, '换引用 ⇒ 按新 prop 回灌，根节点重新展开').toBe(true)
    expect(tree.getNode(2)!.expanded).toBe(true)
  })

  /**
   * 上一条的对照面：数组换成 `ref` 包着的（即响应式的），原地改内容**就**算变化——
   * `watch(() => props.expandedKeys, …, { deep: true })` 的深遍历要挂得上依赖，源得先是
   * 响应式的。两条一起才说清「保留到 prop 真的变化为止」里“变化”到底是什么。
   */
  it('锁定态·响应式数组：原地 push 即变化，deep 那条 watch 会回灌', async () => {
    const keys = ref<TreeKey[]>([1])
    const { Host, tick } = lockHost(() => keys.value)
    const wrapper = mount(Host)
    const tree = wrapper.findComponent(VueOkrTree).vm as VueOkrTreeInstance

    await nodeByLabel(wrapper, 'A').find('.org-chart-node-btn').trigger('click')
    expect(tree.getNode(1)!.expanded).toBe(false)

    keys.value.push(2)
    await nextTick()
    expect(
      tree.getNode(1)!.expanded,
      '响应式数组的原地变更被 deep watcher 收到 ⇒ 按 prop 回灌'
    ).toBe(true)
    expect(tree.getNode(2)!.expanded).toBe(true)

    // 引用与内容都没动的那次重渲染，仍然不该打扰交互结果
    await nodeByLabel(wrapper, 'B').find('.org-chart-node-btn').trigger('click')
    tick.value += 1
    await nextTick()
    expect(tree.getNode(2)!.expanded, '这次没人改 prop，B 的折叠结果保留').toBe(false)
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

  /**
   * 与 react 侧 G4 同批：另外三条各挂一次、每次先清 spy，断的是「这一支自己的条件」。
   * 一条 pooled 断言会把它们全蒙过去——`current-key` 那条的文案本身就写着
   * 「current-key / current-node-key」，只传 currentNodeKey 时靠子串也能命中，
   * 摘掉 `|| props.currentNodeKey !== undefined` 也不会红。反向守卫同理：
   * node-key 齐备时三条都不许出现，否则「无条件警告」的写法也能过关。
   */
  it('default-expanded-keys / default-checked-keys / currentNodeKey 缺 node-key 时各自警告', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const warnedOf = (props: Record<string, unknown>): string[] => {
      spy.mockClear()
      /**
       * 每次挂载前都要清 `warn` 的去重表：`warn(msg)` 默认 once，同一条文案在整个
       * 模块里只出一次。不清的话最后那次「node-key 已补齐」的反向挂载根本不会再
       * 产生消息，反向守卫就变成永真——实测把 `if (!props.nodeKey)` 改成无条件警告时，
       * 这条守卫照样绿，红的是文件里另一条老用例。
       */
      resetWarnings()
      mount(VueOkrTree, { props: { data: makeData(), ...props } })
      return spy.mock.calls.map((c) => String(c[0]))
    }
    expect(
      warnedOf({ defaultExpandedKeys: [1] }).some((m) => m.includes('default-expanded-keys')),
      '只传 default-expanded-keys 时应警告它需要 node-key'
    ).toBe(true)
    expect(
      warnedOf({ defaultCheckedKeys: [1] }).some((m) => m.includes('default-checked-keys')),
      '只传 default-checked-keys 时应警告它需要 node-key'
    ).toBe(true)
    expect(
      warnedOf({ currentNodeKey: 1 }).some((m) => m.includes('current-node-key')),
      '只传 currentNodeKey（不传 currentKey）时也应警告'
    ).toBe(true)
    expect(
      warnedOf({
        nodeKey: 'id',
        defaultExpandedKeys: [1],
        defaultCheckedKeys: [1],
        currentNodeKey: 1,
      }).some((m) => m.includes('需要同时设置 node-key')),
      '补齐 node-key 后这三条警告都不该出现'
    ).toBe(false)
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
