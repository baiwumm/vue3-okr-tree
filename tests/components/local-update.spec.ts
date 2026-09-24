import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { VueOkrTree } from '../../src/lib'

/**
 * 局部更新的渲染判据（与 react 仓 `tests/components/local-update.spec.tsx` 对称）。
 *
 * 两仓机制不同，判据只能各按各的形状落：
 * - react：每个节点订阅自己的版本号（`useNodeVersion`），判据是模型层的「谁被 bump」。
 * - vue3：拖拽指示状态是 `OkrTree.vue` provide 下来的 `shallowRef`，每个节点的
 *   `labelWrapperClass` 都读它——实测换一次悬停目标时 18 个节点的该 computed 全部重新求值，
 *   但只有值真的变了的 2 个元素被写入 DOM。所以这里钉的是 **DOM 写入落点**，不是求值次数。
 *
 * 判据同一条：拖拽指示的变更只落在「撤下」与「挂上」那两个 label 上，其余节点一个字节都不动。
 */
function buildData(branches: number, perBranch: number): any[] {
  const out: any[] = []
  let id = 1
  for (let i = 0; i < branches; i++) {
    const children: any[] = []
    for (let j = 0; j < perBranch; j++) children.push({ id: id++, label: `leaf-${i}-${j}` })
    out.push({ id: id++, label: `branch-${i}`, children })
  }
  return out
}

/** 节点自身的标签元素：必须用 :scope 限定直接子代，否则 OKR 根会命中后代节点的标签 */
const ownLabel = (n: HTMLElement) =>
  n
    .querySelector(':scope > .org-chart-node-label > .org-chart-node-label-inner')
    ?.textContent?.trim()
const nodeByLabel = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll<HTMLElement>('.org-chart-node')).find(
    (n) => ownLabel(n) === label
  )!
const labelOf = (n: HTMLElement) => n.querySelector<HTMLElement>(':scope > .org-chart-node-label')!
const innerOf = (n: HTMLElement) =>
  n.querySelector<HTMLElement>(':scope > .org-chart-node-label > .org-chart-node-label-inner')!

/** 分区判定读 label 的 rect 与 clientX / clientY，故与 draggable.spec.ts 同样用 MouseEvent 加桩 */
const mockRect = (el: HTMLElement) => {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    top: 0,
    left: 0,
    width: 100,
    height: 100,
    bottom: 100,
    right: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)
}
const fire = (
  el: HTMLElement,
  type: string,
  coord: { clientX: number; clientY: number } = { clientX: 0, clientY: 0 }
) => {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...coord })
  Object.defineProperty(event, 'dataTransfer', {
    value: { dropEffect: '', effectAllowed: '', setData: () => {}, getData: () => '' },
  })
  el.dispatchEvent(event)
}

/**
 * 等一个宏任务边界再收记录：jsdom 的 MutationObserver 回调按微任务派发，
 * 只 `await nextTick()` 后调 `takeRecords()` 会在「回调已把记录取走」和「回调还没跑」
 * 之间随机拿到空数组——探针实测错过这一拍，整棵树的 class 写入全被读成 0 条。
 */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('拖拽悬停的 DOM 写入落点', () => {
  it('换悬停目标时只写撤下与挂上两个 label，dragstart / dragEnter 一个都不写', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: buildData(6, 2), nodeKey: 'id', draggable: true },
    })
    const root = wrapper.element
    const seen: MutationRecord[] = []
    const observer = new MutationObserver((records) => seen.push(...records))
    observer.observe(root, { attributes: true, attributeFilter: ['class'], subtree: true })

    /** 自上次以来被写了 class 的元素 → 「落点类型:归属节点#当前 drop-* 类」 */
    const written = async () => {
      await settle()
      const records = seen.splice(0, seen.length)
      records.push(...observer.takeRecords())
      return records.map((r) => {
        const el = r.target as HTMLElement
        const isLabel = el.classList.contains('org-chart-node-label')
        const kind = isLabel ? 'label' : el.classList.contains('org-chart-node') ? 'node' : 'other'
        return `${kind}:${ownLabel(isLabel ? el.parentElement! : el)}#${Array.from(el.classList)
          .filter((c) => c.startsWith('drop-'))
          .join('|')}`
      })
    }
    const hover = async (label: string, offset: number) => {
      const el = labelOf(nodeByLabel(root, label))
      mockRect(el)
      fire(el, 'dragover', { clientX: offset, clientY: offset })
      return written()
    }

    fire(innerOf(nodeByLabel(root, 'branch-0')), 'dragstart')
    // draggingNode 只被事件处理器读，没有任何渲染状态依赖它
    expect(await written()).toEqual([])

    expect(await hover('branch-1', 50)).toEqual(['label:branch-1#drop-inner'])
    // 同一节点同一分区再来一次：shallowRef 同值赋值不触发
    expect(await hover('branch-1', 50)).toEqual([])

    expect((await hover('branch-2', 10)).sort()).toEqual([
      'label:branch-1#',
      'label:branch-2#drop-prev',
    ])
    // 同节点换分区：只有它自己重写
    expect(await hover('branch-2', 90)).toEqual(['label:branch-2#drop-next'])

    fire(labelOf(nodeByLabel(root, 'branch-3')), 'dragenter')
    expect(await written()).toEqual([])

    // dragend 收尾：撤下最后的指示，也只写那一个 label
    fire(innerOf(nodeByLabel(root, 'branch-0')), 'dragend')
    expect(await written()).toEqual(['label:branch-2#'])
    observer.disconnect()
  })
})
