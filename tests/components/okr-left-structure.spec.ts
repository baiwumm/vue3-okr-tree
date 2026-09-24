import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { VueOkrTree, type VueOkrTreeInstance } from '../../src/lib'
import { resetWarnings } from '../../src/lib/okr-tree/model/util'

// leftData 首项是包装根，它不进画面，它的 children 才是左树顶层
const makeLeftData = () => [
  {
    id: 100,
    label: 'LRoot',
    children: [
      { id: 101, label: 'L1', children: [{ id: 1011, label: 'L1a' }] },
      { id: 102, label: 'L2' },
    ],
  },
]

const mountTree = () =>
  mount(VueOkrTree, {
    props: {
      data: [{ id: 1, label: 'R' }],
      leftData: makeLeftData(),
      onlyBothTree: true,
      direction: 'horizontal',
      nodeKey: 'id',
    },
  })

const inst = (w: ReturnType<typeof mountTree>) => w.vm as unknown as VueOkrTreeInstance

const leftLabels = (w: ReturnType<typeof mountTree>) =>
  Array.from(
    w.element.querySelectorAll('.org-chart-node.is-left-child-node') as NodeListOf<Element>
  ).map(
    (el) =>
      el
        .querySelector(':scope > .org-chart-node-label > .org-chart-node-label-inner')
        ?.textContent?.trim() ?? ''
  )

describe('OKR 左树顶层的结构性变更（与 react-okr-tree 同形的基线用例）', () => {
  beforeEach(() => resetWarnings())

  it('remove 左树顶层节点：画面随即少掉它和它的子树', async () => {
    const w = mountTree()
    expect(leftLabels(w)).toEqual(['L1', 'L1a', 'L2'])

    inst(w).remove(101)
    await nextTick()

    expect(leftLabels(w)).toEqual(['L2'])
    expect(inst(w).getNode(101)).toBeNull()
    expect(inst(w).getNode(1011)).toBeNull()
  })

  it('append 到左树顶层：新节点出现在画面上', async () => {
    const w = mountTree()
    inst(w).append({ id: 103, label: 'L3' }, 100)
    await nextTick()
    expect(leftLabels(w)).toEqual(['L1', 'L1a', 'L2', 'L3'])
  })

  it('insertBefore 左树顶层同级：顺序与模型一致', async () => {
    const w = mountTree()
    inst(w).insertBefore({ id: 104, label: 'L0' }, 101)
    await nextTick()
    expect(leftLabels(w)).toEqual(['L0', 'L1', 'L1a', 'L2'])
  })
})
