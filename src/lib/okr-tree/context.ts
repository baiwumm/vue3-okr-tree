import type { ComponentPublicInstance, InjectionKey, ShallowRef } from 'vue'
import type { DropType } from '../../types'
import type { TreeStore } from './model/tree-store'
import type { TreeNode } from './model/node'
import type { ViewportTreeApi } from './viewport'
import type { OkrTreeVirtualContext } from './virtual'

export type OkrTreeEventName =
  | 'node-click'
  | 'node-expand'
  | 'node-collapse'
  | 'node-contextmenu'
  | 'check'
  | 'check-change'
  | 'node-drag-start'
  | 'node-drag-enter'
  | 'node-drag-leave'
  | 'node-drag-over'
  | 'node-drag-end'
  | 'node-drop'

/** OkrTree 通过 provide 向递归节点组件提供的上下文（替代原 $parent.isTree 探测与 okrEventBus） */
export interface OkrTreeContext {
  /** shallowReactive 包装的 store：direction / onlyBothTree / labelClassName 等配置字段可被追踪 */
  store: TreeStore
  root: TreeNode
  emit: (event: OkrTreeEventName, ...args: any[]) => void
  /** 外部是否绑定了 node-contextmenu（仅此时阻断浏览器默认右键菜单，与原版一致） */
  readonly hasContextmenuListener: boolean
  /** 树组件实例（事件回调第三个参数 nodeComponent 的"树"上下文） */
  readonly instance: ComponentPublicInstance | null
  /** 节点展开态发生用户交互变化后调用：用于同步 v-model:expanded-keys */
  onExpandChange: () => void
  /** 选中节点发生用户交互变化后调用：用于同步 v-model:current-key */
  onCurrentChange: () => void
  /** 节点根元素登记（scrollToNode / 键盘导航使用） */
  registerNodeEl: (node: TreeNode, el: HTMLElement) => void
  unregisterNodeEl: (node: TreeNode) => void
  /** 当前持有漫游 tabindex=0 的节点 */
  focusedNode: ShallowRef<TreeNode | null>
  setFocusedNode: (node: TreeNode | null) => void
  /** 聚焦某个 treeitem 元素并更新 focusedNode */
  focusElement: (el: HTMLElement) => void
  /** 聚焦某个节点对应的 treeitem（未渲染/不可见时忽略） */
  focusNode: (node: TreeNode) => void
  /** 沿可见 treeitem 的文档顺序移动焦点 */
  moveFocus: (from: HTMLElement | null, step: 1 | -1 | 'first' | 'last') => void
  /** 聚焦父节点（左树顶层节点的父节点为 OKR 根节点） */
  focusParent: (node: TreeNode, isLeftChildNode: boolean) => void
  /** 拖拽中（dragstart → dragend 之间）的源节点 */
  draggingNode: ShallowRef<TreeNode | null>
  /** 拖拽指示：当前悬停的目标节点 */
  dragOverNode: ShallowRef<TreeNode | null>
  /** 拖拽指示：当前放置位置（prev / inner / next） */
  dragOverType: ShallowRef<DropType | null>
}

export const OKR_TREE_INJECTION_KEY: InjectionKey<OkrTreeContext> = Symbol('okr-tree')

/** OkrTreeGroup 提供给组内 OkrTree 的上下文 */
export interface OkrTreeGroupContext {
  /** 成员挂载/更新/卸载后请求重新测量（内部按 tick 去重） */
  requestMeasure: () => void
}

export const OKR_TREE_GROUP_INJECTION_KEY: InjectionKey<OkrTreeGroupContext> =
  Symbol('okr-tree-group')

/** OkrTree 向所在 OkrTreeViewport 登记的定位能力（复用 ViewportTreeApi） */
export type { ViewportTreeApi as OkrTreeViewportTreeApi } from './viewport'

/** OkrTreeViewport 提供给内部 OkrTree 的上下文（登记以便 centerNode 定位） */
export interface OkrTreeViewportContext {
  registerTree: (api: ViewportTreeApi) => void
  unregisterTree: (api: ViewportTreeApi) => void
}

export const OKR_TREE_VIEWPORT_INJECTION_KEY: InjectionKey<OkrTreeViewportContext> =
  Symbol('okr-tree-viewport')

/** 虚拟滚动上下文（virtual prop 开启时由 OkrTree provide；关闭时不提供，inject 得 undefined） */
export const OKR_TREE_VIRTUAL_KEY: InjectionKey<OkrTreeVirtualContext> = Symbol('okr-tree-virtual')
