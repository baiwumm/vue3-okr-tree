import { describe, it, expect, vi } from 'vitest'
import { TreeStore } from '../../src/lib/okr-tree/model/tree-store'

/** 初始只给顶层节点（无 children），子级由 load 提供 */
const makeLazyData = () => [
  { id: 1, label: 'A' },
  { id: 2, label: 'B' },
]

/** 用微任务异步 resolve，模拟接口 */
function deferLoad(store: TreeStore, resolver: (node: any) => any[]) {
  const load = vi.fn((node: any, resolve: (c: any[]) => void) => {
    Promise.resolve().then(() => resolve(resolver(node)))
  })
  store.load = load as any
  return load
}

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('懒加载：基础流程', () => {
  it('首次展开未加载节点触发 load，resolve 后写入源数据 children、构建子节点并展开', async () => {
    const data = makeLazyData()
    const store = new TreeStore({ key: 'id', data, lazy: true, showCollapsable: true })
    const load = deferLoad(store, (node) => [
      { id: Number(`${node.key}01`), label: `${node.label}-子` },
    ])

    const nodeA = store.getNode(1)!
    expect(nodeA.loaded).toBe(false)
    expect(nodeA.isLeaf).toBe(false) // 默认视为有子节点
    store.expandNode(1)
    expect(load).toHaveBeenCalledTimes(1)
    expect(nodeA.loading).toBe(true)
    expect(nodeA.expanded).toBe(false) // 加载完成前保持折叠

    await flushMicrotasks()
    expect(nodeA.loaded).toBe(true)
    expect(nodeA.loading).toBe(false)
    expect(nodeA.expanded).toBe(true)
    expect(nodeA.childNodes).toHaveLength(1)
    // 同步写回源数据（与 append 语义一致）
    expect((data[0] as any).children).toEqual([{ id: 101, label: 'A-子' }])
    // 再次展开不重复 load
    nodeA.expanded = false
    store.expandNode(1)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('加载一次不重复：loading 期间重复展开只触发一次 load', async () => {
    const store = new TreeStore({ key: 'id', data: makeLazyData(), lazy: true })
    let finish!: (c: any[]) => void
    const load = vi.fn((_node: any, resolve: (c: any[]) => void) => {
      finish = resolve
    })
    store.load = load as any

    const nodeA = store.getNode(1)!
    store.expandNode(1)
    store.expandNode(1)
    store.expandNode(1)
    expect(load).toHaveBeenCalledTimes(1)
    finish([{ id: 11, label: 'A-子' }])
    await flushMicrotasks()
    expect(nodeA.expanded).toBe(true)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('reject 恢复折叠态且可重试', async () => {
    const store = new TreeStore({
      key: 'id',
      data: makeLazyData(),
      lazy: true,
      showCollapsable: true,
    })
    const load = vi.fn((_node: any, _resolve: any, reject: () => void) => {
      Promise.resolve().then(() => reject())
    })
    store.load = load as any

    const nodeA = store.getNode(1)!
    store.expandNode(1)
    await flushMicrotasks()
    expect(nodeA.loading).toBe(false)
    expect(nodeA.loaded).toBe(false)
    expect(nodeA.expanded).toBe(false)

    // 可重试：第二次换成功回调
    store.load = ((node: any, resolve: (c: any[]) => void) => {
      Promise.resolve().then(() => resolve([{ id: 11, label: 'A-子' }]))
    }) as any
    store.expandNode(1)
    await flushMicrotasks()
    expect(nodeA.loaded).toBe(true)
    expect(nodeA.expanded).toBe(true)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('load 同步抛错时节点回到折叠态且可重试', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = new TreeStore({
      key: 'id',
      data: makeLazyData(),
      lazy: true,
      showCollapsable: true,
    })
    const load = vi.fn(() => {
      throw new Error('network error')
    })
    store.load = load as any

    const nodeA = store.getNode(1)!
    store.expandNode(1)
    expect(nodeA.loading).toBe(false)
    expect(nodeA.expanded).toBe(false)
    expect(nodeA.loaded).toBe(false)
    errorSpy.mockRestore()
  })

  it('props.isLeaf 决定未加载节点是否为叶子，叶子节点不触发 load', () => {
    const data = [
      { id: 1, label: 'A', leaf: true },
      { id: 2, label: 'B' },
    ]
    const load = vi.fn()
    const store = new TreeStore({
      key: 'id',
      data,
      lazy: true,
      props: { isLeaf: 'leaf' },
    })
    store.load = load as any
    expect(store.getNode(1)!.isLeaf).toBe(true)
    expect(store.getNode(2)!.isLeaf).toBe(false)
    store.expandNode(1)
    store.expandNode(2)
    expect(load).toHaveBeenCalledTimes(1) // 只有 B 触发
    expect(load.mock.calls[0][0]).toBe(store.getNode(2))
  })

  it('resolve 空数组时节点视为已加载叶子', async () => {
    const store = new TreeStore({ key: 'id', data: makeLazyData(), lazy: true })
    store.load = ((node: any, resolve: (c: any[]) => void) => {
      Promise.resolve().then(() => resolve([]))
    }) as any
    const nodeA = store.getNode(1)!
    store.expandNode(1)
    await flushMicrotasks()
    expect(nodeA.loaded).toBe(true)
    expect(nodeA.isLeaf).toBe(true)
  })
})

describe('懒加载：与展开方法 / 受控态的交互', () => {
  it('expandAll 对未加载节点触发加载', async () => {
    const store = new TreeStore({ key: 'id', data: makeLazyData(), lazy: true })
    const load = deferLoad(store, () => [{ id: 99, label: 'x' }])
    store.expandAll()
    expect(load).toHaveBeenCalledTimes(2)
    await flushMicrotasks()
    expect(store.getNode(1)!.expanded).toBe(true)
    expect(store.getNode(2)!.expanded).toBe(true)
  })

  it('setExpandedKeys 触发加载并在完成后展开', async () => {
    const data = makeLazyData()
    const store = new TreeStore({ key: 'id', data, lazy: true, showCollapsable: true })
    const emitted: any[] = []
    store.onExpandSettled = () => emitted.push(store.getExpandedKeys())
    deferLoad(store, () => [{ id: 11, label: 'A-子' }])

    store.setExpandedKeys([1])
    expect(store.getNode(1)!.expanded).toBe(false)
    await flushMicrotasks()
    expect(store.getNode(1)!.expanded).toBe(true)
    expect(store.getNode(2)!.expanded).toBe(false)
    expect(emitted[emitted.length - 1]).toEqual([1])

    // 再设置另一个 key：加载完成后再次通知
    store.setExpandedKeys([2])
    await flushMicrotasks()
    expect(emitted[emitted.length - 1]).toEqual([2])
  })

  it('whenLoaded 等待加载完成（scrollToNode 依赖）', async () => {
    const store = new TreeStore({ key: 'id', data: makeLazyData(), lazy: true })
    deferLoad(store, () => [{ id: 11, label: 'A-子' }])
    const nodeA = store.getNode(1)!
    let settled = false
    store.expandNode(1)
    nodeA.whenLoaded().then((ok) => (settled = ok))
    expect(settled).toBe(false)
    await flushMicrotasks()
    expect(settled).toBe(true)
    await expect(nodeA.whenLoaded()).resolves.toBe(true)
  })
})

describe('懒加载：OKR 左树', () => {
  it('左树节点展开触发 load，node.isLeftChild 可区分', async () => {
    const data = makeLazyData()
    const leftData = [{ id: 1, label: 'A' }]
    const store = new TreeStore({
      key: 'id',
      data,
      leftData,
      onlyBothTree: true,
      direction: 'horizontal',
      lazy: true,
    })
    const load = deferLoad(store, (node) =>
      node.isLeftChild ? [{ id: 88, label: '左-子' }] : [{ id: 77, label: '右-子' }]
    )

    const leftNode = store.leftNodesMap[1]
    expect(leftNode).toBeTruthy()
    expect(leftNode.loaded).toBe(false)
    leftNode.expand(false)
    expect(load).toHaveBeenCalledTimes(1)
    expect(load.mock.calls[0][0].isLeftChild).toBe(true)
    await flushMicrotasks()
    expect(leftNode.leftExpanded).toBe(true)
    expect(leftNode.childNodes).toHaveLength(1)
    expect(store.leftNodesMap[88]).toBeTruthy()

    // 右树同 key 节点独立加载
    store.getNode(1)!.expand(false)
    await flushMicrotasks()
    expect(load).toHaveBeenCalledTimes(2)
    expect(load.mock.calls[1][0].isLeftChild).toBe(false)
    expect(store.nodesMap[77]).toBeTruthy()
  })
})
