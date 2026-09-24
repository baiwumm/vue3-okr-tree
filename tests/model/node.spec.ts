import { describe, it, expect } from 'vitest'
import { TreeStore } from '../../src/lib/okr-tree/model/tree-store'
import { TreeNode } from '../../src/lib/okr-tree/model/node'
import { NODE_KEY } from '../../src/lib/okr-tree/model/util'
import { isReactive, isProxy } from 'vue'

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

const createStore = (overrides: Partial<ConstructorParameters<typeof TreeStore>[0]> = {}) =>
  new TreeStore({
    key: 'id',
    data: makeData(),
    showCollapsable: true,
    ...overrides,
  })

describe('TreeNode 基础构建', () => {
  it('按数据构建层级、label、isLeaf', () => {
    const store = createStore()
    const root = store.root
    expect(root.level).toBe(0)
    expect(root.childNodes).toHaveLength(1)
    const a = root.childNodes[0]
    expect(a.level).toBe(1)
    expect(a.label).toBe('A')
    expect(a.isLeaf).toBe(false)
    expect(a.childNodes.map((n) => n.label)).toEqual(['B', 'D'])
    const b = a.childNodes[0]
    expect(b.level).toBe(2)
    expect(b.childNodes[0].label).toBe('C')
    expect(b.childNodes[0].isLeaf).toBe(true)
    expect(b.childNodes[0].level).toBe(3)
  })

  it('节点实例是 shallowReactive 代理，data 保持原始引用（不被代理）', () => {
    const data = makeData()
    const store = createStore({ data })
    const a = store.root.childNodes[0]
    expect(isReactive(a)).toBe(true)
    expect(isProxy(a.data)).toBe(false)
    expect(a.data).toBe(data[0])
    expect(a.childNodes[0].data).toBe(data[0].children[0])
    // 子节点 parent 与注册表持有的都是代理实例
    expect(a.childNodes[0].parent).toBe(a)
    expect(store.getNode(1)).toBe(a)
  })

  it('保持源数据顺序（倒序显示 bug 场景）', () => {
    const data = [
      {
        id: 1,
        label: 'one',
        children: [
          { id: 11, label: 'x3' },
          { id: 12, label: 'x2' },
          { id: 13, label: 'x1' },
        ],
      },
    ]
    const store = createStore({ data })
    expect(store.root.childNodes[0].childNodes.map((n) => n.label)).toEqual(['x3', 'x2', 'x1'])
  })

  it('在源数据上写入不可枚举的 $treeNodeId', () => {
    const data = makeData()
    createStore({ data, key: undefined })
    expect((data[0] as any)[NODE_KEY]).toBeTypeOf('number')
    expect(Object.keys(data[0])).not.toContain(NODE_KEY)
  })

  it('props.label 支持函数，props.children 支持自定义字段', () => {
    const store = new TreeStore({
      data: [{ name: 'N', kids: [{ name: 'K' }] }],
      props: {
        label: (d) => `<${d.name}>`,
        children: 'kids',
      },
    })
    const n = store.root.childNodes[0]
    expect(n.label).toBe('<N>')
    expect(n.childNodes[0].label).toBe('<K>')
  })

  it('props.disabled 读取禁用字段', () => {
    const store = new TreeStore({ data: [{ label: 'x', disabled: true }, { label: 'y' }] })
    expect(store.root.childNodes[0].disabled).toBe(true)
    expect(store.root.childNodes[1].disabled).toBe(false)
  })
})

describe('展开状态', () => {
  it('show-collapsable=false 时强制全部展开', () => {
    const store = createStore({ showCollapsable: false })
    const a = store.root.childNodes[0]
    expect(a.expanded).toBe(true)
    expect(a.leftExpanded).toBe(true)
    expect(a.childNodes[0].expanded).toBe(true)
  })

  it('show-collapsable=true 且未设 defaultExpandAll 时默认折叠', () => {
    const store = createStore()
    const a = store.root.childNodes[0]
    expect(a.expanded).toBe(false)
    expect(a.childNodes[0].expanded).toBe(false)
  })

  it('defaultExpandAll 展开全部', () => {
    const store = createStore({ defaultExpandAll: true })
    expect(store.root.childNodes[0].expanded).toBe(true)
    expect(store.root.childNodes[0].childNodes[0].expanded).toBe(true)
  })

  it('defaultExpandedKeys 展开目标节点及其祖先', () => {
    const store = createStore({ defaultExpandedKeys: [3] })
    const a = store.root.childNodes[0]
    const b = a.childNodes[0]
    const c = b.childNodes[0]
    expect(c.expanded).toBe(true)
    expect(b.expanded).toBe(true)
    expect(a.expanded).toBe(true)
    expect(a.childNodes[1].expanded).toBe(false)
  })

  it('expand / collapse 切换', () => {
    const store = createStore()
    const a = store.root.childNodes[0]
    a.expand()
    expect(a.expanded).toBe(true)
    a.collapse()
    expect(a.expanded).toBe(false)
  })

  it('setDefaultExpandedKeys 运行时生效', () => {
    const store = createStore()
    store.setDefaultExpandedKeys([2])
    const a = store.root.childNodes[0]
    expect(a.childNodes[0].expanded).toBe(true)
    expect(a.expanded).toBe(true)
  })
})

describe('增删改（Q3：同步修改源数据，复刻原版行为）', () => {
  it('append 追加子节点并写入源数据 children', () => {
    const data = makeData()
    const store = createStore({ data })
    store.append({ id: 5, label: 'E' }, 4)
    const d = store.getNode(4)!
    expect(d.childNodes.map((n) => n.label)).toEqual(['E'])
    expect(d.isLeaf).toBe(false)
    expect((data[0].children[1] as any).children).toEqual([{ id: 5, label: 'E' }])
    expect(store.getNode(5)).toBe(d.childNodes[0])
  })

  it('append 不传 parent 时挂到根', () => {
    const data = makeData()
    const store = createStore({ data })
    store.append({ id: 9, label: 'Root2' })
    expect(store.root.childNodes.map((n) => n.label)).toEqual(['A', 'Root2'])
    expect(data).toHaveLength(2)
  })

  it('insertBefore / insertAfter 按位置插入并同步源数据', () => {
    const data = makeData()
    const store = createStore({ data })
    store.insertBefore({ id: 6, label: 'X' }, 4)
    store.insertAfter({ id: 7, label: 'Y' }, 4)
    const a = store.getNode(1)!
    expect(a.childNodes.map((n) => n.label)).toEqual(['B', 'X', 'D', 'Y'])
    expect(data[0].children.map((c) => c.label)).toEqual(['B', 'X', 'D', 'Y'])
  })

  it('remove 删除节点、注销 key 并同步源数据', () => {
    const data = makeData()
    const store = createStore({ data })
    store.remove(2)
    const a = store.getNode(1)!
    expect(a.childNodes.map((n) => n.label)).toEqual(['D'])
    expect(store.getNode(2)).toBeNull()
    expect(store.getNode(3)).toBeNull()
    expect(data[0].children.map((c) => c.label)).toEqual(['D'])
  })

  it('remove 支持传 data 对象与 Node 实例', () => {
    const data = makeData()
    const store = createStore({ data })
    store.remove(data[0].children[1])
    store.remove(store.getNode(2)!)
    expect(store.getNode(1)!.childNodes).toHaveLength(0)
    expect(store.getNode(1)!.isLeaf).toBe(true)
  })

  it('remove 当前选中节点时清除 currentNode', () => {
    const store = createStore()
    store.setCurrentNodeKey(2)
    expect(store.getCurrentNode()!.label).toBe('B')
    store.remove(2)
    expect(store.getCurrentNode()).toBeNull()
  })

  it('未设置 node-key 时 remove(key) 静默无效（原版行为）', () => {
    const store = createStore({ key: undefined })
    store.remove(2)
    expect(store.root.childNodes[0].childNodes).toHaveLength(2)
  })

  it('updateChildren(key, data) 替换全部子节点', () => {
    const data = makeData()
    const store = createStore({ data })
    store.updateChildren(1, [
      { id: 20, label: 'N1' },
      { id: 21, label: 'N2' },
    ])
    const a = store.getNode(1)!
    expect(a.childNodes.map((n) => n.label)).toEqual(['N1', 'N2'])
    expect(store.getNode(2)).toBeNull()
    expect(store.getNode(20)!.label).toBe('N1')
    expect(data[0].children.map((c) => c.label)).toEqual(['N1', 'N2'])
  })
})

describe('setData / updateChildren（Q4 与异步改 data）', () => {
  it('data 引用变化时重建整棵树并注销旧节点', () => {
    const store = createStore()
    expect(store.getNode(2)).not.toBeNull()
    const next = [{ id: 100, label: 'New', children: [{ id: 101, label: 'Child' }] }]
    store.setData(next)
    expect(store.root.data).toBe(next)
    expect(store.root.childNodes.map((n) => n.label)).toEqual(['New'])
    expect(store.getNode(2)).toBeNull()
    expect(store.getNode(101)!.label).toBe('Child')
  })

  it('data 引用不变、原地 push 时 updateChildren 增量更新且不报错', () => {
    const data = makeData()
    const store = createStore({ data })
    const a = store.getNode(1)!
    a.expand()
    data[0].children.push({ id: 8, label: 'Z' })
    expect(() => store.setData(data)).not.toThrow()
    expect(a.childNodes.map((n) => n.label)).toEqual(['B', 'D', 'Z'])
    expect(store.getNode(8)!.label).toBe('Z')
    // 已有节点实例被复用，展开状态保留
    expect(store.getNode(1)).toBe(a)
    expect(a.expanded).toBe(true)
  })

  it('原地删除子项时对应节点被移除并注销', () => {
    const data = makeData()
    const store = createStore({ data })
    data[0].children.splice(0, 1)
    store.setData(data)
    expect(store.getNode(1)!.childNodes.map((n) => n.label)).toEqual(['D'])
    expect(store.getNode(2)).toBeNull()
    expect(store.getNode(3)).toBeNull()
  })

  it('同 key 但对象引用变化时复用节点并换绑 data', () => {
    const data = makeData()
    const store = createStore({ data })
    const d = store.getNode(4)!
    d.expand()
    data[0].children[1] = { id: 4, label: 'D-renamed' }
    store.setData(data)
    const d2 = store.getNode(4)!
    expect(d2).toBe(d)
    expect(d2.label).toBe('D-renamed')
    expect(d2.expanded).toBe(true)
  })

  it('父节点换绑 data 引用时，子代仍留在注册表里（1.1 回归）', () => {
    const cData = { id: 3, label: 'C' }
    const children = [
      { id: 2, label: 'B', children: [cData] },
      { id: 4, label: 'D' },
    ]
    const data = [{ id: 1, label: 'A', children }]
    const store = createStore({ data })
    const b = store.getNode(2)!
    b.expand()
    // 只换 B 这一层对象、B 的 children 沿用原引用 —— 轮询接口的典型局部更新
    children[0] = { id: 2, label: 'B-renamed', children: [cData] }
    store.setData(data)

    const b2 = store.getNode(2)!
    expect(b2).toBe(b)
    expect(b2.label).toBe('B-renamed')
    // 换绑走「只摘自身」版注销：后代没离开注册表，按 key 的公开方法照常可用
    const c = store.getNode(3)
    expect(c).not.toBeNull()
    expect(c).toBe(b2.childNodes[0])
    store.remove(3)
    expect(store.getNode(3)).toBeNull()
    expect(b2.childNodes).toHaveLength(0)
  })

  it('直接构造的 Node 缺少 store 时抛错', () => {
    expect(() => new TreeNode({ data: {} })).toThrow('[Node]store is required!')
  })
})
