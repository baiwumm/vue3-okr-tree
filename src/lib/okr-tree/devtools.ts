import type { TreeNode } from './model/node'
import type { TreeStore } from './model/tree-store'
import { isDev } from './model/util'

/**
 * Vue Devtools 面板（仅开发环境）：查看每棵存活 OkrTree 的节点注册表、
 * 展开 / 选中 / 勾选状态。零依赖——不引 @vue/devtools-api，直接按它的 v6 线协议
 * 与 `window.__VUE_DEVTOOLS_GLOBAL_HOOK__` 握手（事件名与排队条目形状逐字同源，
 * 见 `requestPluginSetup` 注释），api 对象由 Devtools 后端在 setupFn 回调里传入。
 *
 * 门控与开发期警告一致：运行时 `isDev()`，使用方的打包器替换 process.env.NODE_ENV
 * 后注册调用整段死代码消除（Pinia / Vue Router 的同款模型）；SSR（无 window）不注册，
 * 浏览器直接引 UMD（无 process）也视为生产环境。
 */

const PLUGIN_ID = 'vue3-okr-tree'
const INSPECTOR_ID = 'vue3-okr-tree'

interface DevtoolsRegistryEntry {
  id: string
  store: TreeStore
}

interface InspectorTag {
  label: string
  textColor: number
  backgroundColor: number
  tooltip?: string
}

interface InspectorTreeNode {
  id: string
  label: string
  children: InspectorTreeNode[]
  tags: InspectorTag[]
}

/** v6 插件用到的 api 面；字段全按官方类型的最小结构声明 */
interface DevtoolsApi {
  addInspector(inspector: Record<string, unknown>): void
  on: {
    getInspectorTree(cb: (payload: InspectorTreePayload) => void): void
    getInspectorState(cb: (payload: InspectorStatePayload) => void): void
  }
}

interface InspectorTreePayload {
  inspectorId: string
  filter?: string
  rootNodes?: InspectorTreeNode[]
}

interface InspectorStatePayload {
  inspectorId: string
  nodeId: string
  state?: Record<string, Record<string, unknown>>
}

const registry: DevtoolsRegistryEntry[] = []
let seq = 0
let setupRequested = false

/** 仅供测试：清空注册表与握手标记，隔离用例间的模块级状态 */
export function resetDevtoolsForTests(): void {
  registry.length = 0
  seq = 0
  setupRequested = false
}

/** 仅供测试：读当前注册表快照 */
export function getDevtoolsRegistry(): readonly DevtoolsRegistryEntry[] {
  return registry
}

/** OkrTree 挂载时注册本实例；生产构建里 isDev() 恒 false，整段被消除 */
export function registerOkrTreeDevtools(store: TreeStore): void {
  if (!isDev() || typeof window === 'undefined') return
  if (!setupRequested) {
    setupRequested = true
    requestPluginSetup(
      {
        id: PLUGIN_ID,
        label: 'Vue OKR Tree',
        logo: 'https://baiwumm.github.io/vue3-okr-tree/logo.svg',
        packageName: 'vue3-okr-tree',
        homepage: 'https://github.com/baiwumm/vue3-okr-tree',
        componentStateTypes: [PLUGIN_ID],
      },
      setupDevtools
    )
  }
  seq += 1
  registry.push({ id: `tree:${seq}`, store })
}

export function unregisterOkrTreeDevtools(store: TreeStore): void {
  const index = registry.findIndex((entry) => entry.store === store)
  if (index >= 0) registry.splice(index, 1)
}

/**
 * 与 @vue/devtools-api v6 `setupDevtoolsPlugin` 同构的免依赖握手：
 * - hook 已在（扩展先于本库注入）：emit `devtools-plugin:setup`（HOOK_SETUP 常量），
 *   后端监听该事件后回调 setupFn 并传入真实 api；
 * - hook 未在：把与 devtools-api 相同形状的条目排入 `__VUE_DEVTOOLS_PLUGINS__`，
 *   后端初始化时从该队列取回接管。不设 enableEarlyProxy ⇒ proxy 恒为 null，
 *   与「未申请早代理的官方插件」排入的条目逐字同形——后端无法也不必区分两者。
 */
function requestPluginSetup(
  pluginDescriptor: Record<string, unknown>,
  setupFn: (api: DevtoolsApi) => void
): void {
  const hook = (
    globalThis as { __VUE_DEVTOOLS_GLOBAL_HOOK__?: { emit: (...args: unknown[]) => void } }
  ).__VUE_DEVTOOLS_GLOBAL_HOOK__
  if (hook && typeof hook.emit === 'function') {
    hook.emit('devtools-plugin:setup', pluginDescriptor, setupFn)
    return
  }
  const target = globalThis as { __VUE_DEVTOOLS_PLUGINS__?: Array<Record<string, unknown>> }
  target.__VUE_DEVTOOLS_PLUGINS__ = target.__VUE_DEVTOOLS_PLUGINS__ || []
  target.__VUE_DEVTOOLS_PLUGINS__.push({ pluginDescriptor, setupFn, proxy: null })
}

function setupDevtools(api: DevtoolsApi): void {
  api.addInspector({
    id: INSPECTOR_ID,
    label: 'OkrTree',
    icon: 'account_tree',
    treeFilterPlaceholder: '按根节点文案过滤树实例',
    noSelectionText: '在左侧选择一棵树实例，查看它的节点注册表与展开 / 选中状态',
  })
  api.on.getInspectorTree((payload) => {
    if (payload.inspectorId !== INSPECTOR_ID) return
    payload.rootNodes = buildInspectorTree(payload.filter)
  })
  api.on.getInspectorState((payload) => {
    if (payload.inspectorId !== INSPECTOR_ID) return
    payload.state = buildInspectorState(payload.nodeId)
  })
}

/** 面板左列：每棵存活实例一个条目（只列实例，树形展开交给状态页，避免大树刷爆左列） */
export function buildInspectorTree(filter?: string): InspectorTreeNode[] {
  const needle = filter?.trim().toLowerCase()
  return registry
    .map((entry) => {
      const topNodes = entry.store.root?.childNodes ?? []
      const firstName = topNodes[0] ? String(topNodes[0].label) : '（空树）'
      const label = topNodes.length > 1 ? `${firstName} 等 ${topNodes.length} 棵根` : firstName
      const tags = [nodeCountTag(entry.store)]
      if (Object.keys(entry.store.leftNodesMap ?? {}).length > 0) {
        tags.push({
          label: 'OKR',
          textColor: 0xffffff,
          backgroundColor: 0x42b883,
          tooltip: '含左子树（onlyBothTree 模式）',
        })
      }
      return { id: entry.id, label, children: [] as InspectorTreeNode[], tags }
    })
    .filter(
      (node) =>
        !needle ||
        node.label.toLowerCase().includes(needle) ||
        node.tags.some((tag) => tag.label.toLowerCase().includes(needle))
    )
}

function nodeCountTag(store: TreeStore): InspectorTag {
  const right = Object.keys(store.nodesMap ?? {}).length
  const left = Object.keys(store.leftNodesMap ?? {}).length
  return {
    label: left > 0 ? `${right}+${left}` : `${right}`,
    textColor: 0xffffff,
    backgroundColor: 0x2c66c4,
    tooltip: left > 0 ? '右树 / 左树注册表节点数' : '注册表节点数',
  }
}

/** 面板右列：选中实例的概要 + 节点注册表全量转储（按需拉取，不改渲染路径） */
export function buildInspectorState(
  nodeId: string
): Record<string, Record<string, unknown>> | undefined {
  const entry = registry.find((candidate) => candidate.id === nodeId)
  if (!entry) return undefined
  const store = entry.store
  const rightNodes = Object.values(store.nodesMap ?? {})
  const leftNodes = Object.values(store.leftNodesMap ?? {})
  const allNodes = rightNodes.concat(leftNodes)
  const summary: Record<string, unknown> = {
    右树节点数: rightNodes.length,
    展开节点数: allNodes.filter((node) => node.expanded).length,
    当前节点: describeNode(store.currentNode),
  }
  if (leftNodes.length > 0) {
    summary['左树节点数'] = leftNodes.length
    summary['当前左节点'] = describeNode(store.currentLeftNode)
  }
  if (store.showCheckbox) {
    summary['勾选节点数'] = allNodes.filter((node) => node.checked).length
    summary['半选节点数'] = allNodes.filter((node) => node.indeterminate).length
  }
  const state: Record<string, Record<string, unknown>> = {
    概要: summary,
    '节点注册表（右树）': dumpNodes(rightNodes),
  }
  if (leftNodes.length > 0) state['节点注册表（左树）'] = dumpNodes(leftNodes)
  return state
}

function describeNode(node: TreeNode | null): string {
  if (!node) return '（无）'
  return `${String(node.key)}（${String(node.label)}）`
}

function dumpNodes(nodes: TreeNode[]): Record<string, Record<string, unknown>> {
  const dump: Record<string, Record<string, unknown>> = {}
  for (const node of nodes) {
    dump[String(node.key)] = {
      文案: String(node.label),
      层级: node.level,
      展开: node.expanded,
      可见: node.visible,
      子节点数: node.childNodes.length,
      ...(storeHasCheckbox(node) ? { 勾选: node.checked, 半选: node.indeterminate } : {}),
      ...(node.isLeftChild ? { 左树: true } : {}),
    }
  }
  return dump
}

function storeHasCheckbox(node: TreeNode): boolean {
  return !!node.store.showCheckbox
}
