<template>
  <div
    v-if="node.visible"
    ref="rootEl"
    class="org-chart-node"
    :class="nodeClass"
    :data-level="node.level"
    role="treeitem"
    :tabindex="tabIndex"
    :aria-level="node.level"
    :aria-selected="node.isCurrent ? 'true' : 'false'"
    :aria-expanded="ariaExpanded"
    :aria-disabled="node.disabled ? 'true' : undefined"
    @contextmenu="handleContextMenu"
    @focus="handleFocus"
    @keydown="handleKeydown"
  >
    <transition v-bind="transitionProps">
      <div
        v-if="showLeftChildNode"
        class="org-chart-node-left-children"
        :class="[animClass, { 'is-hidden': !node.leftExpanded }]"
        :style="leftChildrenStyle"
        role="group"
      >
        <OkrTreeNode
          v-for="child in leftChildNodes"
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
          is-left-child-node
        >
          <template v-if="$slots.default" #default="scope">
            <slot v-bind="scope" />
          </template>
          <template v-if="$slots['expand-btn']" #expand-btn="scope">
            <slot name="expand-btn" v-bind="scope" />
          </template>
        </OkrTreeNode>
      </div>
    </transition>

    <div class="org-chart-node-label" :class="labelWrapperClass">
      <div
        v-if="showNodeLeftBtn && leftChildNodes.length > 0"
        class="org-chart-node-left-btn"
        :class="{ expanded: node.leftExpanded, 'is-loading': node.loading }"
        aria-hidden="true"
        @click="handleBtnClick('left')"
      >
        <template v-if="showNodeNum">
          <span v-if="showLeftBtnText" class="org-chart-node-btn-text">{{ leftBtnCount }}</span>
        </template>
        <slot
          v-else-if="$slots['expand-btn']"
          name="expand-btn"
          :node="node"
          :data="node.data"
          :expanded="node.leftExpanded"
          :loading="node.loading"
          side="left"
        />
        <NodeBtnContent v-else :node="node" :node-btn-content="nodeBtnContent" />
      </div>

      <div
        class="org-chart-node-label-inner"
        :class="computeLabelClass"
        :style="computeLabelStyle"
        @click="handleNodeClick"
      >
        <NodeContent
          :node="node"
          :has-user-slot="!!$slots.default"
          :node-component="nodeComponent"
          :render-content="renderContent"
        >
          <template #default="scope">
            <slot v-bind="scope">{{ node.label }}</slot>
          </template>
        </NodeContent>
      </div>

      <div
        v-if="showNodeBtn && !isLeftChildNode"
        class="org-chart-node-btn"
        :class="{ expanded: node.expanded, 'is-loading': node.loading }"
        aria-hidden="true"
        @click="handleBtnClick('right')"
      >
        <template v-if="showNodeNum">
          <span v-if="showRightBtnText" class="org-chart-node-btn-text">{{
            node.childNodes.length
          }}</span>
        </template>
        <slot
          v-else-if="$slots['expand-btn']"
          name="expand-btn"
          :node="node"
          :data="node.data"
          :expanded="node.expanded"
          :loading="node.loading"
          side="right"
        />
        <NodeBtnContent v-else :node="node" :node-btn-content="nodeBtnContent" />
      </div>
    </div>

    <transition v-bind="transitionProps">
      <div
        v-if="!isLeftChildNode && node.childNodes && node.childNodes.length > 0"
        class="org-chart-node-children"
        :class="[animClass, { 'is-hidden': !node.expanded }]"
        :style="childrenStyle"
        role="group"
      >
        <OkrTreeNode
          v-for="child in node.childNodes"
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
    </transition>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  inject,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type Component,
  type CSSProperties,
  type PropType,
} from 'vue'
import { OKR_TREE_INJECTION_KEY } from './context'
import { NodeContent, NodeBtnContent } from './node-content'
import { getNodeKey as _getNodeKey } from './model/util'
import type { TreeNode } from './model/node'
import type { ExpandBtnSlotScope, NodeBtnContentFunction, RenderContentFunction } from '../../types'

defineOptions({ name: 'OkrTreeNode' })

const props = defineProps({
  node: { type: Object as PropType<TreeNode>, required: true },
  /** 子节点是否可折叠 */
  showCollapsable: { type: Boolean, default: false },
  /** 是否是左子树的节点（样式与展开方向不同） */
  isLeftChildNode: { type: Boolean, default: false },
  /** 树节点的内容区的渲染 Function */
  renderContent: { type: Function as PropType<RenderContentFunction>, default: undefined },
  /** 节点内容组件（props: { node, data }） */
  nodeComponent: { type: [Object, Function] as PropType<Component>, default: undefined },
  /** 展开节点的内容渲染 Function */
  nodeBtnContent: { type: Function as PropType<NodeBtnContentFunction>, default: undefined },
  /** 折叠时显示子节点数 */
  showNodeNum: { type: Boolean, default: false },
  /** 树节点区域的宽度 */
  labelWidth: { type: [String, Number], default: undefined },
  /** 树节点区域的高度 */
  labelHeight: { type: [String, Number], default: undefined },
  /** 节点唯一标识字段 */
  nodeKey: { type: String, default: undefined },
  /** OKR 模式根对齐 */
  alignRoot: { type: Boolean, default: true },
})

defineSlots<{
  default?: (scope: { node: TreeNode; data: Record<string, any> }) => any
  'expand-btn'?: (scope: ExpandBtnSlotScope) => any
}>()

const tree = inject(OKR_TREE_INJECTION_KEY)
if (!tree) {
  throw new Error("[OkrTreeNode] Can not find node's tree.")
}
const store = tree.store
const instance = getCurrentInstance()

const node = computed(() => props.node)

// 登记根元素供 scrollToNode 查找；node prop 变化（key 复用）时重新登记
const rootEl = ref<HTMLElement | null>(null)
watch(
  [rootEl, node],
  ([el, current], [, prev]) => {
    if (prev && prev !== current) tree!.unregisterNodeEl(prev)
    if (el && current) tree!.registerNodeEl(current, el)
  },
  { flush: 'post' }
)
onMounted(() => {
  if (rootEl.value) tree!.registerNodeEl(node.value, rootEl.value)
})
onBeforeUnmount(() => tree!.unregisterNodeEl(node.value))

const leftChildNodes = computed<TreeNode[]>(() => {
  if (store.onlyBothTree) {
    if (props.isLeftChildNode) {
      return node.value.childNodes
    }
    return node.value.leftChildNodes
  }
  return []
})

/** 懒加载待展开：lazy 且未加载、未标记叶子（点开后会先加载数据） */
const lazyPending = computed(
  () => !!store.lazy && !node.value.loaded && !node.value.isLeaf && node.value.level > 0
)

const isLeaf = computed(() => {
  // 懒加载：未加载且未标记为叶子的节点视为有子节点
  if (lazyPending.value) return false
  if (node.value.level === 1) {
    return leftChildNodes.value.length === 0 && node.value.childNodes.length === 0
  }
  return node.value.isLeaf
})

/** 折叠态容器：与原版一致，保留在 DOM 中但隐藏且高度为 0；animate 开启时附带过渡时长变量 */
const animVar = computed<CSSProperties>(() =>
  store.animate ? ({ '--okr-anim-duration': `${store.animateDuration}ms` } as CSSProperties) : {}
)
/**
 * animate 开启时，收起动作先保留容器高度让内容完成淡出/缩放过渡，
 * 过渡结束后再置 height: 0（height auto→0 不可插值，直接切换会让下方节点先跳位）。
 */
const useDelayedCollapse = (isExpanded: () => boolean) => {
  const keepHeight = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null
  const clear = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }
  watch(isExpanded, (expanded) => {
    clear()
    if (!expanded && store.animate) {
      keepHeight.value = true
      timer = setTimeout(() => {
        keepHeight.value = false
        timer = null
      }, store.animateDuration)
    } else {
      keepHeight.value = false
    }
  })
  onBeforeUnmount(clear)
  return keepHeight
}
const keepLeftHeight = useDelayedCollapse(() => node.value.leftExpanded)
const keepRightHeight = useDelayedCollapse(() => node.value.expanded)

// height: 0 后追加 overflow: hidden，避免不可见子树继续撑出滚动区域（原版存在幻影滚动条）
const hiddenStyle = (keepHeight: boolean): CSSProperties =>
  keepHeight ? { visibility: 'hidden' } : { visibility: 'hidden', height: '0', overflow: 'hidden' }

const leftChildrenStyle = computed<CSSProperties>(() => ({
  ...animVar.value,
  ...(node.value.leftExpanded ? {} : hiddenStyle(keepLeftHeight.value)),
}))
const childrenStyle = computed<CSSProperties>(() => ({
  ...animVar.value,
  ...(node.value.expanded ? {} : hiddenStyle(keepRightHeight.value)),
}))
/** 展开/收起过渡的状态类（原版 animate 在切换时无过渡，见 requirements 第 6 节） */
const animClass = computed(() =>
  store.animate ? ['is-animated', `okr-anim-${store.animateName}`] : []
)

/**
 * 子容器挂载/卸载的 <transition>：animate 关闭时传 css:false，让 enter/leave 同步完成，
 * 不依赖 requestAnimationFrame（后台/隐藏标签页中 rAF 会被节流甚至暂停，否则卸载会被挂起）。
 */
const transitionProps = computed(() =>
  store.animate
    ? { css: true, name: store.animateName, duration: store.animateDuration }
    : { css: false }
)

/** 是否显示（右侧）展开按钮 */
const showNodeBtn = computed(() => {
  if (props.isLeftChildNode) {
    return (
      store.direction === 'horizontal' &&
      props.showCollapsable &&
      (leftChildNodes.value.length > 0 || lazyPending.value)
    )
  }
  return (
    props.showCollapsable &&
    (!!node.value.childNodes && node.value.childNodes.length > 0 || lazyPending.value)
  )
})

/** 是否显示左侧展开按钮（OKR 模式） */
const showNodeLeftBtn = computed(
  () =>
    store.direction === 'horizontal' &&
    props.showCollapsable &&
    (leftChildNodes.value.length > 0 || (props.isLeftChildNode && lazyPending.value))
)

/** 是否显示左子树 */
const showLeftChildNode = computed(
  () =>
    store.onlyBothTree &&
    store.direction === 'horizontal' &&
    !!leftChildNodes.value &&
    leftChildNodes.value.length > 0
)

const leftBtnCount = computed(() =>
  node.value.level === 1 && leftChildNodes.value.length > 0
    ? leftChildNodes.value.length
    : node.value.childNodes.length
)

/** show-node-num：未加载（未加载完成 / 加载中）时不显示子节点数 */
const showRightBtnText = computed(
  () => !node.value.expanded && (node.value.loaded || !store.lazy)
)
const showLeftBtnText = computed(
  () => !node.value.leftExpanded && (node.value.loaded || !store.lazy)
)

const isOkrRoot = computed(() => node.value.level === 1 && store.onlyBothTree)

const nodeClass = computed(() => ({
  collapsed: !node.value.leftExpanded || !node.value.expanded,
  'is-leaf': isLeaf.value,
  'is-current': node.value.isCurrent,
  'is-left-child-node': props.isLeftChildNode,
  'is-not-child':
    node.value.level === 1 && node.value.childNodes.length <= 0 && leftChildNodes.value.length <= 0,
  'only-both-tree-node': isOkrRoot.value,
  'align-root': isOkrRoot.value && props.alignRoot && store.direction === 'horizontal',
}))

const labelWrapperClass = computed(() => ({
  'is-root-label': node.value.level === 1,
  'is-not-right-child': node.value.level === 1 && node.value.childNodes.length <= 0,
  'is-not-left-child': node.value.level === 1 && leftChildNodes.value.length <= 0,
}))

/** 节点的宽高 */
const computeLabelStyle = computed(() => {
  let labelWidth: string | number = props.labelWidth ?? 'auto'
  let labelHeight: string | number = props.labelHeight ?? 'auto'
  if (typeof labelWidth === 'number') {
    labelWidth = `${labelWidth}px`
  }
  if (typeof labelHeight === 'number') {
    labelHeight = `${labelHeight}px`
  }
  return {
    width: labelWidth,
    height: labelHeight,
  }
})

const computeLabelClass = computed(() => {
  const clsArr: any[] = []
  if (store.labelClassName) {
    if (typeof store.labelClassName === 'function') {
      clsArr.push(store.labelClassName(node.value))
    } else {
      clsArr.push(store.labelClassName)
    }
  }
  if (store.currentLableClassName && node.value.isCurrent) {
    if (typeof store.currentLableClassName === 'function') {
      clsArr.push(store.currentLableClassName(node.value))
    } else {
      clsArr.push(store.currentLableClassName)
    }
  }
  if (node.value.isCurrent) {
    clsArr.push('is-current')
  }
  if (node.value.disabled) {
    clsArr.push('is-disabled')
  }
  return clsArr
})

function getNodeKey(child: TreeNode) {
  return _getNodeKey(props.nodeKey, child.data)
}

// ---- 可访问性：漫游 tabindex + 键盘导航 ----
const hasRightChildren = computed(() => node.value.childNodes.length > 0 || lazyPending.value)
const hasLeftChildren = computed(
  () => leftChildNodes.value.length > 0 || (props.isLeftChildNode && lazyPending.value)
)

/** 该 treeitem 控制的子树是否展开（无子节点时不输出 aria-expanded） */
const ariaExpanded = computed(() => {
  if (props.isLeftChildNode) {
    return hasLeftChildren.value ? (node.value.leftExpanded ? 'true' : 'false') : undefined
  }
  if (!hasRightChildren.value && !hasLeftChildren.value) return undefined
  const rightOpen = hasRightChildren.value ? node.value.expanded : true
  const leftOpen = hasLeftChildren.value ? node.value.leftExpanded : true
  return rightOpen && leftOpen ? 'true' : 'false'
})

const tabIndex = computed(() => {
  const focused = tree!.focusedNode.value
  if (focused) return focused === node.value ? 0 : -1
  // 尚无焦点节点：第一个根节点可 Tab 进入
  return node.value === tree!.root.childNodes[0] && !props.isLeftChildNode ? 0 : -1
})

function handleFocus() {
  tree!.setFocusedNode(node.value)
}

/** 展开（或进入）该节点某一侧的子树 */
function expandOrEnter(side: 'left' | 'right') {
  const current = node.value
  const isOpen = side === 'left' ? current.leftExpanded : current.expanded
  const hasKids = side === 'left' ? hasLeftChildren.value : hasRightChildren.value
  if (!hasKids) return
  if (!isOpen) {
    if (props.showCollapsable) handleBtnClick(side)
    return
  }
  const kids = side === 'left' ? leftChildNodes.value : current.childNodes
  const first = kids.find((child) => child.visible)
  if (first) tree!.focusNode(first)
}

/** 收起该节点某一侧的子树，已收起则回到父节点 */
function collapseOrLeave(side: 'left' | 'right') {
  const current = node.value
  const isOpen = side === 'left' ? current.leftExpanded : current.expanded
  const hasKids = side === 'left' ? hasLeftChildren.value : hasRightChildren.value
  if (hasKids && isOpen && props.showCollapsable) {
    handleBtnClick(side)
    return
  }
  tree!.focusParent(current, props.isLeftChildNode)
}

function handleKeydown(event: KeyboardEvent) {
  // 只处理焦点落在 treeitem 本身的情况，避免干扰节点内的输入控件
  if (event.target !== rootEl.value) return
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault()
      handleNodeClick()
      break
    case 'ArrowDown':
      event.preventDefault()
      tree!.moveFocus(rootEl.value, 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      tree!.moveFocus(rootEl.value, -1)
      break
    case 'Home':
      event.preventDefault()
      tree!.moveFocus(rootEl.value, 'first')
      break
    case 'End':
      event.preventDefault()
      tree!.moveFocus(rootEl.value, 'last')
      break
    case 'ArrowRight':
      event.preventDefault()
      // 左树节点的子树在视觉左侧：→ 表示离开 / 收起；其余节点 → 表示展开 / 进入右侧子树
      if (props.isLeftChildNode) collapseOrLeave('left')
      else expandOrEnter('right')
      break
    case 'ArrowLeft':
      event.preventDefault()
      if (props.isLeftChildNode) expandOrEnter('left')
      else if (isOkrRoot.value && hasLeftChildren.value) expandOrEnter('left')
      else collapseOrLeave('right')
      break
    default:
      return
  }
}

function handleNodeClick() {
  if (node.value.disabled) return
  store.setCurrentNode(node.value)
  tree!.onCurrentChange()
  tree!.emit('node-click', node.value.data, node.value, instance?.proxy)
}

function handleBtnClick(side: 'left' | 'right') {
  const isLeft = side === 'left'
  const current = node.value
  // OKR 飞书模式：根节点的左侧按钮直接切换 leftExpanded（左子树数据 leftData 前置给定，无懒加载）
  if (store.onlyBothTree && isLeft && !props.isLeftChildNode) {
    if (current.leftExpanded) {
      current.leftExpanded = false
      tree!.onExpandChange()
      tree!.emit('node-collapse', current.data, current, instance?.proxy)
    } else {
      current.leftExpanded = true
      tree!.onExpandChange()
      tree!.emit('node-expand', current.data, current, instance?.proxy)
    }
    return
  }
  // 左树节点的展开态在 leftExpanded；懒加载由 expand() 内部处理（首次展开先加载）
  if (props.isLeftChildNode ? current.leftExpanded : current.expanded) {
    if (props.isLeftChildNode) current.leftExpanded = false
    else current.collapse()
    tree!.onExpandChange()
    tree!.emit('node-collapse', current.data, current, instance?.proxy)
  } else {
    current.expand()
    tree!.onExpandChange()
    tree!.emit('node-expand', current.data, current, instance?.proxy)
  }
}

function handleContextMenu(event: MouseEvent) {
  if (tree!.hasContextmenuListener) {
    event.stopPropagation()
    event.preventDefault()
  }
  tree!.emit('node-contextmenu', event, node.value.data, node.value, instance?.proxy)
}
</script>
