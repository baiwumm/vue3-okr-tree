import type { TreeNodeData } from '../../../types'

/** 源数据上的隐藏内部 id 标记（不可枚举） */
export const NODE_KEY = '$treeNodeId'

/**
 * 在源数据对象上写入不可枚举的内部 node id。
 * 未配置 node-key 时，该标记作为 v-for key 与 getNode(data) 的查找依据。
 */
export const markNodeData = function (node: { id: number }, data: TreeNodeData | null | undefined) {
  if (!data || typeof data !== 'object' || (data as any)[NODE_KEY]) return
  Object.defineProperty(data, NODE_KEY, {
    value: node.id,
    enumerable: false,
    configurable: false,
    writable: false,
  })
}

/** 读取节点 key：配置了 node-key 用该字段，否则用隐藏标记 */
export const getNodeKey = function (key: string | undefined, data: TreeNodeData) {
  if (!key) return data[NODE_KEY]
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
