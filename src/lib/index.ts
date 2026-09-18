import type { App, Plugin } from 'vue'
import OkrTree from './okr-tree/OkrTree.vue'
import OkrTreeGroup from './okr-tree/OkrTreeGroup.vue'
import OkrTreeViewport from './okr-tree/OkrTreeViewport.vue'

export { TreeNode, createNode } from './okr-tree/model/node'
export { TreeStore } from './okr-tree/model/tree-store'
export type { TreeStoreOptions } from './okr-tree/model/tree-store'
export { NODE_KEY, getNodeKey, markNodeData } from './okr-tree/model/util'
export { clampZoom, computeFit, renderToDataUrl, loadHtmlToImage } from './okr-tree/viewport'
export type { ExportImageOptions, ViewportOffset, ViewportWheelBehavior } from './okr-tree/viewport'
export type {
  AnimateName,
  ExpandBtnSlotScope,
  FilterNodeMethod,
  LabelClassName,
  NodeBtnContentFunction,
  RenderContentFunction,
  ScrollToNodeOptions,
  TreeCheckInfo,
  TreeDirection,
  TreeKey,
  TreeLoadFunction,
  TreeNodeData,
  TreeOptionProps,
  TreeTheme,
  TypedOkrTreeSlots,
} from '../types'
import type {
  TreeNodeData as _TreeNodeData,
  TypedOkrTreeSlots as _TypedOkrTreeSlots,
} from '../types'

/** 组件本体（与原 vue-okr-tree 同名导出） */
export const VueOkrTree = OkrTree
export { OkrTree, OkrTreeGroup, OkrTreeViewport }

/** OkrTreeGroup 实例类型（refresh()） */
export type OkrTreeGroupInstance = InstanceType<typeof OkrTreeGroup>
/** OkrTreeViewport 实例类型（zoomIn / reset / fitToScreen / centerNode / exportImage） */
export type OkrTreeViewportInstance = InstanceType<typeof OkrTreeViewport>

type OkrTreeInstanceType = InstanceType<typeof OkrTree>

/**
 * 获取带数据类型参数的 OkrTree：data / leftData 为 T[]，插槽作用域中的 data 为 T。
 * 运行时返回的就是 VueOkrTree 本身，仅做类型收窄。
 *
 * @example
 * const DeptTree = createTypedOkrTree<{ id: number; label: string; leader?: string }>()
 * // <DeptTree :data="depts">
 * //   <template #default="{ data }">{{ data.leader }}</template>  ← data 有类型提示
 * // </DeptTree>
 */
export function createTypedOkrTree<T extends _TreeNodeData>() {
  return OkrTree as unknown as new (...args: any[]) => Omit<
    OkrTreeInstanceType,
    '$props' | '$slots'
  > & {
    $props: Omit<OkrTreeInstanceType['$props'], 'data' | 'leftData'> & { data: T[]; leftData?: T[] }
    $slots: _TypedOkrTreeSlots<T>
  }
}

/** 组件实例类型（用于 ref<VueOkrTreeInstance>() 调用 filter/getNode 等方法） */
export type VueOkrTreeInstance = InstanceType<typeof OkrTree>

/** Vue 插件形式：app.use(VueOkrTreePlugin) 全局注册 <vue-okr-tree> / <okr-tree> 等 */
export const VueOkrTreePlugin: Plugin = {
  install(app: App) {
    app.component('VueOkrTree', OkrTree)
    app.component('OkrTree', OkrTree)
    app.component('OkrTreeGroup', OkrTreeGroup)
    app.component('OkrTreeViewport', OkrTreeViewport)
  },
}

export default VueOkrTreePlugin
