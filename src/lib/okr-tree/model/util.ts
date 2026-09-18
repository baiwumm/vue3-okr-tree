import type { TreeNodeData } from '../../../types'

/** 源数据上的隐藏内部 id 标记（不可枚举） */
export const NODE_KEY = '$treeNodeId'

/**
 * markNodeData 写入失败的兜底注册表（冻结/只读对象上 Object.defineProperty 会抛 TypeError）。
 * WeakMap 不阻止源数据被回收。
 */
const nodeIdByData = new WeakMap<object, number>()

/** 开发期「只读源数据」一次性警告（回写类操作在冻结数据上不生效时触发） */
export function warnReadonlySource(action: string) {
  warn(
    `检测到冻结/只读源数据，"${action}" 需要回写源数据，本次操作不会生效。` +
      'append / insertBefore / insertAfter / remove / updateKeyChildren / 懒加载 resolve 等回写类方法与冻结数据不兼容' +
      '（详见 README「需要注意的行为」）。'
  )
}

/**
 * 在源数据对象上写入不可枚举的内部 node id。
 * 未配置 node-key 时，该标记作为 v-for key 与 getNode(data) 的查找依据。
 * 冻结/只读对象上写入失败时降级到 WeakMap 兜底（行为不变，不抛错）。
 */
export const markNodeData = function (node: { id: number }, data: TreeNodeData | null | undefined) {
  if (!data || typeof data !== 'object' || (data as any)[NODE_KEY]) return
  try {
    Object.defineProperty(data, NODE_KEY, {
      value: node.id,
      enumerable: false,
      configurable: false,
      writable: false,
    })
  } catch {
    nodeIdByData.set(data, node.id)
  }
}

/** 读取节点 key：配置了 node-key 用该字段，否则用隐藏标记（或 WeakMap 兜底） */
export const getNodeKey = function (key: string | undefined, data: TreeNodeData) {
  if (!key) return data[NODE_KEY] ?? nodeIdByData.get(data)
  return data[key]
}

/** 浅合并（对应原 model/merge.js，忽略 undefined 值） */
export function objectAssign<T extends object>(target: T, ...sources: any[]): T {
  for (const source of sources) {
    if (!source) continue
    for (const prop in source) {
      if (Object.prototype.hasOwnProperty.call(source, prop)) {
        const value = source[prop]
        if (value !== undefined) {
          ;(target as any)[prop] = value
        }
      }
    }
  }
  return target
}

/**
 * 是否处于开发环境：由使用方的打包器替换 process.env.NODE_ENV；
 * 浏览器直接引用 UMD 时 process 不存在 → 视为生产环境，不输出警告。
 */
export const isDev = (): boolean =>
  typeof process !== 'undefined' && !!process.env && process.env.NODE_ENV !== 'production'

const warned = new Set<string>()

/** 开发期警告（同一条默认只输出一次） */
export function warn(message: string, once = true) {
  if (!isDev()) return
  if (once) {
    if (warned.has(message)) return
    warned.add(message)
  }
  console.warn(`[vue3-okr-tree] ${message}`)
}

/** 测试用：清空去重记录 */
export function resetWarnings() {
  warned.clear()
}
