import { describe, it, expect, vi } from 'vitest'
import { TreeStore } from '../../src/lib/okr-tree/model/tree-store'

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
      {
        id: 12,
        label: '(左)产品研发部',
        children: [{ id: 13, label: '(左)研发-前端' }],
      },
      { id: 16, label: '(左)销售部' },
      // 与右树 id 重复，用于验证 Q2 左右分表
      { id: 9, label: '(左)财务部' },
    ],
  },
]

const filterNodeMethod = (value: string, data: any) => {
  if (!value) return true
  return data.label.indexOf(value) !== -1
}

describe('getNode / 注册表', () => {
  it('按 key / data 对象 / Node 实例获取', () => {
    const data = makeData()
    const store = new TreeStore({ key: 'id', data })
    const n = store.getNode(7)!
    expect(n.label).toBe('销售一部')
    expect(store.getNode(data[0].children[1].children![0])).toBe(n)
    expect(store.getNode(n)).toBe(n)
    expect(store.getNode(999)).toBeNull()
    expect(store.getNode(null)).toBeNull()
  })

  it('未设置 node-key 时 getNode(data) 依赖 $treeNodeId 隐藏标记', () => {
    const data = makeData()
    const store = new TreeStore({ data })
    // 无 key 时 nodesMap 不注册，按 key 查找为空
    expect(store.getNode(1)).toBeNull()
    expect(Object.keys(store.nodesMap)).toHaveLength(0)
  })
})

describe('filter（Q1：全树过滤）', () => {
  it('隐藏不匹配节点，父节点有可见后代时保持可见', () => {
    const store = new TreeStore({
      key: 'id',
      data: makeData(),
      filterNodeMethod,
      showCollapsable: true,
    })
    store.filter('前端')
    expect(store.getNode(3)!.visible).toBe(true)
    expect(store.getNode(4)!.visible).toBe(false)
    expect(store.getNode(2)!.visible).toBe(true)
    expect(store.getNode(6)!.visible).toBe(false)
    expect(store.getNode(7)!.visible).toBe(false)
    expect(store.getNode(9)!.visible).toBe(false)
    // 根自身不匹配但有可见后代
    expect(store.getNode(1)!.visible).toBe(true)
    // 命中路径自动展开
    expect(store.getNode(1)!.expanded).toBe(true)
    expect(store.getNode(2)!.expanded).toBe(true)
  })

  it('空值恢复全部可见（由 filterNodeMethod 对空值返回 true 决定）', () => {
    const store = new TreeStore({ key: 'id', data: makeData(), filterNodeMethod })
    store.filter('前端')
    store.filter('')
    ;[1, 2, 3, 4, 6, 7, 9].forEach((k) => expect(store.getNode(k)!.visible).toBe(true))
  })

  it('第一层节点自身参与过滤（原版永不隐藏第一层）', () => {
    const store = new TreeStore({ key: 'id', data: makeData(), filterNodeMethod })
    store.filter('不存在的关键字')
    expect(store.getNode(1)!.visible).toBe(false)
  })

  it('多根 data 时第二个根的子树也被过滤', () => {
    const data = [
      ...makeData(),
      {
        id: 100,
        label: '第二公司',
        children: [
          { id: 101, label: '二-前端' },
          { id: 102, label: '二-后端' },
        ],
      },
    ]
    const store = new TreeStore({ key: 'id', data, filterNodeMethod })
    store.filter('前端')
    expect(store.getNode(101)!.visible).toBe(true)
    expect(store.getNode(102)!.visible).toBe(false)
    expect(store.getNode(100)!.visible).toBe(true)
    store.filter('财务')
    expect(store.getNode(100)!.visible).toBe(false)
    expect(store.getNode(9)!.visible).toBe(true)
  })

  it('未设置 filterNodeMethod 时抛错', () => {
    const store = new TreeStore({ key: 'id', data: makeData() })
    expect(() => store.filter('x')).toThrow('[Tree] filterNodeMethod is required when filter')
  })
})

describe('OKR 模式（onlyBothTree + leftData）', () => {
  const createOkr = (extra: Record<string, any> = {}) =>
    new TreeStore({
      key: 'id',
      data: makeData(),
      leftData: makeLeftData(),
      onlyBothTree: true,
      direction: 'horizontal',
      showCollapsable: true,
      filterNodeMethod,
      ...extra,
    })

  it('缺 leftData 时抛错', () => {
    expect(
      () =>
        new TreeStore({ key: 'id', data: makeData(), onlyBothTree: true, direction: 'horizontal' })
    ).toThrow('[Tree] leftData is required in onlyBothTree')
  })

  it('左子树挂到第一个根节点的 leftChildNodes，节点标记 isLeftChild', () => {
    const store = createOkr()
    const root = store.root.childNodes[0]
    expect(root.leftChildNodes.map((n) => n.label)).toEqual([
      '(左)产品研发部',
      '(左)销售部',
      '(左)财务部',
    ])
    expect(root.leftChildNodes[0].isLeftChild).toBe(true)
    expect(root.leftChildNodes[0].childNodes[0].label).toBe('(左)研发-前端')
    expect(root.childNodes[0].isLeftChild).toBe(false)
  })

  it('Q2：左右分表，同 key 不互相覆盖，getNode 右树优先', () => {
    const store = createOkr()
    expect(store.nodesMap[9].label).toBe('财务部')
    expect(store.leftNodesMap[9].label).toBe('(左)财务部')
    expect(store.getNode(9)!.label).toBe('财务部')
    // 只存在于左树的 key 回退到左表
    expect(store.getNode(13)!.label).toBe('(左)研发-前端')
  })

  it('Q2：defaultExpandedKeys 对左右两树同时生效', () => {
    const store = createOkr({ defaultExpandedKeys: [13, 3] })
    expect(store.getNode(3)!.expanded).toBe(true)
    expect(store.nodesMap[2].expanded).toBe(true)
    const left13 = store.leftNodesMap[13]
    expect(left13.leftExpanded).toBe(true)
    expect(store.leftNodesMap[12].leftExpanded).toBe(true)
    store.setDefaultExpandedKeys([9])
    expect(store.nodesMap[9].expanded).toBe(true)
    expect(store.leftNodesMap[9].leftExpanded).toBe(true)
  })

  it('左树过滤只作用于左树节点，不影响右树可见性', () => {
    const store = createOkr()
    store.filter('销售')
    store.filter('销售', 'leftChildNodes')
    expect(store.leftNodesMap[16].visible).toBe(true)
    expect(store.leftNodesMap[12].visible).toBe(false)
    expect(store.leftNodesMap[9].visible).toBe(false)
    expect(store.nodesMap[6].visible).toBe(true)
    expect(store.nodesMap[1].visible).toBe(true)
    // 左树命中时根节点左侧容器展开
    expect(store.root.childNodes[0].leftExpanded).toBe(true)

    // 左树全不命中时不得隐藏右树根
    store.filter('财务')
    store.filter('完全不存在', 'leftChildNodes')
    expect(store.nodesMap[1].visible).toBe(true)
    expect(store.nodesMap[9].visible).toBe(true)
  })

  it('关键字只命中左子树时，共用的根节点保持可见（否则整棵树一起卸载）', () => {
    const store = createOkr()
    store.filter('左')
    store.filter('左', 'leftChildNodes')

    // 右树侧一个都不命中、根自身的 label 也不含「左」：旧实现到此把根判成不可见，
    // 而组件的节点根元素是 `v-if="node.visible"`，于是连刚命中的左子树一起从 DOM 摘掉，
    // 页面上什么都不剩（Q1「父节点保持可见」当年只修通了右树这一侧）
    expect(store.nodesMap[6].visible).toBe(false)
    expect(store.nodesMap[1].visible).toBe(true)
    expect(store.leftNodesMap[16].visible).toBe(true)
    expect(store.root.childNodes[0].visible).toBe(true)
    expect(store.root.childNodes[0].leftExpanded).toBe(true)
  })

  it('leftData 变更后重新链接左子树并注销旧左节点', () => {
    const store = createOkr()
    store.setLeftData([{ id: 1, label: 'L', children: [{ id: 200, label: '新左' }] }])
    expect(store.root.childNodes[0].leftChildNodes.map((n) => n.label)).toEqual(['新左'])
    expect(store.leftNodesMap[200]).toBeDefined()
    expect(store.leftNodesMap[12]).toBeUndefined()
  })

  it('右树 data 更新后左子树不丢失（原 1.0.15 bug 场景）', () => {
    const store = createOkr()
    store.setData([{ id: 1, label: 'Right2', children: [{ id: 300, label: 'R' }] }])
    const root = store.root.childNodes[0]
    expect(root.label).toBe('Right2')
    expect(root.leftChildNodes.map((n) => n.label)).toEqual([
      '(左)产品研发部',
      '(左)销售部',
      '(左)财务部',
    ])
  })

  it('current-node-key 初始选中左右同时生效，setCurrentNodeKey(null) 全部清除', () => {
    const store = createOkr({ currentNodeKey: 9 })
    expect(store.nodesMap[9].isCurrent).toBe(true)
    expect(store.leftNodesMap[9].isCurrent).toBe(true)
    expect(store.getCurrentNode()!.label).toBe('财务部')
    store.setCurrentNodeKey(null)
    expect(store.nodesMap[9].isCurrent).toBe(false)
    expect(store.leftNodesMap[9].isCurrent).toBe(false)
    expect(store.getCurrentNode()).toBeNull()
  })
})

describe('选中态', () => {
  it('setCurrentNodeKey / getCurrentNode / 切换清除旧高亮', () => {
    const store = new TreeStore({ key: 'id', data: makeData() })
    store.setCurrentNodeKey(2)
    expect(store.getNode(2)!.isCurrent).toBe(true)
    store.setCurrentNodeKey(6)
    expect(store.getNode(2)!.isCurrent).toBe(false)
    expect(store.getNode(6)!.isCurrent).toBe(true)
    expect(store.getCurrentNode()!.label).toBe('销售部')
    store.setCurrentNodeKey(null)
    expect(store.getNode(6)!.isCurrent).toBe(false)
    expect(store.getCurrentNode()).toBeNull()
  })

  it('setUserCurrentNode 通过 Node 实例设置', () => {
    const store = new TreeStore({ key: 'id', data: makeData() })
    store.setUserCurrentNode(store.getNode(7)!)
    expect(store.getCurrentNode()!.label).toBe('销售一部')
  })

  it('currentNodeKey 初始选中', () => {
    const store = new TreeStore({ key: 'id', data: makeData(), currentNodeKey: 3 })
    expect(store.getCurrentNode()!.label).toBe('研发-前端')
  })
})

describe('contains 与 moveNode 的自环守卫（OKR 左子树）', () => {
  const createOkrStore = () =>
    new TreeStore({
      key: 'id',
      data: [{ id: 'R', label: 'R', children: [{ id: 'R1', label: 'R1' }] }],
      leftData: [
        {
          id: 'L',
          label: 'L',
          children: [{ id: 'L1', label: 'L1', children: [{ id: 'L1a', label: 'L1a' }] }],
        },
      ],
      onlyBothTree: true,
    })

  it('contains 把 leftChildNodes 里的后代算作自己的后代', () => {
    const store = createOkrStore()
    const r = store.getNode('R')!
    expect(store.contains(r, store.getNode('R1')!)).toBe(true)
    expect(store.contains(r, store.getNode('L1')!)).toBe(true)
    expect(store.contains(r, store.getNode('L1a')!)).toBe(true)
    // 反向不该成立：左子树节点与右树根的兄弟无祖先关系
    expect(store.contains(store.getNode('L1')!, r)).toBe(false)
  })

  it('moveNode 拒绝把 OKR 根移进它自己的左子树', () => {
    const store = createOkrStore()
    const visibleBefore = store.getVisibleNodes().length
    expect(store.moveNode('R', 'L1', 'inner')).toBe(false)
    expect(store.getVisibleNodes().length).toBe(visibleBefore)
    expect(store.getNode('L1')!.childNodes.map((n) => n.key)).not.toContain('R')
  })

  it('跨侧移动仍然合法：右树节点可以移进左子树某节点内部', () => {
    const store = createOkrStore()
    expect(store.moveNode('R1', 'L1', 'inner')).toBe(true)
    expect(store.getNode('L1')!.childNodes.map((n) => n.key)).toContain('R1')
  })
})

describe('collectCheckState（2.5：check 事件合并为一次遍历）', () => {
  const createCheckedStore = () => {
    const store = new TreeStore({
      key: 'id',
      data: [
        {
          id: 1,
          label: 'R',
          children: [
            { id: 11, label: 'A' },
            { id: 12, label: 'B' },
          ],
        },
      ],
      leftData: [
        {
          id: 100,
          label: 'L',
          children: [
            { id: 101, label: 'LA' },
            { id: 102, label: 'LB' },
          ],
        },
      ],
      onlyBothTree: true,
      showCheckbox: true,
    })
    store.setCheckedKeys([11, 101])
    // 再直接勾上一个非叶子父节点：夹具若只有叶子被勾，leafOnly 两侧会同时错，等价断言咬不住它
    store.getNode(1)!.checked = true
    return store
  }

  it('四份输出与四个公开 getter 逐字一致（含 leafOnly 与左右两树）', () => {
    const store = createCheckedStore()
    for (const leafOnly of [false, true]) {
      const state = store.collectCheckState(leafOnly)
      expect(state.checkedNodes.map((n) => n.id)).toEqual(
        store.getCheckedNodes(leafOnly).map((n) => n.id)
      )
      expect(state.checkedKeys).toEqual(store.getCheckedKeys(leafOnly))
      expect(state.halfCheckedNodes.map((n) => n.id)).toEqual(
        store.getHalfCheckedNodes().map((n) => n.id)
      )
      expect(state.halfCheckedKeys).toEqual(store.getHalfCheckedKeys())
    }
    // 内容本身也要对得上，否则上面四条可能同时错在一处（sort 必须给比较器，默认按字符串排）
    expect(store.collectCheckState().checkedKeys.sort((a, b) => Number(a) - Number(b))).toEqual([
      1, 11, 101,
    ])
    // 1 既 checked 就不该再出现在半选里（getHalfCheckedNodes 的 !checked 条件）
    expect(store.collectCheckState().halfCheckedKeys).toEqual([100])
    // leafOnly=true 要把「直接勾上的非叶子 1」排除掉，只留两个叶子
    expect(store.collectCheckState(true).checkedKeys.sort((a, b) => Number(a) - Number(b))).toEqual(
      [11, 101]
    )
  })

  it('一次收集只走一遍全树，而朴素四调法走四遍', () => {
    const store = createCheckedStore()
    const spy = vi.spyOn(store, 'forEachNode')
    store.collectCheckState()
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockClear()
    store.getCheckedNodes()
    store.getCheckedKeys()
    store.getHalfCheckedNodes()
    store.getHalfCheckedKeys()
    expect(spy).toHaveBeenCalledTimes(4)
    spy.mockRestore()
  })
})
