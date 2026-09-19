import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { VueOkrTree, type VueOkrTreeInstance } from '../../src/lib'

const makeData = () => [
  {
    id: 1,
    label: 'Root',
    children: [
      {
        id: 11,
        label: 'A',
        children: [
          { id: 111, label: 'A1' },
          { id: 112, label: 'A2' },
        ],
      },
      { id: 12, label: 'B', children: [{ id: 121, label: 'B1' }] },
      { id: 13, label: 'C' },
    ],
  },
]

/** OKR 的 leftData[0] 是根节点的左侧镜像（与右树根同 id），渲染的是它的 children */
const makeLeftData = () => [
  {
    id: 1,
    label: 'Root',
    children: [
      { id: 21, label: '左A', children: [{ id: 211, label: '左A1' }] },
      { id: 22, label: '左B' },
    ],
  },
]

const mountTree = (props: Record<string, any> = {}) => {
  const wrapper = mount(VueOkrTree, {
    props: { data: makeData(), nodeKey: 'id', showCollapsable: true, ...props },
  })
  return { wrapper, vm: wrapper.vm as VueOkrTreeInstance }
}

const labelsOf = (nodes: { label: string }[]) => nodes.map((n) => n.label)

describe('getVisibleNodes', () => {
  it('折叠的子树不计入，即使它仍挂载在 DOM 中', async () => {
    const { wrapper, vm } = mountTree()
    expect(labelsOf(vm.getVisibleNodes())).toEqual(['Root'])
    // 折叠节点仍存在于 DOM（靠 is-hidden 收起），二者必须区分开
    expect(wrapper.findAll('.org-chart-node')).toHaveLength(7)

    vm.expandNode(1)
    await wrapper.vm.$nextTick()
    expect(labelsOf(vm.getVisibleNodes())).toEqual(['Root', 'A', 'B', 'C'])

    vm.expandNode(11)
    await wrapper.vm.$nextTick()
    expect(labelsOf(vm.getVisibleNodes())).toEqual(['Root', 'A', 'A1', 'A2', 'B', 'C'])

    vm.collapseNode(1)
    await wrapper.vm.$nextTick()
    expect(labelsOf(vm.getVisibleNodes())).toEqual(['Root'])
  })

  it('expandAll 后与全部节点一致；filter 只保留通过过滤的可见节点', async () => {
    const filterNodeMethod = (value: string, data: any) =>
      !value ? true : String(data.label).includes(value)
    const { wrapper, vm } = mountTree({ filterNodeMethod })
    vm.expandAll()
    await wrapper.vm.$nextTick()
    expect(vm.getVisibleNodes()).toHaveLength(7)

    vm.filter('A1')
    await wrapper.vm.$nextTick()
    // 父节点有可见后代时保持可见（element-ui 语义），A2 / B / C 被过滤掉
    expect(labelsOf(vm.getVisibleNodes())).toEqual(['Root', 'A', 'A1'])
  })

  it('OKR 模式左树按 leftExpanded 计入', async () => {
    const { wrapper, vm } = mountTree({
      leftData: makeLeftData(),
      onlyBothTree: true,
      direction: 'horizontal',
    })
    const withoutLeft = vm.getVisibleNodes()
    vm.expandNode(1)
    await wrapper.vm.$nextTick()
    const firstRoot = vm.store.root.childNodes[0]
    firstRoot.leftExpanded = true
    await wrapper.vm.$nextTick()
    const withLeft = vm.getVisibleNodes()
    expect(withLeft.length).toBeGreaterThan(withoutLeft.length)
    expect(labelsOf(withLeft)).toEqual(['Root', 'A', 'B', 'C', '左A', '左B'])

    // 左树自身的下级同样只看 leftExpanded
    firstRoot.leftChildNodes[0].leftExpanded = true
    await wrapper.vm.$nextTick()
    expect(labelsOf(vm.getVisibleNodes())).toContain('左A1')
  })
})

describe('getNodePath', () => {
  it('key / data 对象 / Node 实例三种入参返回同一条链', () => {
    const { vm } = mountTree()
    const byKey = vm.getNodePath(111)
    const node = vm.getNode(111)!
    expect(labelsOf(byKey)).toEqual(['Root', 'A', 'A1'])
    expect(vm.getNodePath(node.data)).toEqual(byKey)
    expect(vm.getNodePath(node)).toEqual(byKey)
    expect(byKey[byKey.length - 1]).toBe(node)
  })

  it('顶层节点的链路只含自身；未命中返回空数组', () => {
    const { vm } = mountTree()
    expect(labelsOf(vm.getNodePath(1))).toEqual(['Root'])
    expect(vm.getNodePath(999)).toEqual([])
    expect(vm.getNodePath(null as any)).toEqual([])
  })

  it('OKR 左树节点的链路留在左树内，不跨接到右树根', () => {
    const { vm } = mountTree({
      leftData: makeLeftData(),
      onlyBothTree: true,
      direction: 'horizontal',
    })
    // 左树顶层是根节点的左侧镜像（与右树根同 key），链路沿左树父链上溯到它为止
    expect(labelsOf(vm.getNodePath(211))).toEqual(['Root', '左A', '左A1'])
  })
})
