/**
 * 消费者类型示例（CI 的 verify 作业在这里编译**发布产物**的 d.ts）
 *
 * 这里刻意不 import `src/`，而是 import 包名 `vue3-okr-tree`，由同目录的 tsconfig.json 用
 * `paths` 指到 `../dist/index.d.ts`。库自身的 `pnpm typecheck` 编译的是源码，
 * 编译不到「产物 d.ts 在消费者安装的 Vue 类型下是否可用」这件事——
 * 产物公开面一旦用到某个更高版本 Vue 才有的类型，这里就会红。
 *
 * 这个文件的每一条都是断言：改动公开 API 类型时，它跟着改；不要为了让 CI 绿而放宽它。
 * 故意用 plain .ts（不用 SFC），这样只需 `tsc`，不必为消费者装 `vue-tsc`。
 */
import { h, type App } from 'vue'
import OkrTreePlugin, {
  BUILT_IN_THEMES,
  DEFAULT_PROPS,
  NODE_KEY,
  OkrTree,
  OkrTreeGroup,
  OkrTreeViewport,
  TreeNode,
  TreeStore,
  VueOkrTree,
  clampZoom,
  computeFit,
  createTypedOkrTree,
  getNodeKey,
  loadHtmlToImage,
  markNodeData,
  renderToDataUrl,
  type ConnectorShape,
  type ExpandBtnSlotScope,
  type ExportImageOptions,
  type OkrTreeGroupInstance,
  type OkrTreeViewportInstance,
  type TreeKey,
  type TreeNodeData,
  type TreeTheme,
  type ViewportOffset,
  type VueOkrTreeInstance,
} from 'vue3-okr-tree'

type Dept = { id: number; label: string; head?: string; children?: Dept[] }

const data: Dept[] = [{ id: 1, label: '总部', children: [{ id: 2, label: '研发', head: '张三' }] }]

/** 默认导出是插件（D6）：app.use(...) 即可全局注册四个组件 */
export function install(app: App) {
  app.use(OkrTreePlugin)
}

/**
 * props 面：`$props` 是精确类型，对象字面量多写一个不存在的 prop 会被报错。
 * 这里覆盖本轮新增与易回归的那批：connector / connectorShape / virtual / 受控键 / 事件。
 */
const treeProps: VueOkrTreeInstance['$props'] = {
  data,
  nodeKey: 'id',
  direction: 'horizontal',
  showCollapsable: true,
  showNodeNum: true,
  defaultExpandAll: true,
  animate: true,
  animateName: 'okr-zoom-in-left',
  animateDuration: 240,
  labelWidth: 160,
  labelHeight: '3rem',
  theme: 'feishu' satisfies TreeTheme,
  connector: 'svg',
  connectorShape: 'orthogonal' satisfies ConnectorShape,
  virtual: true,
  expandedKeys: [1],
  currentKey: 2,
  labelClassName: (node: TreeNode) => `lvl-${node.level}`,
  currentLableClassName: 'is-active',
  renderContent: (createElement, node) => createElement('span', node.data.label),
  filterNodeMethod: (value, row: TreeNodeData) => !value || String(row.label).includes(value),
  'onNode-click': (row: TreeNodeData, node: TreeNode) => console.log(row.id, node.level),
  'onUpdate:expandedKeys': (keys: TreeKey[]) => console.log(keys.length),
}

export const Basic = () =>
  h(OkrTree, treeProps, {
    default: ({ node, data: row }: { node: TreeNode; data: TreeNodeData }) =>
      h('span', `${node.level}:${row.label}`),
    'expand-btn': (scope: ExpandBtnSlotScope) => (scope.expanded ? '−' : '+'),
    empty: () => h('span', '暂无数据'),
  })

/** 泛型入口：插槽作用域中的 data 收窄为 Dept（D5：源项目的 createTypedOkrTree 已移除） */
const DeptTree = createTypedOkrTree<Dept>()

export const Typed = () =>
  h(
    DeptTree,
    { data, nodeKey: 'id' },
    {
      default: ({ node, data: row }: { node: TreeNode; data: Dept }) =>
        h('em', `${row.label}-${node.isLeaf ? 'leaf' : 'branch'}`),
    }
  )

/** 组合与画布：Group 的 align、Viewport 的受控 zoom / offset 与 wheelBehavior */
export const Grouped = () =>
  h(OkrTreeGroup, { align: true }, { default: () => [h(OkrTree, treeProps)] })

export const Canvas = () =>
  h(
    OkrTreeViewport,
    {
      zoom: 1,
      minZoom: 0.4,
      maxZoom: 2,
      offset: { x: 0, y: 0 } satisfies ViewportOffset,
      wheelBehavior: 'ctrl-zoom',
      toolbar: true,
    },
    {
      default: () => h(OkrTree, treeProps),
      toolbar: (scope: {
        zoom: number
        zoomIn: () => void
        zoomOut: () => void
        reset: () => void
        fit: () => void
      }) => h('button', { onClick: scope.fit }, `${scope.zoom}x`),
    }
  )

/** 实例方法面：逐个调用 `defineExpose` 的方法，签名漂移即报错 */
export function callTreeMethods(tree: VueOkrTreeInstance) {
  tree.filter('研发')
  tree.expandAll()
  tree.collapseAll()
  tree.setCurrentKey(2)
  tree.setCurrentNode(tree.getNode(2) ?? tree.root)
  tree.append({ id: 3, label: '新部门' }, 1)
  tree.insertBefore({ id: 4, label: '前置' }, 2)
  tree.insertAfter({ id: 5, label: '后置' }, 2)
  tree.remove(2)
  tree.updateKeyChildren(1, data)
  tree.setCheckedKeys([2])
  tree.isChecked(2)
  tree.moveNode(3, 2, 'inner')
  const store: TreeStore = tree.store
  const root: TreeNode = tree.root
  const keys: TreeKey[] = tree.getCheckedKeys()
  const half: TreeKey[] = tree.getHalfCheckedKeys()
  const path: TreeNode[] = tree.getNodePath(2)
  const visible: TreeNode[] = tree.getVisibleNodes()
  const el: HTMLElement | null = tree.getNodeEl(2)
  const current: TreeNodeData | null = tree.getCurrentNode()
  const currentKey: TreeKey | null = tree.getCurrentKey()
  const expanded: TreeNode | null = tree.expandNode(2, true)
  const collapsed: TreeNode | null = tree.collapseNode(2)
  const scrolled: Promise<boolean> = tree.scrollToNode(2, { block: 'center' })
  void [
    store,
    root,
    keys,
    half,
    path,
    visible,
    el,
    current,
    currentKey,
    expanded,
    collapsed,
    scrolled,
  ]
}

export function callViewportMethods(viewport: OkrTreeViewportInstance) {
  viewport.zoomIn()
  viewport.zoomOut()
  viewport.reset()
  viewport.fitToScreen(24)
  const centered: Promise<boolean> = viewport.centerNode(2)
  const image: Promise<string> = viewport.exportImage({ scale: 2 })
  const zoom: number = viewport.getZoom()
  const offset: ViewportOffset = viewport.getOffset()
  void [centered, image, zoom, offset]
}

export function callGroupMethods(group: OkrTreeGroupInstance) {
  group.refresh()
}

/** 导出常量与工具函数面 */
export function utilities() {
  const builtIn: readonly string[] = BUILT_IN_THEMES
  const nodeKey = getNodeKey('id', { id: 1 })
  const marked = markNodeData({ id: 1 }, { label: 'x' })
  const options: ExportImageOptions = { scale: 2, background: '#fff' }
  const zoomed: number = clampZoom(1.4, 0.4, 2)
  const fitted = computeFit(1200, 800, 400, 300, 24, 0.4, 2)
  const dataUrl: Promise<string> = renderToDataUrl(document.body, options)
  const htmlToImage = loadHtmlToImage()
  void [
    builtIn,
    DEFAULT_PROPS,
    NODE_KEY,
    VueOkrTree,
    nodeKey,
    marked,
    zoomed,
    fitted,
    dataUrl,
    htmlToImage,
  ]
}
