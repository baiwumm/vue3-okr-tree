import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TreeStore } from '../../src/lib/okr-tree/model/tree-store'
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
  { id: 9, label: 'Root2', children: [{ id: 10, label: 'R2C' }] },
]

const makeLeft = () => [
  { id: 1, label: 'A', children: [{ id: 12, label: 'L1', children: [{ id: 13, label: 'L1C' }] }] },
]

describe('展开 / 收起方法（1.2.0）', () => {
  it('expandAll / collapseAll 覆盖右树与左树', () => {
    const store = new TreeStore({
      key: 'id',
      data: makeData(),
      leftData: makeLeft(),
      onlyBothTree: true,
      direction: 'horizontal',
      showCollapsable: true,
    })
    expect(store.getNode(1)!.expanded).toBe(false)
    store.expandAll()
    expect(store.getNode(1)!.expanded).toBe(true)
    expect(store.getNode(1)!.leftExpanded).toBe(true)
    expect(store.getNode(2)!.expanded).toBe(true)
    expect(store.leftNodesMap[12].leftExpanded).toBe(true)
    store.collapseAll()
    expect(store.getNode(1)!.expanded).toBe(false)
    expect(store.getNode(1)!.leftExpanded).toBe(false)
    expect(store.getNode(9)!.expanded).toBe(false)
    expect(store.leftNodesMap[12].leftExpanded).toBe(false)
  })

  it('expandNode 默认连同祖先展开；collapseNode 只收起自身', () => {
    const store = new TreeStore({ key: 'id', data: makeData(), showCollapsable: true })
    expect(store.expandNode(3)).toBe(store.getNode(3))
    expect(store.getNode(3)!.expanded).toBe(true)
    expect(store.getNode(2)!.expanded).toBe(true)
    expect(store.getNode(1)!.expanded).toBe(true)
    expect(store.getNode(9)!.expanded).toBe(false)
    store.collapseNode(2)
    expect(store.getNode(2)!.expanded).toBe(false)
    expect(store.getNode(1)!.expanded).toBe(true)
    expect(store.expandNode(999)).toBeNull()
  })

  it('expandNode(key, false) 不展开祖先', () => {
    const store = new TreeStore({ key: 'id', data: makeData(), showCollapsable: true })
    store.expandNode(3, false)
    expect(store.getNode(3)!.expanded).toBe(true)
    expect(store.getNode(2)!.expanded).toBe(false)
  })

  it('OKR 根节点 expandNode / collapseNode 同时作用左右两侧', () => {
    const store = new TreeStore({
      key: 'id',
      data: makeData(),
      leftData: makeLeft(),
      onlyBothTree: true,
      direction: 'horizontal',
      showCollapsable: true,
    })
    store.expandNode(1)
    expect(store.getNode(1)!.expanded).toBe(true)
    expect(store.getNode(1)!.leftExpanded).toBe(true)
    store.collapseNode(1)
    expect(store.getNode(1)!.expanded).toBe(false)
    expect(store.getNode(1)!.leftExpanded).toBe(false)
    // 左树节点走 leftExpanded
    store.expandNode(13)
    expect(store.leftNodesMap[13].leftExpanded).toBe(true)
    expect(store.leftNodesMap[12].leftExpanded).toBe(true)
    store.collapseNode(12)
    expect(store.leftNodesMap[12].leftExpanded).toBe(false)
  })

  it('getExpandedKeys / setExpandedKeys 互逆，且 setExpandedKeys 会收起未列出的节点', () => {
    const store = new TreeStore({
      key: 'id',
      data: makeData(),
      showCollapsable: true,
      defaultExpandAll: true,
    })
    expect(store.getExpandedKeys().sort()).toEqual([1, 2, 3, 4, 9, 10].sort())
    store.setExpandedKeys([1, 2])
    expect(store.getNode(1)!.expanded).toBe(true)
    expect(store.getNode(2)!.expanded).toBe(true)
    expect(store.getNode(3)!.expanded).toBe(false)
    expect(store.getNode(9)!.expanded).toBe(false)
    expect(store.getExpandedKeys()).toEqual([1, 2])
    store.setExpandedKeys([])
    expect(store.getExpandedKeys()).toEqual([])
  })

  it('setExpandedKeys 在 OKR 模式下左右同 key 去重，根 key 控制左右两侧', () => {
    const store = new TreeStore({
      key: 'id',
      data: makeData(),
      leftData: makeLeft(),
      onlyBothTree: true,
      direction: 'horizontal',
      showCollapsable: true,
    })
    store.setExpandedKeys([1, 12])
    expect(store.getNode(1)!.expanded).toBe(true)
    expect(store.getNode(1)!.leftExpanded).toBe(true)
    expect(store.leftNodesMap[12].leftExpanded).toBe(true)
    const keys = store.getExpandedKeys()
    expect(keys.filter((k) => k === 1)).toHaveLength(1)
    expect(keys).toContain(12)
  })

  it('未设置 node-key 时 getExpandedKeys 返回空数组', () => {
    const store = new TreeStore({ data: makeData(), defaultExpandAll: true })
    expect(store.getExpandedKeys()).toEqual([])
  })
})

describe('开发期警告', () => {
  beforeEach(() => resetWarnings())

  it('重复 node-key 时 console.warn 一次', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = new TreeStore({ key: 'id', data: makeData() })
    store.append({ id: 4, label: 'D-dup' }, 1)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0]).toContain('重复的 node-key "4"')
    // 同一条只输出一次
    store.append({ id: 4, label: 'D-dup2' }, 1)
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it('OKR 左右树同 key 不算重复', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    new TreeStore({
      key: 'id',
      data: makeData(),
      leftData: makeLeft(),
      onlyBothTree: true,
      direction: 'horizontal',
    })
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('替换 data 重建时不误报', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = new TreeStore({ key: 'id', data: makeData() })
    store.setData(makeData())
    store.setData(makeData())
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
