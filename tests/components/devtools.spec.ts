import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { VueOkrTree } from '../../src/lib'
import { getDevtoolsRegistry, resetDevtoolsForTests } from '../../src/lib/okr-tree/devtools'

const makeData = () => [
  {
    id: 1,
    label: 'Root',
    children: [
      {
        id: 11,
        label: 'A',
        children: [
          { id: 111, label: 'A1' },
          { id: 112, label: 'A2' },
        ],
      },
      { id: 12, label: 'B', children: [{ id: 121, label: 'B1' }] },
      { id: 13, label: 'C' },
    ],
  },
]

const INSPECTOR_ID = 'vue3-okr-tree'

const ownLabel = (n: any) =>
  n.find(':scope > .org-chart-node-label > .org-chart-node-label-inner').text()

const nodeByLabel = (w: any, label: string) =>
  w.findAll('.org-chart-node').find((n: any) => ownLabel(n) === label)

/** 捕获握手回调里后端传入的 api 各处理器，供直接调用断言 */
const captureApi = () => {
  const treeHandlers: Array<(p: any) => void> = []
  const stateHandlers: Array<(p: any) => void> = []
  const addInspector = vi.fn()
  const setupFn = (globalThis as any).__VUE_DEVTOOLS_PLUGINS__?.[0]?.setupFn
  setupFn({
    addInspector,
    on: {
      getInspectorTree: (cb: (p: any) => void) => treeHandlers.push(cb),
      getInspectorState: (cb: (p: any) => void) => stateHandlers.push(cb),
    },
  })
  return { addInspector, treeHandlers, stateHandlers }
}

describe('Vue Devtools 面板（devtools.ts）', () => {
  beforeEach(() => {
    resetDevtoolsForTests()
  })
  afterEach(() => {
    delete (globalThis as any).__VUE_DEVTOOLS_GLOBAL_HOOK__
    delete (globalThis as any).__VUE_DEVTOOLS_PLUGINS__
  })

  it('挂载注册、卸载注销；注册表条目与存活实例一一对应', () => {
    const first = mount(VueOkrTree, { props: { data: makeData(), nodeKey: 'id' } })
    expect(getDevtoolsRegistry()).toHaveLength(1)

    const second = mount(VueOkrTree, { props: { data: makeData(), nodeKey: 'id' } })
    expect(getDevtoolsRegistry()).toHaveLength(2)
    expect(getDevtoolsRegistry()[0].id).not.toBe(getDevtoolsRegistry()[1].id)

    first.unmount()
    expect(getDevtoolsRegistry()).toHaveLength(1)
    // 实例 id 按注册顺序递增：剩下的是第二棵（tree:1 已随卸载注销）
    expect(getDevtoolsRegistry()[0].id).toBe('tree:2')
    second.unmount()
    expect(getDevtoolsRegistry()).toHaveLength(0)
  })

  it('hook 已在时逐字 emit HOOK_SETUP；多次挂载只握手一次', () => {
    const emit = vi.fn()
    ;(globalThis as any).__VUE_DEVTOOLS_GLOBAL_HOOK__ = { emit }
    const first = mount(VueOkrTree, { props: { data: makeData(), nodeKey: 'id' } })
    expect(emit).toHaveBeenCalledTimes(1)
    const [event, descriptor, setupFn] = emit.mock.calls[0]
    expect(event).toBe('devtools-plugin:setup')
    expect(descriptor).toMatchObject({ id: 'vue3-okr-tree', packageName: 'vue3-okr-tree' })
    expect(typeof setupFn).toBe('function')

    mount(VueOkrTree, { props: { data: makeData(), nodeKey: 'id' } })
    expect(emit).toHaveBeenCalledTimes(1)
    first.unmount()
  })

  it('hook 未在时按 devtools-api 同形条目排队（pluginDescriptor / setupFn / proxy: null）', () => {
    mount(VueOkrTree, { props: { data: makeData(), nodeKey: 'id' } })
    const queue = (globalThis as any).__VUE_DEVTOOLS_PLUGINS__
    expect(queue).toHaveLength(1)
    expect(queue[0]).toMatchObject({
      pluginDescriptor: { id: 'vue3-okr-tree' },
      proxy: null,
    })
    expect(typeof queue[0].setupFn).toBe('function')
  })

  it('setupDevtools 注册 inspector 并按 inspectorId 过滤；树实例列表带节点数 tag', () => {
    mount(VueOkrTree, { props: { data: makeData(), nodeKey: 'id' } })
    const { addInspector, treeHandlers } = captureApi()
    expect(addInspector).toHaveBeenCalledWith(
      expect.objectContaining({ id: INSPECTOR_ID, label: 'OkrTree' })
    )
    expect(treeHandlers).toHaveLength(1)

    const hit: any = { inspectorId: INSPECTOR_ID, filter: '' }
    treeHandlers[0](hit)
    expect(hit.rootNodes).toHaveLength(1)
    expect(hit.rootNodes[0].label).toBe('Root')
    expect(hit.rootNodes[0].tags[0].label).toBe('7')
    expect(hit.rootNodes[0].tags.some((t: any) => t.label === 'OKR')).toBe(false)

    const miss: any = { inspectorId: 'other-plugin', filter: '' }
    treeHandlers[0](miss)
    expect(miss.rootNodes).toBeUndefined()
  })

  it('树实例列表响应 filter（按根节点文案过滤）', () => {
    mount(VueOkrTree, { props: { data: makeData(), nodeKey: 'id' } })
    const { treeHandlers } = captureApi()
    const hit: any = { inspectorId: INSPECTOR_ID, filter: 'roo' }
    treeHandlers[0](hit)
    expect(hit.rootNodes).toHaveLength(1)
    const none: any = { inspectorId: INSPECTOR_ID, filter: '不存在的根' }
    treeHandlers[0](none)
    expect(none.rootNodes).toEqual([])
  })

  it('状态页：概要计数与节点注册表全量转储，勾选 / 半选实时可读', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), nodeKey: 'id', showCheckbox: true, defaultExpandAll: true },
    })
    const { stateHandlers } = captureApi()
    expect(stateHandlers).toHaveLength(1)
    const readState = () => {
      const payload: any = { inspectorId: INSPECTOR_ID, nodeId: getDevtoolsRegistry()[0].id }
      stateHandlers[0](payload)
      return payload.state
    }

    const state = readState()
    expect(state['概要']['右树节点数']).toBe(7)
    expect(state['概要']['勾选节点数']).toBe(0)
    expect(Object.keys(state['节点注册表（右树）'])).toHaveLength(7)
    expect(state['节点注册表（右树）']['11']).toMatchObject({
      文案: 'A',
      层级: 2,
      展开: true,
      可见: true,
      勾选: false,
      半选: false,
    })
    expect(state['节点注册表（左树）']).toBeUndefined()

    // 勾选叶子 112 ⇒ 112 勾选、11 半选、Root 半选；面板按需拉取即见
    await nodeByLabel(wrapper, 'A2').find('.org-chart-node-checkbox').trigger('click')
    const after = readState()
    expect(after['概要']['勾选节点数']).toBe(1)
    expect(after['概要']['半选节点数']).toBe(2)
    expect(after['节点注册表（右树）']['112']).toMatchObject({ 勾选: true, 半选: false })
    expect(after['节点注册表（右树）']['11']).toMatchObject({ 勾选: false, 半选: true })
  })

  it('OKR 模式：左树进注册表 tag 与独立分节，概要含当前左节点', () => {
    mount(VueOkrTree, {
      props: {
        data: makeData(),
        leftData: [{ id: 1, label: 'Left-Root', children: [{ id: 11, label: 'L-A' }] }],
        onlyBothTree: true,
        nodeKey: 'id',
      },
    })
    const { treeHandlers, stateHandlers } = captureApi()

    const tree: any = { inspectorId: INSPECTOR_ID, filter: '' }
    treeHandlers[0](tree)
    expect(tree.rootNodes[0].tags.some((t: any) => t.label === 'OKR')).toBe(true)
    expect(tree.rootNodes[0].tags[0].label).toBe('7+2')

    const payload: any = { inspectorId: INSPECTOR_ID, nodeId: getDevtoolsRegistry()[0].id }
    stateHandlers[0](payload)
    expect(payload.state['概要']['左树节点数']).toBe(2)
    expect(Object.keys(payload.state['节点注册表（左树）'])).toHaveLength(2)
  })

  it('卸载后状态页返回空（nodeId 查不到注册表条目）', () => {
    const wrapper = mount(VueOkrTree, { props: { data: makeData(), nodeKey: 'id' } })
    const { stateHandlers } = captureApi()
    const nodeId = getDevtoolsRegistry()[0].id
    wrapper.unmount()
    const payload: any = { inspectorId: INSPECTOR_ID, nodeId }
    stateHandlers[0](payload)
    expect(payload.state).toBeUndefined()
  })
})
