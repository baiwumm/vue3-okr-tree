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
    :aria-checked="ariaChecked"
    :aria-disabled="node.disabled ? 'true' : undefined"
    :aria-setsize="ariaSetSize"
    :aria-posinset="ariaPosInSet"
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
          v-for="entry in leftPositions"
          :key="getNodeKey(entry.node)"
          :node="entry.node"
          :aria-set-size="entry.size"
          :aria-pos-in-set="entry.pos"
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

    <div
      class="org-chart-node-label"
      :class="labelWrapperClass"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      @dragover="handleDragOver"
      @drop="handleDrop"
    >
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
        :draggable="isDraggable ? 'true' : 'false'"
        @click="handleNodeClick"
        @dragstart="handleDragStart"
        @dragend="handleDragEnd"
      >
        <span
          v-if="store.showCheckbox"
          class="org-chart-node-checkbox"
          :class="{
            'is-checked': node.checked,
            'is-indeterminate': node.indeterminate && !node.checked,
            'is-disabled': node.disabled,
          }"
          aria-hidden="true"
          @click.stop="handleCheckToggle"
        />
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
          <span v-if="showRightBtnText" class="org-chart-node-btn-text">{{ rightBtnCount }}</span>
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
          v-for="entry in rightPositions"
          :key="getNodeKey(entry.node)"
          :node="entry.node"
          :aria-set-size="entry.size"
          :aria-pos-in-set="entry.pos"
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
import { setPositions } from './aria-set'
import { NodeContent, NodeBtnContent } from './node-content'
import { getNodeKey as _getNodeKey } from './model/util'
import { usePrefersReducedMotion } from './use-reduced-motion'
import type { TreeNode } from './model/node'
import type {
  DropType,
  ExpandBtnSlotScope,
  NodeBtnContentFunction,
  RenderContentFunction,
} from '../../types'

defineOptions({ name: 'OkrTreeNode' })

const props = defineProps({
  node: { type: Object as PropType<TreeNode>, required: true },
  /** 同层可见兄弟数，由父节点算好下发；undefined 表示本节点不可见、不输出该属性 */
  ariaSetSize: { type: Number, default: undefined },
  /** 本节点在同层可见兄弟里的 1-based 序号，口径同 ariaSetSize */
  ariaPosInSet: { type: Number, default: undefined },
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

// 系统要求减少动效时按「animate 关闭」处理：CSS 媒体查询只掐掉过渡，
// 若 JS 仍保留撑高度的延迟，收起后会出现一段空白，状态就不算直切。
const prefersReducedMotion = usePrefersReducedMotion()
const animateOn = computed(() => !!store.animate && !prefersReducedMotion.value)

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
  animateOn.value ? ({ '--okr-anim-duration': `${store.animateDuration}ms` } as CSSProperties) : {}
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
    if (!expanded && animateOn.value) {
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
  animateOn.value ? ['is-animated', `okr-anim-${store.animateName}`] : []
)

/**
 * 子容器挂载/卸载的 <transition>：animate 关闭时传 css:false，让 enter/leave 同步完成，
 * 不依赖 requestAnimationFrame（后台/隐藏标签页中 rAF 会被节流甚至暂停，否则卸载会被挂起）。
 */
const transitionProps = computed(() =>
  animateOn.value
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
    ((!!node.value.childNodes && node.value.childNodes.length > 0) || lazyPending.value)
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

/** show-node-num 与 aria 都按「未被 filter 隐藏」的子节点计数，保证数字与视觉一致 */
const visibleCount = (nodes: TreeNode[]) =>
  nodes.reduce((count, child) => (child.visible ? count + 1 : count), 0)

const rightBtnCount = computed(() => visibleCount(node.value.childNodes))

const leftBtnCount = computed(() =>
  node.value.level === 1 && leftChildNodes.value.length > 0
    ? visibleCount(leftChildNodes.value)
    : visibleCount(node.value.childNodes)
)

/** show-node-num：未加载（未加载完成 / 加载中）时不显示子节点数 */
const showRightBtnText = computed(() => !node.value.expanded && (node.value.loaded || !store.lazy))
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
  // 拖拽放置指示（draggable）：drop-prev / drop-inner / drop-next
  'drop-prev': tree!.dragOverNode.value === node.value && tree!.dragOverType.value === 'prev',
  'drop-inner': tree!.dragOverNode.value === node.value && tree!.dragOverType.value === 'inner',
  'drop-next': tree!.dragOverNode.value === node.value && tree!.dragOverType.value === 'next',
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

/** 复选框模式下的 treeitem 勾选语义（half → mixed）；未开启 show-checkbox 时不输出 */
const ariaChecked = computed(() => {
  if (!store.showCheckbox) return undefined
  if (node.value.indeterminate && !node.value.checked) return 'mixed'
  return node.value.checked ? 'true' : 'false'
})

/**
 * aria-setsize / aria-posinset：按父节点子列表里可见的兄弟节点给出 1-based 序号，
 * 被 filter 隐藏的兄弟不计入（否则读屏会播报不存在的项）。左右子树各自成组。
 */
/**
 * aria-setsize / aria-posinset 由本节点在渲染子列表时按层算一次，作为 props 传下去。
 * 旧写法是每个节点各自读 parent.childNodes 扫两遍 ⇒ 同层 O(s²)；父下发同时保证了
 * 「被 filter 隐藏的兄弟不计入、左右两树各自成组」的原口径。
 */
const leftPositions = computed(() => setPositions(leftChildNodes.value))
const rightPositions = computed(() => setPositions(node.value.childNodes))

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
      event.preventDefault()
      handleNodeClick()
      break
    case ' ':
      event.preventDefault()
      // 复选框模式下空格 = 勾选/取消勾选；否则与 Enter 一致为选中
      if (store.showCheckbox) handleCheckToggle()
      else handleNodeClick()
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
  // expand-on-click-node：与 el-tree 一致，先切换展开再触发 node-click；叶子节点不切换。
  // OKR 根节点点击内容只切换右侧子树（左侧有自己的按钮），左树节点切换自身子树。
  if (store.expandOnClickNode) {
    const hasKids = props.isLeftChildNode ? hasLeftChildren.value : hasRightChildren.value
    if (hasKids) handleBtnClick(props.isLeftChildNode ? 'left' : 'right')
  }
  tree!.emit('node-click', node.value.data, node.value, instance?.proxy)
}

/** 复选框点击 / 空格键：切换勾选并触发 check 事件（携带当前全量勾选信息） */
function handleCheckToggle() {
  if (!store.showCheckbox || node.value.disabled) return
  node.value.setChecked(!node.value.checked, !store.checkStrictly)
  const state = store.collectCheckState()
  tree!.emit('check', node.value.data, {
    checkedNodes: state.checkedNodes.map((n) => n.data),
    checkedKeys: state.checkedKeys,
    halfCheckedNodes: state.halfCheckedNodes,
    halfCheckedKeys: state.halfCheckedKeys,
  })
}

// check-change：勾选状态变化的每个节点各触发一次（含 setCheckedKeys 等批量变更、增删子节点引发的级联）
watch(
  () => [node.value.checked, node.value.indeterminate] as const,
  ([checked, indeterminate], [prevChecked, prevIndeterminate]) => {
    if (!store.showCheckbox) return
    if (checked === prevChecked && indeterminate === prevIndeterminate) return
    tree!.emit('check-change', node.value.data, checked, indeterminate)
  }
)

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
    // accordion：用户交互展开时收起同级兄弟（与 el-tree 一致，仅作用于交互路径）
    if (store.accordion) store.collapseSiblings(current)
    tree!.onExpandChange()
    tree!.emit('node-expand', current.data, current, instance?.proxy)
  }
}

// ---- 拖拽调整层级（draggable，HTML5 DnD）----
const isDraggable = computed(
  () =>
    !!store.draggable &&
    !node.value.disabled &&
    !(store.allowDrag && store.allowDrag(node.value) === false)
)

/**
 * 放置分区（对齐 el-tree 的 25% / 50% / 25%）：按布局方向选轴——
 * horizontal（同级上下排列）按 Y 轴：上 prev / 中 inner / 下 next；
 * vertical（同级左右排列）按 X 轴：左 prev / 中 inner / 右 next。
 */
function calcDropType(event: DragEvent): DropType | null {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const horizontal = store.direction === 'horizontal'
  const size = horizontal ? rect.height : rect.width
  const offset = horizontal ? event.clientY - rect.top : event.clientX - rect.left
  const ratio = size > 0 ? offset / size : 0.5
  if (ratio < 0.25) return 'prev'
  if (ratio > 0.75) return 'next'
  return 'inner'
}

/** 放置校验：自身 / 自身子树内硬性禁止；跨左右树默认禁止（allow-drop 返回 true 放开） */
function dropValid(dragged: TreeNode, type: DropType): boolean {
  if (dragged === node.value || store.contains(dragged, node.value)) return false
  if (dragged.isLeftChild !== node.value.isLeftChild) {
    return store.allowDrop?.(dragged, node.value, type) === true
  }
  return store.allowDrop ? store.allowDrop(dragged, node.value, type) !== false : true
}

function handleDragStart(event: DragEvent) {
  if (!isDraggable.value) {
    event.preventDefault()
    return
  }
  tree!.draggingNode.value = node.value
  event.dataTransfer?.setData('text/plain', String(node.value.key ?? node.value.id))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  tree!.emit('node-drag-start', node.value, event)
}

function handleDragEnd(event: DragEvent) {
  if (tree!.draggingNode.value !== node.value) return
  const dropNode = tree!.dragOverNode.value
  const dropType = tree!.dragOverType.value
  tree!.draggingNode.value = null
  tree!.dragOverNode.value = null
  tree!.dragOverType.value = null
  tree!.emit('node-drag-end', node.value, dropNode, dropType, event)
}

function handleDragEnter(event: DragEvent) {
  const dragged = tree!.draggingNode.value
  if (dragged) tree!.emit('node-drag-enter', dragged, node.value, event)
}

function handleDragOver(event: DragEvent) {
  const dragged = tree!.draggingNode.value
  if (!dragged) return
  const type = calcDropType(event)
  if (!type || !dropValid(dragged, type)) {
    if (tree!.dragOverNode.value === node.value) {
      tree!.dragOverNode.value = null
      tree!.dragOverType.value = null
    }
    return
  }
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  tree!.dragOverNode.value = node.value
  tree!.dragOverType.value = type
  tree!.emit('node-drag-over', dragged, node.value, event)
}

function handleDragLeave(event: DragEvent) {
  if (!tree!.draggingNode.value) return
  // 移动到本节点的子元素上时 relatedTarget 仍在本元素内，不算离开
  const related = event.relatedTarget as Node | null
  if (related && (event.currentTarget as HTMLElement).contains(related)) return
  if (tree!.dragOverNode.value === node.value) {
    tree!.dragOverNode.value = null
    tree!.dragOverType.value = null
  }
  tree!.emit('node-drag-leave', tree!.draggingNode.value, node.value, event)
}

function handleDrop(event: DragEvent) {
  const dragged = tree!.draggingNode.value
  const type = tree!.dragOverType.value
  if (!dragged || !type || tree!.dragOverNode.value !== node.value) return
  event.preventDefault()
  const ok = store.moveNode(dragged, node.value, type)
  tree!.dragOverNode.value = null
  tree!.dragOverType.value = null
  if (!ok) return
  // inner 放置在 moveNode 内已展开目标；同步受控展开态并通知
  tree!.onExpandChange()
  tree!.emit('node-drop', dragged, node.value, type, event)
}

function handleContextMenu(event: MouseEvent) {
  if (tree!.hasContextmenuListener) {
    event.stopPropagation()
    event.preventDefault()
  }
  tree!.emit('node-contextmenu', event, node.value.data, node.value, instance?.proxy)
}
</script>
