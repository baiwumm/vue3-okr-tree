import { h, type Component, type FunctionalComponent, type PropType } from 'vue'
import type { TreeNode } from './model/node'
import type { NodeBtnContentFunction, RenderContentFunction } from '../../types'

/** 作用域插槽参数：与 render-content 一致，node 为内部 Node 实例，data 为源数据 */
export interface NodeSlotScope {
  node: TreeNode
  data: Record<string, any>
}

const scope = (node: TreeNode): NodeSlotScope => ({ node, data: node.data })

/**
 * 节点内容渲染，优先级：
 * 1. 用户提供的 #default 作用域插槽（hasUserSlot 由 OkrTreeNode 依据 $slots.default 判断）
 * 2. node-component：以 { node, data } 为 props 渲染该组件
 * 3. render-content：调用 renderContent(h, node)（Vue 3 render 不再注入 h，此处显式传入）
 * 4. 默认插槽兜底（OkrTreeNode 填入 node.label）
 */
export const NodeContent: FunctionalComponent<{
  node: TreeNode
  hasUserSlot?: boolean
  nodeComponent?: Component
  renderContent?: RenderContentFunction
}> = (props, { slots }) => {
  if (props.hasUserSlot && slots.default) {
    return slots.default(scope(props.node))
  }
  if (props.nodeComponent) {
    return h(props.nodeComponent, scope(props.node))
  }
  if (props.renderContent) {
    return props.renderContent(h, props.node)
  }
  return slots.default ? slots.default(scope(props.node)) : null
}
NodeContent.props = {
  node: { type: Object as PropType<TreeNode>, required: true },
  hasUserSlot: { type: Boolean, default: false },
  nodeComponent: { type: [Object, Function] as PropType<Component>, required: false },
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
