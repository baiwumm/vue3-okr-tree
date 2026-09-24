import type { TreeNode } from './model/node'

export interface AriaSetPosition {
  node: TreeNode
  /** 同层可见兄弟数；该节点不可见时为 undefined，连同 pos 一起不输出 aria 属性 */
  size: number | undefined
  pos: number | undefined
}

/**
 * 单遍算出同层可见兄弟的 aria-setsize / aria-posinset，替代「每个节点各自 filter +
 * indexOf」的 O(s²) 写法（由父节点在渲染子列表时算好传下去，订阅关系保持单向）。
 *
 * 语义与旧实现逐字一致：被 filter 隐藏的兄弟不计入；自身不可见的节点不输出这两个属性。
 * 左右两树各自成组——调用方按侧各调一次。
 */
export function setPositions(list: TreeNode[]): AriaSetPosition[] {
  let size = 0
  const positions = list.map((node) => {
    if (!node.visible) return 0
    size += 1
    return size
  })
  return list.map((node, i) =>
    node.visible ? { node, size, pos: positions[i] } : { node, size: undefined, pos: undefined }
  )
}
