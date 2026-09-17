import type { App, Plugin } from 'vue'
import OkrTree from './okr-tree/OkrTree.vue'

export { TreeNode, createNode } from './okr-tree/model/node'
export { TreeStore } from './okr-tree/model/tree-store'
export type { TreeStoreOptions } from './okr-tree/model/tree-store'
export { NODE_KEY, getNodeKey, markNodeData } from './okr-tree/model/util'
export type {
  AnimateName,
  FilterNodeMethod,
  LabelClassName,
  NodeBtnContentFunction,
  RenderContentFunction,
  TreeDirection,
  TreeKey,
  TreeNodeData,
  TreeOptionProps,
  TreeTheme,
} from '../types'

/** 组件本体（与原 vue-okr-tree 同名导出） */
export const VueOkrTree = OkrTree
export { OkrTree }

/** 组件实例类型（用于 ref<VueOkrTreeInstance>() 调用 filter/getNode 等方法） */
export type VueOkrTreeInstance = InstanceType<typeof OkrTree>

/** Vue 插件形式：app.use(VueOkrTreePlugin) 全局注册 <vue-okr-tree> / <okr-tree> */
export const VueOkrTreePlugin: Plugin = {
  install(app: App) {
    app.component('VueOkrTree', OkrTree)
    app.component('OkrTree', OkrTree)
  },
}

export default VueOkrTreePlugin
