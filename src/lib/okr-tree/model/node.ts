import { shallowReactive } from 'vue'
import { markNodeData, getNodeKey, warnReadonlySource } from './util'
import type { TreeStore } from './tree-store'
import type { TreeKey, TreeNodeData } from '../../../types'

const getPropertyFromData = function (node: TreeNode, prop: string) {
  const props: Record<string, any> = node.store.props || {}
  const data = node.data || {}
  const config = props[prop]

  if (typeof config === 'function') {
    return config(data, node)
  } else if (typeof config === 'string') {
    return data[config]
  } else if (typeof config === 'undefined') {
    const dataProp = data[prop]
    return dataProp === undefined ? '' : dataProp
  }
}

let nodeIdSeed = 0

export interface TreeNodeOptions {
  data?: TreeNodeData | TreeNodeData[] | null
  store?: TreeStore
  parent?: TreeNode | null
  [key: string]: any
}

/** 子节点容器：shallowReactive 数组，push/splice 可触发视图更新，元素本身保持代理 Node */
export const createChildNodes = () => shallowReactive<TreeNode[]>([]) as TreeNode[]

/**
 * 数据节点模型。
 *
 * 响应式约定（requirements 5.3.2）：
 * - 实例通过 createNode() 用 shallowReactive 包装，expanded / leftExpanded / isCurrent / visible /
 *   childNodes / leftChildNodes 等顶层状态字段的赋值可驱动视图更新；
 * - data（用户源数据）不做任何包装，保持传入时的引用；
 * - 初始化逻辑在 init() 中通过代理执行，保证子节点的 parent 与 store 注册表中持有的都是代理实例。
 */
export class TreeNode {
  id: number
  data: any = null
  expanded = false
  leftExpanded = false
  isCurrent = false
  visible = true
  /** 复选框（show-checkbox）：选中态；父子节点是否联动由 store.checkStrictly 决定 */
  checked = false
  /** 复选框（show-checkbox）：半选态（有子树部分选中），由子节点重算得出 */
  indeterminate = false
  parent: TreeNode | null = null
  level = 0
  isLeaf = false
  /** 懒加载：子节点是否已加载（非 lazy 模式恒为 true） */
  loaded = false
  /** 懒加载：load 进行中（并发触发展开只发起一次 load） */
  loading = false
  childNodes: TreeNode[]
  leftChildNodes: TreeNode[]
  isLeftChild: boolean
  store!: TreeStore
  /** 懒加载完成（成功或失败）后依次执行的回调 */
  loadCallbacks: Array<(success: boolean) => void> = []

  constructor(options: TreeNodeOptions, isLeftChild = false) {
    this.isLeftChild = isLeftChild
    this.id = nodeIdSeed++
    for (const name in options) {
      if (Object.prototype.hasOwnProperty.call(options, name)) {
        ;(this as any)[name] = options[name]
      }
    }
    this.level = 0
    this.childNodes = createChildNodes()
    this.leftChildNodes = createChildNodes()

    if (this.parent) {
      this.level = this.parent.level + 1
    }
    if (!this.store) {
      throw new Error('[Node]store is required!')
    }
  }

  /** 构建子树与初始状态（由 createNode 在代理上调用） */
  init(isLeftChild: boolean) {
    const store = this.store
    if (this.data) {
      this.setData(this.data, isLeftChild)
      if (store.defaultExpandAll || !store.showCollapsable) {
        this.expanded = true
        this.leftExpanded = true
      }
    }

    if (!Array.isArray(this.data)) {
      markNodeData(this, this.data)
    }
    if (!this.data) return
    const defaultExpandedKeys = store.defaultExpandedKeys
    const key = store.key
    if (key && defaultExpandedKeys && defaultExpandedKeys.indexOf(this.key as TreeKey) !== -1) {
      this.expand(true)
    }
    // current-node-key 初始选中由 TreeStore 构造末尾统一处理（Q2：左右两树同时生效、无残留高亮）
    this.updateLeafState()
  }

  setData(data: any, isLeftChild: boolean = this.isLeftChild) {
    if (!Array.isArray(data)) {
      markNodeData(this, data)
    }
    this.data = data
    // 注销旧子树，避免 nodesMap 残留过期节点
    this.childNodes.forEach((child) => this.store.deregisterNode(child))
    this.childNodes = createChildNodes()
    let children: any[]
    if (this.level === 0 && Array.isArray(this.data)) {
      children = this.data
    } else {
      children = getPropertyFromData(this, 'children') || []
    }
    for (let i = 0, j = children.length; i < j; i++) {
      this.insertChild({ data: children[i] }, null, null, isLeftChild)
    }
    // 懒加载：初始构建时已带 children 的节点视为已加载；没有 children（或为空数组）的
    // 节点视为未加载，首次展开时触发 load。非 lazy 模式全部视为已加载。
    this.loaded = !this.store.lazy || children.length > 0
  }

  /**
   * data 引用未变、内部原地变更时，按当前源数据增量重建子树（requirements Q4）。
   * 尽量复用已有子节点（先按 data 引用、再按 key 匹配），保留 expanded / leftExpanded / isCurrent 状态。
   */
  updateChildren() {
    const store = this.store
    const childrenKey = (store.props && store.props.children) || 'children'
    let newData: any[]
    if (this.level === 0) {
      newData = Array.isArray(this.data) ? this.data : []
    } else {
      newData = (this.data && this.data[childrenKey]) || []
    }

    // 脏检查（Q4 增量语义 + 1.5.0 性能）：源 children 与现有 childNodes 逐项同引用且数量一致时，
    // 本层结构未变——跳过本层重建（不做 Map 匹配、不 splice 触发无谓重渲染），仅向下做廉价检查。
    // 深层结构变更（如孙子层 push）会在对应层级各自命中脏检查后重建。
    const currentNodes = this.childNodes
    if (
      currentNodes.length === newData.length &&
      currentNodes.every((n, i) => n.data === newData[i])
    ) {
      currentNodes.forEach((child) => child.updateChildren())
      return
    }

    const oldNodes = this.childNodes.slice()
    const byData = new Map<any, TreeNode>()
    oldNodes.forEach((n) => byData.set(n.data, n))
    const used = new Set<TreeNode>()
    // key 回退索引：同层整批换引用时，原来的 oldNodes.find 会让该层退化到 O(s²)。
    // 桶而不是单值：find 的语义是「跳过已用过的」，同层重复 key 时后面的项要能命中第二个。
    // 键不做 String 归一：Map 的 SameValueZero 与原来的 === 一样区分 11 与 '11'。
    const byKey = new Map<any, TreeNode[]>()
    if (store.key) {
      oldNodes.forEach((n) => {
        if (n.key === undefined) return
        const bucket = byKey.get(n.key)
        if (bucket) bucket.push(n)
        else byKey.set(n.key, [n])
      })
    }

    const next: TreeNode[] = []
    for (let i = 0; i < newData.length; i++) {
      const childData = newData[i]
      let node = byData.get(childData)
      if ((!node || used.has(node)) && store.key && childData && typeof childData === 'object') {
        const bucket = byKey.get(childData[store.key])
        node = bucket && bucket.find((n) => !used.has(n))
      }
      if (node && !used.has(node)) {
        used.add(node)
        if (node.data !== childData) {
          // key 相同但引用变化：换绑源数据并重新注册
          store.deregisterNodeSelf(node)
          node.data = childData
          markNodeData(node, childData)
          store.registerNode(node)
        }
        node.parent = this
        node.level = this.level + 1
        node.updateChildren()
      } else {
        node = createNode({ data: childData, parent: this, store }, this.isLeftChild)
        node.level = this.level + 1
        used.add(node)
      }
      next.push(node)
    }

    oldNodes.forEach((n) => {
      if (!used.has(n)) {
        store.deregisterNode(n)
        if (store.currentNode === n) store.currentNode = null
        if (store.currentLeftNode === n) store.currentLeftNode = null
        n.parent = null
      }
    })

    const target = this.childNodes
    target.splice(0, target.length, ...next)
    // 与 setData 一致：重建后按源数据是否带 children 刷新懒加载状态
    this.loaded = !store.lazy || newData.length > 0
    this.updateLeafState()
    // 复用的节点保留勾选态、新节点默认未勾选，按子树重算自身与祖先的全选 / 半选
    this.refreshCheckedUpward()
  }

  get key(): TreeKey | undefined {
    const nodeKey = this.store.key
    if (this.data && nodeKey) return this.data[nodeKey]
    return undefined
  }

  get label(): string {
    return getPropertyFromData(this, 'label')
  }

  get disabled(): boolean {
    return !!getPropertyFromData(this, 'disabled')
  }

  insertChild(
    child: TreeNodeOptions | TreeNode,
    index?: number | null,
    batch?: boolean | null,
    isLeftChild?: boolean
  ) {
    if (!child) throw new Error('insertChild error: child is required.')
    let node: TreeNode
    if (!(child instanceof TreeNode)) {
      if (!batch) {
        const children = this.getChildren(true)
        if (children && children.indexOf(child.data) === -1) {
          try {
            if (index === undefined || index === null || index < 0) {
              children.push(child.data)
            } else {
              children.splice(index, 0, child.data)
            }
          } catch {
            // 冻结/只读源数据：跳过回写（视图仍会插入节点）并给出开发期警告
            warnReadonlySource('append / insert（写入 children）')
          }
        }
      }
      node = createNode(
        { ...child, parent: this, store: this.store },
        isLeftChild === undefined ? this.isLeftChild : isLeftChild
      )
    } else {
      node = child
      node.parent = this
    }
    node.level = this.level + 1
    if (index === undefined || index === null || index < 0) {
      this.childNodes.push(node)
    } else {
      this.childNodes.splice(index, 0, node)
    }
    this.updateLeafState()
    // 新子节点默认未勾选，可能改变自身的全选 / 半选（进而影响祖先）
    this.refreshCheckedUpward()
  }

  getChildren(forceInit = false): any[] | null {
    if (this.level === 0) return this.data
    const data = this.data
    if (!data) return null

    const props = this.store.props
    let children = 'children'
    if (props) {
      children = props.children || 'children'
    }

    // 冻结/只读源数据：占位与初始化写入会抛 TypeError，降级为跳过写入并给出开发期警告
    if (data[children] === undefined) {
      try {
        data[children] = null
      } catch {
        /* 只读数据：跳过占位写入 */
      }
    }

    if (forceInit && !data[children]) {
      try {
        data[children] = []
      } catch {
        warnReadonlySource('append / insert（写入 children）')
        return null
      }
    }

    return data[children]
  }

  updateLeafState() {
    // 懒加载：未加载节点的 isLeaf 由 props.isLeaf 字段（或函数）决定，默认视为有子节点
    if (this.store.lazy && !this.loaded && this.level > 0) {
      const isLeafProp = this.store.props && (this.store.props as any).isLeaf
      this.isLeaf = isLeafProp === undefined ? false : !!getPropertyFromData(this, 'isLeaf')
      return
    }
    const childNodes = this.childNodes
    this.isLeaf = !childNodes || childNodes.length === 0
  }

  /** 节点的收起 */
  collapse() {
    this.expanded = false
  }

  /**
   * 复选框选中：checkStrictly 下只改自身；否则 deep（默认）时向下联动全部后代
   * （含 disabled 节点，与 el-tree 一致——disabled 仅阻止直接点击），并向上重算祖先的
   * 选中 / 半选态。indeterminate 只能由 refreshCheckedUpward 从子节点推导，不直接置位。
   */
  setChecked(value: boolean, deep = !this.store.checkStrictly) {
    if (this.store.checkStrictly) {
      this.checked = value
      this.indeterminate = false
      return
    }
    this.checked = value
    this.indeterminate = false
    if (deep) {
      const walk = (node: TreeNode) => {
        node.checked = value
        node.indeterminate = false
        node.childNodes.forEach(walk)
      }
      this.childNodes.forEach(walk)
    }
    this.parent?.refreshCheckedUpward()
  }

  /**
   * 由子节点重算自身选中 / 半选，并继续向上重算全部祖先（checkStrictly 下不联动）。
   * 勾选联动、增删子节点、懒加载完成后共用。
   */
  refreshCheckedUpward() {
    if (this.store.checkStrictly) return
    let node: TreeNode | null = this
    while (node && node.level > 0) {
      const children = node.childNodes
      if (children.length > 0) {
        const all = children.every((c) => c.checked)
        const some = children.some((c) => c.checked || c.indeterminate)
        node.checked = all
        node.indeterminate = !all && some
      }
      node = node.parent
    }
  }

  /**
   * 节点的展开；expandParent 为 true 时连同祖先一起展开。
   * 懒加载模式下展开未加载节点会先触发 load，resolve 后写入源数据 children、构建子节点，再展开；
   * reject / load 抛错时保持折叠态（可重试）。
   */
  expand(expandParent = false) {
    const store = this.store
    const doExpand = () => {
      if (expandParent) {
        let parent = this.parent
        while (parent && parent.level > 0) {
          parent.expand(false)
          parent = parent.parent
        }
      }
      if (this.isLeftChild) this.leftExpanded = true
      else this.expanded = true
    }
    if (store.lazy && store.load && !this.loaded && !this.isLeaf && this.level > 0) {
      this.loadData((success) => {
        if (!success) return
        doExpand()
        store.onExpandSettled?.()
      })
      return
    }
    doExpand()
  }

  /**
   * 触发懒加载：调用 store.load，resolve 后经 insertChild 同步写入源数据 children 并构建子节点。
   * 加载中重复调用只会登记回调，不重复发起 load；完成（成功或失败）后依次执行全部回调。
   */
  loadData(onSettled?: (success: boolean) => void) {
    const store = this.store
    if (!store.lazy || !store.load || this.loaded || this.level === 0) {
      onSettled?.(this.loaded)
      return
    }
    if (onSettled) this.loadCallbacks.push(onSettled)
    if (this.loading) return
    this.loading = true
    const node = this
    const resolve = (children?: TreeNodeData[]) => {
      if (node.loading) node.finishLoad(true, children)
    }
    const reject = () => {
      if (node.loading) node.finishLoad(false)
    }
    try {
      store.load(this, resolve, reject)
    } catch (error) {
      // load 同步抛错：回到折叠态且可重试
      node.finishLoad(false)
      console.error('[vue3-okr-tree] load 函数执行出错:', error)
    }
  }

  private finishLoad(success: boolean, children?: TreeNodeData[]) {
    const callbacks = this.loadCallbacks
    this.loadCallbacks = []
    this.loading = false
    if (success) {
      this.loaded = true
      if (Array.isArray(children)) {
        for (const childData of children) {
          // insertChild 会同步写入源数据 children（与 append 语义一致）并构建子节点
          this.insertChild({ data: childData })
        }
      }
    }
    this.updateLeafState()
    callbacks.forEach((cb) => cb(success))
  }

  /** 等待该节点未完成的懒加载结束；已加载或非懒加载时立即 resolve */
  whenLoaded(): Promise<boolean> {
    if (!this.store.lazy || this.loaded || this.level === 0) {
      return Promise.resolve(this.loaded)
    }
    return new Promise((resolve) => this.loadCallbacks.push(resolve))
  }

  removeChild(child: TreeNode) {
    const children = this.getChildren() || []
    const dataIndex = children.indexOf(child.data)
    if (dataIndex > -1) {
      try {
        children.splice(dataIndex, 1)
      } catch {
        // 深层冻结的 children 数组：跳过源数据删除并给出开发期警告，视图仍正常移除
        warnReadonlySource('remove（从 children 删除）')
      }
    }

    const index = this.childNodes.indexOf(child)

    if (index > -1) {
      if (this.store) this.store.deregisterNode(child)
      child.parent = null
      this.childNodes.splice(index, 1)
    }

    this.updateLeafState()
    this.refreshCheckedUpward()
  }

  insertBefore(child: TreeNodeOptions | TreeNode, ref?: TreeNode) {
    let index: number | undefined
    if (ref) {
      index = this.childNodes.indexOf(ref)
    }
    this.insertChild(child, index)
  }

  insertAfter(child: TreeNodeOptions | TreeNode, ref?: TreeNode) {
    let index: number | undefined
    if (ref) {
      index = this.childNodes.indexOf(ref)
      if (index !== -1) index += 1
    }
    this.insertChild(child, index)
  }
}

/**
 * 创建节点：包装为 shallowReactive 代理后再执行初始化与注册，
 * 保证子节点 parent、store 注册表持有的都是代理实例（否则通过裸实例修改状态不会触发视图更新）。
 */
export function createNode(options: TreeNodeOptions, isLeftChild = false): TreeNode {
  const node = shallowReactive(new TreeNode(options, isLeftChild)) as TreeNode
  node.init(isLeftChild)
  node.store.registerNode(node)
  return node
}

export { getNodeKey }
