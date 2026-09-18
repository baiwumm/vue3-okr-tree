<template>
  <div class="org-chart-container" :class="themeClass">
    <div
      ref="orgChartRoot"
      class="org-chart-node-children"
      role="tree"
      :class="{
        vertical: direction === 'vertical',
        horizontal: direction === 'horizontal',
        'show-collapsable': showCollapsable,
        'one-branch': data.length === 1,
      }"
    >
      <div v-if="isEmpty && $slots.empty" class="org-chart-empty">
        <slot name="empty" />
      </div>
      <OkrTreeNode
        v-for="child in root.childNodes"
        :key="getNodeKey(child)"
        :node="child"
        :show-collapsable="showCollapsable"
        :label-width="labelWidth"
        :label-height="labelHeight"
        :render-content="renderContent"
        :node-component="nodeComponent"
        :node-btn-content="nodeBtnContent"
        :node-key="nodeKey"
        :show-node-num="showNodeNum"
        :align-root="alignRoot"
      >
        <template v-if="$slots.default" #default="scope">
          <slot v-bind="scope" />
        </template>
        <template v-if="$slots['expand-btn']" #expand-btn="scope">
          <slot name="expand-btn" v-bind="scope" />
        </template>
      </OkrTreeNode>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  provide,
  shallowReactive,
  shallowRef,
  watch,
  type Component,
  type PropType,
} from 'vue'
import OkrTreeNode from './OkrTreeNode.vue'
import { TreeStore } from './model/tree-store'
import { getNodeKey as _getNodeKey, warn } from './model/util'
import type { ViewportTreeApi } from './viewport'
import {
  OKR_TREE_GROUP_INJECTION_KEY,
  OKR_TREE_INJECTION_KEY,
  OKR_TREE_VIEWPORT_INJECTION_KEY,
  type OkrTreeEventName,
} from './context'
import type { TreeNode } from './model/node'
import type {
  AnimateName,
  ExpandBtnSlotScope,
  FilterNodeMethod,
  LabelClassName,
  NodeBtnContentFunction,
  RenderContentFunction,
  ScrollToNodeOptions,
  TreeDirection,
  TreeKey,
  TreeLoadFunction,
  TreeNodeData,
  TreeOptionProps,
  TreeTheme,
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
  /**
   * 节点内容组件（Vue 3 版新增）：以 { node, data } 为 props 渲染。
   * 优先级：#default 插槽 > node-component > render-content > 默认文本。
   */
  nodeComponent: { type: [Object, Function] as PropType<Component>, default: undefined },
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
  /** 初始选中的节点 key（单向） */
  currentNodeKey: { type: [String, Number] as PropType<TreeKey>, default: undefined },
  /** 节点唯一标识字段 */
  nodeKey: { type: String, default: undefined },
  /** 默认展开的节点 key 数组（单向） */
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
  /**
   * 懒加载子节点（Vue 3 版新增）：开启后，初始 data 中没有 children（或为空数组）的节点
   * 视为未加载，首次展开时调用 load 取子节点；需配合 nodeKey 展开按钮使用。
   */
  lazy: { type: Boolean, default: false },
  /**
   * 懒加载取数函数（Vue 3 版新增）：(node, resolve, reject) => void。
   * resolve(children) 后子节点写入源数据 children 并展开；reject 或抛错时节点回到折叠态、可重试。
   * node.isLeftChild 可区分 OKR 左树节点。
   */
  load: { type: Function as PropType<TreeLoadFunction>, default: undefined },
  /**
   * data 深度侦听开关（Vue 3 版 1.5.0 新增，创建期生效）：默认 true——原地变更（push/splice 等）
   * 触发增量更新；设为 false 只响应 data 引用变化（回到原版行为），超大树且不依赖原地变更时
   * 可显著降低 watch 开销。
   */
  deepWatch: { type: Boolean, default: true },
  /** OKR 模式下自动根对齐（Vue 3 版新增，默认开启） */
  alignRoot: { type: Boolean, default: true },
  /**
   * 主题（Vue 3 版新增）：default（与原版一致）/ feishu / dark / auto / minimal / colorful，
   * 或自定义名字（自行编写 .okr-theme-{name} { --okr-*: ... }）。实现为在根容器加 okr-theme-{name} 类。
   */
  theme: { type: String as PropType<TreeTheme>, default: 'default' },
  /**
   * 受控展开态（v-model:expanded-keys，需 node-key）：传入后列表内节点展开、其余收起；
   * 用户点击 +/- 或调用展开/收起方法后触发 update:expandedKeys。未传时为非受控（原版行为）。
   */
  expandedKeys: { type: Array as PropType<TreeKey[]>, default: undefined },
  /**
   * 受控选中态（v-model:current-key，需 node-key）：null 表示无选中；
   * 用户点击节点或调用 setCurrentKey / setCurrentNode 后触发 update:currentKey。
   */
  currentKey: { type: [String, Number, null] as PropType<TreeKey | null>, default: undefined },
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
  (e: 'update:expandedKeys', keys: TreeKey[]): void
  (e: 'update:currentKey', key: TreeKey | null): void
}>()

defineSlots<{
  /** 节点内容（替代 render-content） */
  default?: (scope: { node: TreeNode; data: TreeNodeData }) => any
  /** 展开按钮内容（替代 node-btn-content；show-node-num 优先） */
  'expand-btn'?: (scope: ExpandBtnSlotScope) => any
  /** data 为空时渲染 */
  empty?: () => any
}>()

const instance = getCurrentInstance()

const themeClass = computed(() =>
  props.theme && props.theme !== 'default' ? `okr-theme-${props.theme}` : ''
)

// ---- 开发期配置校验 ----
if (props.onlyBothTree && props.direction !== 'horizontal') {
  warn(
    'onlyBothTree 仅在 direction="horizontal" 时有效，当前 direction 为 "' + props.direction + '"。'
  )
}
if (props.leftData && !props.onlyBothTree) {
  warn('传入了 leftData 但未开启 onlyBothTree，leftData 会被忽略。')
}
if (!props.nodeKey) {
  if (props.defaultExpandedKeys) warn('default-expanded-keys 需要同时设置 node-key，否则不会生效。')
  if (props.expandedKeys !== undefined)
    warn('expanded-keys（v-model）需要同时设置 node-key，否则不会生效。')
  if (props.currentKey !== undefined || props.currentNodeKey !== undefined) {
    warn('current-key / current-node-key 需要同时设置 node-key，否则不会生效。')
  }
}
if (props.lazy && !props.load) {
  warn('lazy 需要同时提供 load 函数，否则未加载节点无法展开。')
}
if (!props.lazy && props.load) {
  warn('传入 load 但未开启 lazy，load 不会生效。')
}

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
  lazy: props.lazy,
  load: props.load,
})
// shallowReactive 包装 store，使节点组件读取的配置字段（labelClassName / animate 等）可被追踪
const store = shallowReactive(rawStore) as TreeStore
const root = store.root

// 懒加载展开完成后同步受控展开态（syncExpandedKeys 内部自检是否受控）
store.onExpandSettled = syncExpandedKeys

const isEmpty = computed(() => root.childNodes.length === 0)

// 受控初始态：expanded-keys / current-key 优先于 default-expanded-keys / current-node-key
if (props.nodeKey) {
  if (props.expandedKeys !== undefined) store.setExpandedKeys(props.expandedKeys)
  if (props.currentKey !== undefined) store.setCurrentNodeKey(props.currentKey)
}

// ---- v-model 同步 ----
const isExpandedControlled = () => props.expandedKeys !== undefined
const isCurrentControlled = () => props.currentKey !== undefined

function currentKeyValue(): TreeKey | null {
  const node = store.getCurrentNode()
  const key = node?.key
  return key === undefined ? null : (key as TreeKey)
}

function syncExpandedKeys() {
  if (isExpandedControlled() && props.nodeKey) emit('update:expandedKeys', store.getExpandedKeys())
}

function syncCurrentKey() {
  if (isCurrentControlled() && props.nodeKey) emit('update:currentKey', currentKeyValue())
}

// ---- 节点根元素登记（scrollToNode / 键盘导航用） ----
const nodeEls = new WeakMap<TreeNode, HTMLElement>()
const elNodes = new WeakMap<HTMLElement, TreeNode>()
const orgChartRoot = shallowRef<HTMLElement | null>(null)

// ---- 键盘可访问性：漫游 tabindex 与焦点移动 ----
const focusedNode = shallowRef<TreeNode | null>(null)

function setFocusedNode(node: TreeNode | null) {
  focusedNode.value = node
}

function focusElement(el: HTMLElement) {
  const node = elNodes.get(el)
  if (node) focusedNode.value = node
  el.focus()
}

function focusNode(node: TreeNode) {
  const el = nodeEls.get(node)
  if (el) focusElement(el)
}

/** 当前可见的 treeitem（文档顺序），排除处于收起容器中的节点 */
function visibleTreeItems(): HTMLElement[] {
  const container = orgChartRoot.value
  if (!container) return []
  return Array.from(
    container.querySelectorAll<HTMLElement>('.org-chart-node[role="treeitem"]')
  ).filter(
    (el) =>
      !el.closest('.org-chart-node-children.is-hidden, .org-chart-node-left-children.is-hidden')
  )
}

function moveFocus(from: HTMLElement | null, step: 1 | -1 | 'first' | 'last') {
  const items = visibleTreeItems()
  if (!items.length) return
  let target: HTMLElement | undefined
  if (step === 'first') target = items[0]
  else if (step === 'last') target = items[items.length - 1]
  else {
    const index = from ? items.indexOf(from) : -1
    const next = index + step
    if (next < 0 || next >= items.length) return
    target = items[next]
  }
  if (target) focusElement(target)
}

function focusParent(node: TreeNode, isLeftChildNode: boolean) {
  let parent = node.parent
  // 左树顶层节点的 parent 是未渲染的临时根，视觉上的父节点是 OKR 根节点
  if (isLeftChildNode && (!parent || parent.level <= 1)) parent = root.childNodes[0] ?? null
  if (!parent || parent.level < 1) return
  focusNode(parent)
}

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
  onExpandChange: syncExpandedKeys,
  onCurrentChange: syncCurrentKey,
  registerNodeEl: (node, el) => {
    nodeEls.set(node, el)
    elNodes.set(el, node)
  },
  unregisterNodeEl: (node) => {
    const el = nodeEls.get(node)
    if (el) elNodes.delete(el)
    nodeEls.delete(node)
    if (focusedNode.value === node) focusedNode.value = null
  },
  focusedNode,
  setFocusedNode,
  focusElement,
  focusNode,
  moveFocus,
  focusParent,
})

// ---- OkrTreeGroup：成员变化时请求重新测量 ----
const group = inject(OKR_TREE_GROUP_INJECTION_KEY, null)
if (group) {
  onMounted(group.requestMeasure)
  onUpdated(group.requestMeasure)
  onBeforeUnmount(group.requestMeasure)
}

// ---- OkrTreeViewport：登记定位能力（centerNode 用） ----
const viewport = inject(OKR_TREE_VIEWPORT_INJECTION_KEY, null)
if (viewport) {
  const viewportApi: ViewportTreeApi = {
    getNodeEl: (data) => getNodeEl(data),
    expandNode: (data, expandParent) => expandNode(data, expandParent),
  }
  onMounted(() => viewport.registerTree(viewportApi))
  onBeforeUnmount(() => viewport.unregisterTree(viewportApi))
}

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
// deep watch：引用变化 → 重建；原地变更（用户 data 为响应式时）→ Node.updateChildren 增量更新（Q4）。
// deep-watch: false 时只响应引用变化（1.5.0 性能开关，创建期生效）。
watch(
  () => props.data,
  (newVal) => {
    store.setData(newVal)
    // 重建后按受控值恢复展开/选中态
    if (props.nodeKey) {
      if (isExpandedControlled()) store.setExpandedKeys(props.expandedKeys)
      if (isCurrentControlled()) store.setCurrentNodeKey(props.currentKey)
    }
  },
  { deep: props.deepWatch }
)
watch(
  () => props.leftData,
  (newVal) => {
    if (props.onlyBothTree) store.setLeftData(newVal)
  },
  { deep: props.deepWatch }
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
watch(
  () => props.expandedKeys,
  (newVal) => {
    if (props.nodeKey && newVal !== undefined) store.setExpandedKeys(newVal)
  },
  { deep: true }
)
watch(
  () => props.currentKey,
  (newVal) => {
    if (props.nodeKey && newVal !== undefined) store.setCurrentNodeKey(newVal)
  }
)

// ---- 对外方法 ----
function filter(value: any) {
  if (!props.filterNodeMethod) throw new Error('[Tree] filterNodeMethod is required when filter')
  store.filter(value)
  if (props.onlyBothTree) {
    store.filter(value, 'leftChildNodes')
  }
  syncExpandedKeys()
}

function getNodeKey(node: TreeNode) {
  return _getNodeKey(props.nodeKey, node.data)
}

/** 获取节点对应的 DOM 元素（Node / key / data）；未渲染或不可见时为 null */
function getNodeEl(data: TreeNode | TreeKey | TreeNodeData): HTMLElement | null {
  const node = store.getNode(data)
  return node ? (nodeEls.get(node) ?? null) : null
}

/** 通过 node 设置某个节点的当前选中状态 */
function setCurrentNode(node: TreeNode) {
  if (!props.nodeKey) throw new Error('[Tree] nodeKey is required in setCurrentNode')
  store.setUserCurrentNode(node)
  syncCurrentKey()
}

/** 根据 data 或者 key 拿到 Tree 组件中的 node */
function getNode(data: TreeNode | TreeKey | TreeNodeData) {
  return store.getNode(data)
}

/** 通过 key 设置某个节点的当前选中状态；传 null 取消高亮 */
function setCurrentKey(key: TreeKey | null | undefined) {
  if (!props.nodeKey) throw new Error('[Tree] nodeKey is required in setCurrentKey')
  store.setCurrentNodeKey(key)
  syncCurrentKey()
}

function remove(data: TreeNode | TreeKey | TreeNodeData) {
  const before = store.getCurrentNode()
  store.remove(data)
  if (before && store.getCurrentNode() !== before) syncCurrentKey()
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

/** 展开全部节点（左右两树） */
function expandAll() {
  store.expandAll()
  syncExpandedKeys()
}

/** 收起全部节点（左右两树） */
function collapseAll() {
  store.collapseAll()
  syncExpandedKeys()
}

/** 展开指定节点（key / data / Node），默认连同祖先一起展开 */
function expandNode(data: TreeNode | TreeKey | TreeNodeData, expandParent = true) {
  const node = store.expandNode(data, expandParent)
  if (node) syncExpandedKeys()
  return node
}

/** 收起指定节点（key / data / Node） */
function collapseNode(data: TreeNode | TreeKey | TreeNodeData) {
  const node = store.collapseNode(data)
  if (node) syncExpandedKeys()
  return node
}

/**
 * 滚动到指定节点：默认先展开其全部祖先使其可见，再 scrollIntoView（居中、平滑）。
 * 返回是否找到节点并完成滚动。
 */
async function scrollToNode(
  data: TreeNode | TreeKey | TreeNodeData,
  options: ScrollToNodeOptions = {}
): Promise<boolean> {
  const node = store.getNode(data)
  if (!node) return false
  const { expand = true, ...scrollOptions } = options
  if (expand) {
    const pending: TreeNode[] = []
    let parent = node.parent
    while (parent && parent.level > 0) {
      pending.push(parent)
      parent = parent.parent
    }
    // 逐个展开祖先（懒加载祖先会先触发 load、完成后再展开）
    pending.forEach((ancestor) => ancestor.expand(null, false))
    // 目标节点自身未加载时也触发加载（不展开），加载完成后再滚动
    if (store.lazy && store.load && !node.loaded && !node.isLeaf && node.level > 0) {
      node.loadData()
    }
    // 左树节点还受右树根节点的 leftExpanded 控制
    if (node.isLeftChild && store.onlyBothTree) {
      const okrRoot = root.childNodes[0]
      if (okrRoot) okrRoot.leftExpanded = true
    }
    syncExpandedKeys()
    // 等待懒加载完成，保证目标节点已渲染、可定位
    pending.push(node)
    await Promise.all(pending.map((pendingNode) => pendingNode.whenLoaded()))
  }
  await nextTick()
  const el = nodeEls.get(node)
  if (!el || typeof el.scrollIntoView !== 'function') return false
  el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center', ...scrollOptions })
  return true
}

defineExpose({
  store,
  root,
  filter,
  getNodeKey,
  setCurrentNode,
  getNode,
  getNodeEl,
  setCurrentKey,
  remove,
  getCurrentNode,
  getCurrentKey,
  append,
  insertBefore,
  insertAfter,
  updateKeyChildren,
  expandAll,
  collapseAll,
  expandNode,
  collapseNode,
  scrollToNode,
})
</script>

<style>
@import './style.css';
</style>
