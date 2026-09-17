<template>
  <div class="org-chart-container" :class="themeClass">
    <div
      ref="orgChartRoot"
      class="org-chart-node-children"
      :class="{
        vertical: direction === 'vertical',
        horizontal: direction === 'horizontal',
        'show-collapsable': showCollapsable,
        'one-branch': data.length === 1,
      }"
    >
      <OkrTreeNode
        v-for="child in root.childNodes"
        :key="getNodeKey(child)"
        :node="child"
        :show-collapsable="showCollapsable"
        :label-width="labelWidth"
        :label-height="labelHeight"
        :render-content="renderContent"
        :node-btn-content="nodeBtnContent"
        :node-key="nodeKey"
        :show-node-num="showNodeNum"
        :align-root="alignRoot"
      >
        <template v-if="$slots.default" #default="scope">
          <slot v-bind="scope" />
        </template>
      </OkrTreeNode>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, provide, shallowReactive, watch, type PropType } from 'vue'
import OkrTreeNode from './OkrTreeNode.vue'
import { TreeStore } from './model/tree-store'
import { getNodeKey as _getNodeKey } from './model/util'
import { OKR_TREE_INJECTION_KEY, type OkrTreeEventName } from './context'
import type { TreeNode } from './model/node'
import type {
  AnimateName,
  TreeTheme,
  FilterNodeMethod,
  LabelClassName,
  NodeBtnContentFunction,
  RenderContentFunction,
  TreeDirection,
  TreeKey,
  TreeNodeData,
  TreeOptionProps,
} from '../../types'

defineOptions({ name: 'OkrTree' })

const props = defineProps({
  /** 源数据（数组，支持多根） */
  data: { type: Array as PropType<TreeNodeData[]>, required: true },
  /** 左子树数据（onlyBothTree 模式） */
  leftData: { type: Array as PropType<TreeNodeData[]>, default: undefined },
  /** 方向：vertical / horizontal */
  direction: { type: String as PropType<TreeDirection>, default: 'vertical' },
  /** 子节点是否可折叠 */
  showCollapsable: { type: Boolean, default: false },
  /** 飞书 OKR 模式：子树在根节点左右两侧展开 */
  onlyBothTree: { type: Boolean, default: false },
  /** 树节点的内容区的渲染 Function (h, node) */
  renderContent: { type: Function as PropType<RenderContentFunction>, default: undefined },
  /** 展开节点的内容渲染 Function (h, node) */
  nodeBtnContent: { type: Function as PropType<NodeBtnContentFunction>, default: undefined },
  /** 折叠时显示子节点数 */
  showNodeNum: { type: Boolean, default: false },
  /** 树节点区域的宽度 */
  labelWidth: { type: [String, Number], default: undefined },
  /** 树节点区域的高度 */
  labelHeight: { type: [String, Number], default: undefined },
  /** 树节点的样式 */
  labelClassName: { type: [Function, String] as PropType<LabelClassName>, default: undefined },
  /** 当前选中节点样式（保留原拼写） */
  currentLableClassName: {
    type: [Function, String] as PropType<LabelClassName>,
    default: undefined,
  },
  /** 是否默认展开所有节点 */
  defaultExpandAll: { type: Boolean, default: false },
  /** 初始选中的节点 key */
  currentNodeKey: { type: [String, Number] as PropType<TreeKey>, default: undefined },
  /** 节点唯一标识字段 */
  nodeKey: { type: String, default: undefined },
  /** 默认展开的节点 key 数组 */
  defaultExpandedKeys: { type: Array as PropType<TreeKey[]>, default: undefined },
  /** 过滤方法 */
  filterNodeMethod: { type: Function as PropType<FilterNodeMethod>, default: undefined },
  /** 字段映射配置 */
  props: {
    type: Object as PropType<TreeOptionProps>,
    default: () => ({
      children: 'children',
      label: 'label',
      disabled: 'disabled',
    }),
  },
  /** 是否开启过渡动画 */
  animate: { type: Boolean, default: false },
  /** 过渡动画名 */
  animateName: { type: String as PropType<AnimateName>, default: 'okr-zoom-in-center' },
  /** 过渡动画时长 ms */
  animateDuration: { type: Number, default: 200 },
  /** OKR 模式下自动根对齐（Vue 3 版新增，默认开启） */
  alignRoot: { type: Boolean, default: true },
  /**
   * 主题（Vue 3 版新增）：default（与原版一致）/ feishu / dark / auto / minimal / colorful，
   * 或自定义名字（自行编写 .okr-theme-{name} { --okr-*: ... }）。实现为在根容器加 okr-theme-{name} 类。
   */
  theme: { type: String as PropType<TreeTheme>, default: 'default' },
})

const emit = defineEmits<{
  (e: 'node-click', data: TreeNodeData, node: TreeNode, nodeComponent: any): void
  (e: 'node-expand', data: TreeNodeData, node: TreeNode, nodeComponent: any): void
  (e: 'node-collapse', data: TreeNodeData, node: TreeNode, nodeComponent: any): void
  (
    e: 'node-contextmenu',
    event: MouseEvent,
    data: TreeNodeData,
    node: TreeNode,
    nodeComponent: any
  ): void
}>()

defineSlots<{
  default?: (scope: { node: TreeNode; data: TreeNodeData }) => any
}>()

const instance = getCurrentInstance()

const themeClass = computed(() =>
  props.theme && props.theme !== 'default' ? `okr-theme-${props.theme}` : ''
)

const rawStore = new TreeStore({
  key: props.nodeKey,
  data: props.data,
  leftData: props.leftData,
  props: props.props,
  defaultExpandedKeys: props.defaultExpandedKeys,
  showCollapsable: props.showCollapsable,
  currentNodeKey: props.currentNodeKey,
  defaultExpandAll: props.defaultExpandAll,
  filterNodeMethod: props.filterNodeMethod,
  labelClassName: props.labelClassName,
  currentLableClassName: props.currentLableClassName,
  onlyBothTree: props.onlyBothTree,
  direction: props.direction,
  animate: props.animate,
  animateName: props.animateName,
  animateDuration: props.animateDuration,
})
// shallowReactive 包装 store，使节点组件读取的配置字段（labelClassName / animate 等）可被追踪
const store = shallowReactive(rawStore) as TreeStore
const root = store.root

provide(OKR_TREE_INJECTION_KEY, {
  store,
  root,
  emit: (event: OkrTreeEventName, ...args: any[]) => (emit as any)(event, ...args),
  get hasContextmenuListener() {
    const vnodeProps = instance?.vnode.props
    return !!(vnodeProps && vnodeProps.onNodeContextmenu)
  },
  get instance() {
    return instance?.proxy ?? null
  },
})

// ---- 配置同步：运行时变更的 prop 写回 store（原版为创建时快照） ----
watch(
  () => props.filterNodeMethod,
  (v) => (store.filterNodeMethod = v)
)
watch(
  () => props.labelClassName,
  (v) => (store.labelClassName = v)
)
watch(
  () => props.currentLableClassName,
  (v) => (store.currentLableClassName = v)
)
watch(
  () => props.animate,
  (v) => (store.animate = v)
)
watch(
  () => props.animateName,
  (v) => (store.animateName = v)
)
watch(
  () => props.animateDuration,
  (v) => (store.animateDuration = v)
)

// ---- 数据变更 ----
// deep watch：引用变化 → 重建；原地变更（用户 data 为响应式时）→ Node.updateChildren 增量更新（Q4）
watch(
  () => props.data,
  (newVal) => {
    store.setData(newVal)
  },
  { deep: true }
)
watch(
  () => props.leftData,
  (newVal) => {
    if (props.onlyBothTree) store.setLeftData(newVal)
  },
  { deep: true }
)
watch(
  () => props.defaultExpandedKeys,
  (newVal) => {
    store.setDefaultExpandedKeys(newVal)
  }
)
watch(
  () => props.currentNodeKey,
  (newVal) => {
    if (props.nodeKey) store.setCurrentNodeKey(newVal)
  }
)

// ---- 对外方法 ----
function filter(value: any) {
  if (!props.filterNodeMethod) throw new Error('[Tree] filterNodeMethod is required when filter')
  store.filter(value)
  if (props.onlyBothTree) {
    store.filter(value, 'leftChildNodes')
  }
}

function getNodeKey(node: TreeNode) {
  return _getNodeKey(props.nodeKey, node.data)
}

/** 通过 node 设置某个节点的当前选中状态 */
function setCurrentNode(node: TreeNode) {
  if (!props.nodeKey) throw new Error('[Tree] nodeKey is required in setCurrentNode')
  store.setUserCurrentNode(node)
}

/** 根据 data 或者 key 拿到 Tree 组件中的 node */
function getNode(data: TreeNode | TreeKey | TreeNodeData) {
  return store.getNode(data)
}

/** 通过 key 设置某个节点的当前选中状态；传 null 取消高亮 */
function setCurrentKey(key: TreeKey | null | undefined) {
  if (!props.nodeKey) throw new Error('[Tree] nodeKey is required in setCurrentKey')
  store.setCurrentNodeKey(key)
}

function remove(data: TreeNode | TreeKey | TreeNodeData) {
  store.remove(data)
}

/** 获取当前被选中节点的 data */
function getCurrentNode(): TreeNodeData | null {
  const currentNode = store.getCurrentNode()
  return currentNode ? currentNode.data : null
}

function getCurrentKey(): TreeKey | null {
  if (!props.nodeKey) throw new Error('[Tree] nodeKey is required in getCurrentKey')
  const currentNode = getCurrentNode()
  return currentNode ? currentNode[props.nodeKey] : null
}

function append(data: TreeNodeData, parentNode?: TreeNode | TreeKey | TreeNodeData | null) {
  store.append(data, parentNode)
}

function insertBefore(data: TreeNodeData, refNode: TreeNode | TreeKey | TreeNodeData) {
  store.insertBefore(data, refNode)
}

function insertAfter(data: TreeNodeData, refNode: TreeNode | TreeKey | TreeNodeData) {
  store.insertAfter(data, refNode)
}

function updateKeyChildren(key: TreeKey, data: TreeNodeData[]) {
  if (!props.nodeKey) throw new Error('[Tree] nodeKey is required in updateKeyChild')
  store.updateChildren(key, data)
}

defineExpose({
  store,
  root,
  filter,
  getNodeKey,
  setCurrentNode,
  getNode,
  setCurrentKey,
  remove,
  getCurrentNode,
  getCurrentKey,
  append,
  insertBefore,
  insertAfter,
  updateKeyChildren,
})
</script>

<style>
@import './style.css';
</style>
