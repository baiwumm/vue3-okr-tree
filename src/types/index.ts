import type { h, VNodeChild } from 'vue'
import type { TreeNode } from '../lib/okr-tree/model/node'

/** 节点源数据（用户传入的任意对象） */
export type TreeNodeData = Record<string, any>

/** 节点唯一 key 类型 */
export type TreeKey = string | number

/** 树的展开方向 */
export type TreeDirection = 'vertical' | 'horizontal'

/** 内置过渡动画名（也允许自定义字符串） */
export type AnimateName =
  | 'okr-fade-in-linear'
  | 'okr-fade-in'
  | 'okr-zoom-in-center'
  | 'okr-zoom-in-top'
  | 'okr-zoom-in-bottom'
  | 'okr-zoom-in-left'
  | (string & {})

/** 内置主题名清单（theme prop 的默认支持集） */
export const BUILT_IN_THEMES = ['default', 'feishu', 'dark', 'auto', 'minimal', 'colorful'] as const

/** 内置主题名（也允许自定义字符串，需自行编写 .okr-theme-{name} 变量） */
export type TreeTheme = (typeof BUILT_IN_THEMES)[number] | (string & {})

/** props 字段映射配置 */
export interface TreeOptionProps {
  /** 节点文本字段，支持 string 或 function(data, node) */
  label?: string | ((data: TreeNodeData, node: TreeNode) => string)
  /** 子节点字段 */
  children?: string
  /** 禁用字段，支持 string 或 function(data, node) */
  disabled?: string | ((data: TreeNodeData, node: TreeNode) => boolean)
  /**
   * 叶子节点字段（懒加载模式下未加载节点的 isLeaf 取该字段，默认视为有子节点），
   * 支持 string 或 function(data, node)
   */
  isLeaf?: string | ((data: TreeNodeData, node: TreeNode) => boolean)
}

/**
 * 懒加载函数：首次展开未加载节点时调用。
 * resolve 提交子节点数据（会同步写入源数据 children，再展开）；reject 或抛错时节点回到折叠态、可重试。
 */
export type TreeLoadFunction = (
  node: TreeNode,
  resolve: (children: TreeNodeData[]) => void,
  reject?: () => void
) => void

/** 过滤方法：返回 false 隐藏节点 */
export type FilterNodeMethod = (value: any, data: TreeNodeData, node: TreeNode) => boolean

/** 节点内容渲染函数：(h, node)，node 为内部 Node 实例（源数据在 node.data） */
export type RenderContentFunction = (createElement: typeof h, node: TreeNode) => VNodeChild

/** 展开按钮内容渲染函数：(h, node) */
export type NodeBtnContentFunction = (createElement: typeof h, node: TreeNode) => VNodeChild

/** 节点 className：字符串或 Function(node) */
export type LabelClassName =
  string | ((node: TreeNode) => string | string[] | Record<string, boolean> | undefined)

/** #expand-btn 插槽参数 */
export interface ExpandBtnSlotScope {
  node: TreeNode
  data: TreeNodeData
  /** 该按钮控制的一侧当前是否展开 */
  expanded: boolean
  /** 按钮所在侧：right 为常规/右子树按钮，left 为 OKR 模式左子树按钮 */
  side: 'left' | 'right'
  /** 懒加载进行中（配合 lazy 使用） */
  loading: boolean
}

/** scrollToNode 选项：ScrollIntoViewOptions + 是否先展开祖先（默认 true） */
export interface ScrollToNodeOptions extends ScrollIntoViewOptions {
  expand?: boolean
}

/** check 事件的信息对象（对齐 el-tree） */
export interface TreeCheckInfo {
  checkedNodes: TreeNodeData[]
  checkedKeys: TreeKey[]
  halfCheckedNodes: TreeNode[]
  halfCheckedKeys: TreeKey[]
}

/** 拖拽放置位置：目标节点前 / 内部（成为子节点）/ 后（对齐 el-tree） */
export type DropType = 'prev' | 'inner' | 'next'

export type { TreeNode }

/** createTypedOkrTree<T> 返回组件的插槽类型：作用域中的 data 为 T */
export interface TypedOkrTreeSlots<T> {
  default?: (scope: { node: TreeNode; data: T }) => any
  'expand-btn'?: (scope: ExpandBtnSlotScope & { data: T }) => any
  empty?: () => any
}
