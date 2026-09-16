import type { ComponentPublicInstance, InjectionKey } from 'vue'
import type { TreeStore } from './model/tree-store'
import type { TreeNode } from './model/node'

export type OkrTreeEventName = 'node-click' | 'node-expand' | 'node-collapse' | 'node-contextmenu'

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
}

export const OKR_TREE_INJECTION_KEY: InjectionKey<OkrTreeContext> = Symbol('okr-tree')
