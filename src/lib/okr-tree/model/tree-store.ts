import { TreeNode, createNode, createChildNodes } from './node'
import { getNodeKey, warn } from './util'
import type {
  FilterNodeMethod,
  LabelClassName,
  TreeDirection,
  TreeKey,
  TreeLoadFunction,
  TreeNodeData,
  TreeOptionProps,
} from '../../../types'

export interface TreeStoreOptions {
  key?: string
  data: TreeNodeData[]
  leftData?: TreeNodeData[] | null
  props?: TreeOptionProps
  defaultExpandedKeys?: TreeKey[] | null
  showCollapsable?: boolean
  currentNodeKey?: TreeKey | null
  defaultExpandAll?: boolean
  filterNodeMethod?: FilterNodeMethod | null
  labelClassName?: LabelClassName | null
  currentLableClassName?: LabelClassName | null
  onlyBothTree?: boolean
  direction?: TreeDirection
  animate?: boolean
  animateName?: string
  animateDuration?: number
  /** 懒加载：开启后未加载节点首次展开时调用 load */
  lazy?: boolean
  /** 懒加载取数函数（配合 lazy 使用） */
  load?: TreeLoadFunction | null
  /** 手风琴模式：用户展开某节点时自动收起其同级兄弟 */
  accordion?: boolean
  /** 点击节点内容时切换展开/收起 */
  expandOnClickNode?: boolean
  /** 复选框选择模式：节点前渲染复选框，父子联动半选态 */
  showCheckbox?: boolean
  /** 复选框父子不联动（勾选只作用于自身，无半选传播） */
  checkStrictly?: boolean
  /** 初始勾选的节点 key 数组（需 node-key，创建期生效） */
  defaultCheckedKeys?: TreeKey[] | null
}

/** 字段映射默认值（导出供 OkrTree 运行时同步 props 合并使用） */
export const DEFAULT_PROPS: Readonly<TreeOptionProps> = {
  children: 'children',
  label: 'label',
  disabled: 'disabled',
}

type ChildName = 'childNodes' | 'leftChildNodes'

/**
 * 树的数据仓库：节点注册表、过滤、选中态、增删改。
 * 纯 TS 类，不依赖组件；节点实例由 createNode 产生（shallowReactive 代理）。
 */
export class TreeStore {
  key?: string
  data!: TreeNodeData[]
  leftData?: TreeNodeData[] | null
  props: TreeOptionProps = DEFAULT_PROPS
  defaultExpandedKeys?: TreeKey[] | null
  showCollapsable = false
  currentNodeKey?: TreeKey | null
  defaultExpandAll = false
  filterNodeMethod?: FilterNodeMethod | null
  labelClassName?: LabelClassName | null
  currentLableClassName?: LabelClassName | null
  onlyBothTree = false
  direction: TreeDirection = 'vertical'
  animate = false
  animateName = 'okr-zoom-in-center'
  animateDuration = 200
  lazy = false
  load: TreeLoadFunction | null = null
  accordion = false
  expandOnClickNode = false
  showCheckbox = false
  checkStrictly = false
  defaultCheckedKeys?: TreeKey[] | null = undefined
  /**
   * 懒加载展开完成后由组件设置的通知钩子（同步 v-model:expanded-keys）；
   * reject 时不会触发（展开集合未变化）。
   */
  onExpandSettled?: () => void = undefined

  /** 当前选中节点（右树 / 非 OKR 模式） */
  currentNode: TreeNode | null = null
  /** OKR 模式下左树的当前选中节点 */
  currentLeftNode: TreeNode | null = null
  /** 右树（默认树）节点注册表 */
  nodesMap: Record<string, TreeNode> = {}
  /** 左树节点注册表（requirements Q2：左右分表，避免同 key 互相覆盖） */
  leftNodesMap: Record<string, TreeNode> = {}
  root!: TreeNode
  /** 由 leftData 构建的临时左树根 */
  isLeftChilds: TreeNode | null = null

  constructor(options: TreeStoreOptions) {
    for (const option in options) {
      if (Object.prototype.hasOwnProperty.call(options, option)) {
        ;(this as any)[option] = (options as any)[option]
      }
    }
    this.props = { ...DEFAULT_PROPS, ...(options.props || {}) }
    this.nodesMap = {}
    this.leftNodesMap = {}
    this.root = createNode(
      {
        data: this.data,
        store: this,
      },
      false
    )

    this.setLeftData(this.leftData)

    if (this.key && this.currentNodeKey !== undefined && this.currentNodeKey !== null) {
      this.setCurrentNodeKey(this.currentNodeKey)
    }

    this.initDefaultChecked()
  }

  filter(value: any, childName: ChildName = 'childNodes') {
    this.filterRight(value, childName)
  }

  /**
   * 过滤（requirements Q1 修复版）：从全部根节点遍历，所有节点执行 filterNodeMethod，
   * 父节点自身不匹配但存在可见后代时保持可见；value 非空时自动展开可见节点。
   * childName 只影响顶层取值：'childNodes' 过滤右树，'leftChildNodes' 过滤 OKR 左树。
   */
  filterRight(value: any, childName: ChildName) {
    const filterNodeMethod = this.filterNodeMethod
    if (!filterNodeMethod) throw new Error('[Tree] filterNodeMethod is required when filter')

    const traverse = (node: TreeNode) => {
      const childNodes = node.childNodes
      childNodes.forEach((child) => {
        child.visible = filterNodeMethod.call(child, value, child.data, child)
        traverse(child)
      })

      if (!node.visible && childNodes.length) {
        const allHidden = !childNodes.some((child) => child.visible)
        node.visible = allHidden === false
      }
      if (!value) return

      // 懒加载模式下未加载的节点没有可展开的子树，过滤不触发 load
      if (node.visible && (!this.lazy || !this.load || node.loaded)) node.expand()
    }

    // Q1：遍历全部根节点（原版只遍历 root.childNodes[0]，多根数据会漏过滤）
    this.root.childNodes.forEach((rootNode) => {
      const list: TreeNode[] = rootNode[childName] || []
      list.forEach((child) => {
        child.visible = filterNodeMethod.call(child, value, child.data, child)
        traverse(child)
      })

      if (childName === 'childNodes') {
        // 根节点自身也参与过滤；不匹配但存在可见后代时保持可见
        rootNode.visible = filterNodeMethod.call(rootNode, value, rootNode.data, rootNode)
        if (!rootNode.visible && list.length) {
          rootNode.visible = list.some((child) => child.visible)
        }
        if (value && rootNode.visible) rootNode.expand()
      } else if (value && list.some((child) => child.visible)) {
        // 左树过滤：命中时展开根节点的左侧容器（不改动右树节点可见性）
        rootNode.leftExpanded = true
      }
    })
  }

  registerNode(node: TreeNode) {
    const key = this.key
    if (!key || !node || !node.data) return

    const nodeKey = node.key
    if (nodeKey !== undefined) {
      const map = node.isLeftChild ? this.leftNodesMap : this.nodesMap
      const existing = map[nodeKey as string]
      if (existing && existing !== node && existing.parent) {
        warn(
          `检测到重复的 node-key "${String(nodeKey)}"（${node.isLeftChild ? '左树' : '右树'}），` +
            '后注册的节点会覆盖先注册的节点，getNode / setCurrentKey 等按 key 查找的方法可能返回错误节点。'
        )
      }
      map[nodeKey as string] = node
    }
  }

  deregisterNode(node: TreeNode) {
    const key = this.key
    if (!key || !node || !node.data) return
    node.childNodes.forEach((child) => {
      this.deregisterNode(child)
    })
    const map = node.isLeftChild ? this.leftNodesMap : this.nodesMap
    const nodeKey = node.key as string
    if (nodeKey !== undefined && map[nodeKey] === node) {
      delete map[nodeKey]
    }
  }

  setData(newVal: TreeNodeData[]) {
    const instanceChanged = newVal !== this.root.data
    if (instanceChanged) {
      this.root.setData(newVal)
    } else {
      this.root.updateChildren()
    }
    this.setLeftData(this.leftData)
  }

  setLeftData(leftData?: TreeNodeData[] | null) {
    if (!this.onlyBothTree) return
    if (!leftData) throw new Error('[Tree] leftData is required in onlyBothTree')
    this.leftData = leftData

    // 注销旧左树
    if (this.isLeftChilds) {
      this.isLeftChilds.childNodes.forEach((child) => this.deregisterNode(child))
    }
    this.isLeftChilds = createNode(
      {
        data: leftData,
        store: this,
      },
      true
    )
    const firstRoot = this.root.childNodes[0]
    const leftRoot = this.isLeftChilds.childNodes[0]
    if (firstRoot) {
      firstRoot.leftChildNodes = leftRoot ? leftRoot.childNodes : createChildNodes()
      firstRoot.leftExpanded = leftRoot ? leftRoot.leftExpanded : true
    }
  }

  /** 用新数据替换 key 节点的全部子节点 */
  updateChildren(key: TreeKey, data: TreeNodeData[]) {
    const node = this.nodesMap[key as string]
    if (!node) return
    const childNodes = node.childNodes
    for (let i = childNodes.length - 1; i >= 0; i--) {
      this.remove(childNodes[i])
    }
    for (let i = 0, j = data.length; i < j; i++) {
      this.append(data[i], node)
    }
  }

  /**
   * 按 Node 实例 / key / data 对象获取节点。
   * 右树优先（Q2），右树查不到时回退到左树。
   */
  getNode(data: TreeNode | TreeKey | TreeNodeData | null | undefined): TreeNode | null {
    if (data === null || data === undefined) return null
    if (data instanceof TreeNode) return data
    const key = typeof data !== 'object' ? data : getNodeKey(this.key, data)
    if (key === undefined || key === null) return null
    return this.nodesMap[key as string] || this.leftNodesMap[key as string] || null
  }

  setDefaultExpandedKeys(keys?: TreeKey[] | null) {
    keys = keys || []
    this.defaultExpandedKeys = keys
    keys.forEach((key) => {
      const right = this.nodesMap[key as string]
      const left = this.leftNodesMap[key as string]
      if (right) right.expand(true)
      if (left) left.expand(true)
    })
  }

  setCurrentNode(currentNode: TreeNode) {
    if (currentNode.isLeftChild) {
      const prev = this.currentLeftNode
      if (prev && prev !== currentNode) prev.isCurrent = false
      this.currentLeftNode = currentNode
    } else {
      const prev = this.currentNode
      if (prev && prev !== currentNode) prev.isCurrent = false
      this.currentNode = currentNode
    }
    currentNode.isCurrent = true
  }

  /** 遍历右树与左树的全部节点（不含两个虚拟根） */
  forEachNode(callback: (node: TreeNode) => void) {
    const walk = (parent: TreeNode) => {
      parent.childNodes.forEach((child) => {
        callback(child)
        walk(child)
      })
    }
    walk(this.root)
    if (this.isLeftChilds) walk(this.isLeftChilds)
  }

  /** 展开全部节点（左右两树）；懒加载节点会先触发加载、完成后再展开 */
  expandAll() {
    this.forEachNode((node) => {
      if (this.lazy && this.load && !node.loaded && node.level > 0) {
        node.expand(false)
        if (this.onlyBothTree && node.level === 1 && !node.isLeftChild) node.leftExpanded = true
        return
      }
      node.expanded = true
      node.leftExpanded = true
    })
  }

  /** 收起全部节点（左右两树） */
  collapseAll() {
    this.forEachNode((node) => {
      node.expanded = false
      node.leftExpanded = false
    })
  }

  /**
   * 展开指定节点；expandParent 为 true 时连同祖先一起展开。
   * OKR 模式下对根节点调用会同时展开左右两侧。
   */
  expandNode(data: TreeNode | TreeKey | TreeNodeData, expandParent = true): TreeNode | null {
    const node = this.getNode(data)
    if (!node) return null
    node.expand(expandParent)
    if (this.onlyBothTree && node.level === 1 && !node.isLeftChild) node.leftExpanded = true
    return node
  }

  /** 收起指定节点。OKR 模式下对根节点调用会同时收起左右两侧 */
  collapseNode(data: TreeNode | TreeKey | TreeNodeData): TreeNode | null {
    const node = this.getNode(data)
    if (!node) return null
    if (node.isLeftChild) node.leftExpanded = false
    else node.expanded = false
    if (this.onlyBothTree && node.level === 1 && !node.isLeftChild) node.leftExpanded = false
    return node
  }

  /**
   * accordion（手风琴）：收起 node 的同级兄弟。
   * 语义与 el-tree 一致——只在用户交互展开（点击 +/-、点击节点内容、键盘操作）时由组件层调用，
   * expandNode 等程序化方法与受控 expanded-keys 不经此路径，不受互斥限制。
   */
  collapseSiblings(node: TreeNode) {
    const parent = node.parent
    if (!parent) return
    parent.childNodes.forEach((child) => {
      if (child === node) return
      if (child.isLeftChild) child.leftExpanded = false
      else child.expanded = false
    })
  }

  /**
   * 应用 default-checked-keys：对左右两树同 key 节点同时生效（与 setCurrentNodeKey 一致），
   * 非 checkStrictly 时带父子联动（勾选 key 节点会覆盖其后代、重算祖先）。
   */
  initDefaultChecked() {
    const keys = this.defaultCheckedKeys
    if (!keys || !keys.length || !this.key) return
    keys.forEach((key) => {
      const right = this.nodesMap[key as string]
      const left = this.leftNodesMap[key as string]
      if (right) right.setChecked(true, !this.checkStrictly)
      if (left) left.setChecked(true, !this.checkStrictly)
    })
  }

  /** 以新列表重新应用默认勾选：先清空全部勾选 / 半选，再按列表勾选（default-checked-keys 运行时变更） */
  setDefaultCheckedKeys(keys?: TreeKey[] | null) {
    this.defaultCheckedKeys = keys || []
    this.forEachNode((node) => {
      node.checked = false
      node.indeterminate = false
    })
    this.initDefaultChecked()
  }

  /** 勾选节点实例列表（左右两树）；leafOnly 为 true 时只计叶子节点 */
  getCheckedNodes(leafOnly = false): TreeNode[] {
    const nodes: TreeNode[] = []
    this.forEachNode((node) => {
      if (!node.checked) return
      if (leafOnly && !node.isLeaf) return
      nodes.push(node)
    })
    return nodes
  }

  /** 勾选节点 key 列表（需 node-key；左右两树合并去重）；leafOnly 为 true 时只计叶子节点 */
  getCheckedKeys(leafOnly = false): TreeKey[] {
    if (!this.key) return []
    const keys: TreeKey[] = []
    const seen = new Set<string>()
    this.getCheckedNodes(leafOnly).forEach((node) => {
      const key = node.key
      if (key === undefined || key === null) return
      const sig = String(key)
      if (seen.has(sig)) return
      seen.add(sig)
      keys.push(key)
    })
    return keys
  }

  /** 半选节点实例列表（子树部分选中的父节点） */
  getHalfCheckedNodes(): TreeNode[] {
    const nodes: TreeNode[] = []
    this.forEachNode((node) => {
      if (node.indeterminate && !node.checked) nodes.push(node)
    })
    return nodes
  }

  /** 半选节点 key 列表（需 node-key；左右两树合并去重） */
  getHalfCheckedKeys(): TreeKey[] {
    if (!this.key) return []
    const keys: TreeKey[] = []
    const seen = new Set<string>()
    this.getHalfCheckedNodes().forEach((node) => {
      const key = node.key
      if (key === undefined || key === null) return
      const sig = String(key)
      if (seen.has(sig)) return
      seen.add(sig)
      keys.push(key)
    })
    return keys
  }

  /** 节点（Node / key / data）当前是否被勾选；未找到时为 false */
  isChecked(data: TreeNode | TreeKey | TreeNodeData): boolean {
    return this.getNode(data)?.checked ?? false
  }

  /**
   * 以 key 列表整体设置勾选态（需 node-key；左右两树同 key 同时生效）。
   * 非 checkStrictly 时与点击语义一致：列表内的父节点会联动其后代、重算祖先；
   * leafOnly 为 true 时只逐个勾选列表中的叶子（不向下联动）。
   */
  setCheckedKeys(keys: TreeKey[] | null | undefined, leafOnly = false) {
    const set = new Set((keys || []).map((k) => String(k)))
    const all: TreeNode[] = []
    this.forEachNode((node) => {
      all.push(node)
      node.checked = false
      node.indeterminate = false
    })
    all.forEach((node) => {
      if (node.key === undefined || node.key === null) return
      if (!set.has(String(node.key))) return
      node.setChecked(true, leafOnly ? false : !this.checkStrictly)
    })
  }

  /** 当前处于展开态的节点 key 列表（需 node-key；左右两树去重） */
  getExpandedKeys(): TreeKey[] {
    if (!this.key) return []
    const keys: TreeKey[] = []
    const seen = new Set<string>()
    this.forEachNode((node) => {
      const key = node.key
      if (key === undefined || key === null) return
      const expanded = node.isLeftChild ? node.leftExpanded : node.expanded
      if (!expanded) return
      const sig = String(key)
      if (seen.has(sig)) return
      seen.add(sig)
      keys.push(key)
    })
    return keys
  }

  /**
   * 以 key 列表整体设置展开态：列表内的节点展开、其余节点收起（受控模式）。
   * OKR 模式下根节点的左右两侧跟随根节点 key；列表内的懒加载未加载节点触发加载、完成后展开。
   */
  setExpandedKeys(keys: TreeKey[] | null | undefined) {
    const set = new Set((keys || []).map((k) => String(k)))
    this.forEachNode((node) => {
      const key = node.key
      if (key === undefined || key === null) return
      const on = set.has(String(key))
      if (on) {
        // expand 内部处理懒加载：完成后由 onExpandSettled 同步受控值
        node.expand(false)
      } else if (node.isLeftChild) {
        node.leftExpanded = false
      } else {
        node.expanded = false
      }
      if (this.onlyBothTree && node.level === 1 && !node.isLeftChild) node.leftExpanded = on
    })
  }

  /** 通过 node 设置选中（按其所在树的注册表取规范实例） */
  setUserCurrentNode(node: TreeNode) {
    const map = node.isLeftChild ? this.leftNodesMap : this.nodesMap
    const currNode = (node.key !== undefined && map[node.key as string]) || node
    this.setCurrentNode(currNode)
  }

  clearCurrent() {
    if (this.currentNode) this.currentNode.isCurrent = false
    if (this.currentLeftNode) this.currentLeftNode.isCurrent = false
    this.currentNode = null
    this.currentLeftNode = null
  }

  /** 按 key 设置选中；null/undefined 取消高亮。OKR 模式下左右两树同 key 节点同时选中 */
  setCurrentNodeKey(key: TreeKey | null | undefined) {
    if (key === null || key === undefined) {
      this.clearCurrent()
      return
    }
    const right = this.nodesMap[key as string]
    const left = this.leftNodesMap[key as string]
    if (right) this.setCurrentNode(right)
    if (left) this.setCurrentNode(left)
  }

  getCurrentNode(): TreeNode | null {
    return this.currentNode || this.currentLeftNode || null
  }

  remove(data: TreeNode | TreeKey | TreeNodeData) {
    const node = this.getNode(data)
    if (node && node.parent) {
      if (node === this.currentNode) this.currentNode = null
      if (node === this.currentLeftNode) this.currentLeftNode = null
      node.parent.removeChild(node)
    }
  }

  append(data: TreeNodeData, parentData?: TreeNode | TreeKey | TreeNodeData | null) {
    const parentNode = parentData ? this.getNode(parentData) : this.root

    if (parentNode) {
      parentNode.insertChild({ data })
    }
  }

  insertBefore(data: TreeNodeData, refData: TreeNode | TreeKey | TreeNodeData) {
    const refNode = this.getNode(refData)
    if (!refNode || !refNode.parent) return
    refNode.parent.insertBefore({ data }, refNode)
  }

  insertAfter(data: TreeNodeData, refData: TreeNode | TreeKey | TreeNodeData) {
    const refNode = this.getNode(refData)
    if (!refNode || !refNode.parent) return
    refNode.parent.insertAfter({ data }, refNode)
  }
}
