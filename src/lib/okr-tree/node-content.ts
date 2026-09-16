import { h, type FunctionalComponent, type PropType } from 'vue'
import type { TreeNode } from './model/node'
import type { NodeBtnContentFunction, RenderContentFunction } from '../../types'

/** 作用域插槽参数：与 render-content 一致，node 为内部 Node 实例，data 为源数据 */
export interface NodeSlotScope {
  node: TreeNode
  data: Record<string, any>
}

const scope = (node: TreeNode): NodeSlotScope => ({ node, data: node.data })

/**
 * 节点内容渲染：
 * 1. 传了 render-content → 调用 renderContent(h, node)（Vue 3 render 不再注入 h，此处显式传入）
 * 2. 否则渲染默认作用域插槽（OkrTreeNode 会兜底填入 node.label）
 */
export const NodeContent: FunctionalComponent<{
  node: TreeNode
  renderContent?: RenderContentFunction
}> = (props, { slots }) => {
  if (props.renderContent) {
    return props.renderContent(h, props.node)
  }
  return slots.default ? slots.default(scope(props.node)) : null
}
NodeContent.props = {
  node: { type: Object as PropType<TreeNode>, required: true },
  renderContent: { type: Function as PropType<RenderContentFunction>, required: false },
}

/** 展开按钮内容渲染：传了 node-btn-content 用之，否则渲染插槽（无插槽时不渲染任何内容） */
export const NodeBtnContent: FunctionalComponent<{
  node: TreeNode
  nodeBtnContent?: NodeBtnContentFunction
}> = (props, { slots }) => {
  if (props.nodeBtnContent) {
    return props.nodeBtnContent(h, props.node)
  }
  return slots.default ? slots.default(scope(props.node)) : null
}
NodeBtnContent.props = {
  node: { type: Object as PropType<TreeNode>, required: true },
  nodeBtnContent: { type: Function as PropType<NodeBtnContentFunction>, required: false },
}
