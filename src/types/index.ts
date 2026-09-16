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

/** props 字段映射配置 */
export interface TreeOptionProps {
  /** 节点文本字段，支持 string 或 function(data, node) */
  label?: string | ((data: TreeNodeData, node: TreeNode) => string)
  /** 子节点字段 */
  children?: string
  /** 禁用字段，支持 string 或 function(data, node) */
  disabled?: string | ((data: TreeNodeData, node: TreeNode) => boolean)
}

/** 过滤方法：返回 false 隐藏节点 */
export type FilterNodeMethod = (value: any, data: TreeNodeData, node: TreeNode) => boolean

/** 节点内容渲染函数：(h, node)，node 为内部 Node 实例（源数据在 node.data） */
export type RenderContentFunction = (createElement: typeof h, node: TreeNode) => VNodeChild

/** 展开按钮内容渲染函数：(h, node) */
export type NodeBtnContentFunction = (createElement: typeof h, node: TreeNode) => VNodeChild

/** 节点 className：字符串或 Function(node) */
export type LabelClassName =
  string | ((node: TreeNode) => string | string[] | Record<string, boolean> | undefined)

export type { TreeNode }
