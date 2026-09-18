import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { VueOkrTree, type VueOkrTreeInstance } from '../../src/lib'

const makeData = (): any[] => [
  {
    id: 1,
    label: 'A',
    children: [
      { id: 2, label: 'B', children: [{ id: 3, label: 'C' }] },
      { id: 4, label: 'D' },
    ],
  },
]

describe('updateChildren 脏检查（1.5.0 性能）', () => {
  it('未涉及结构的深层原地变更不重建节点实例（脏标记跳过）', async () => {
    const data = reactive(makeData())
    const wrapper = mount(VueOkrTree, { props: { data, nodeKey: 'id' } })
    const vm = wrapper.vm as VueOkrTreeInstance
    const nodeBefore = vm.getNode(2)
    // 修改叶子文本：deep watch 触发，但结构未变 → 节点实例保持复用
    data[0].children![0].label = 'B2'
    await nextTick()
    expect(vm.getNode(2)).toBe(nodeBefore)
    expect(
      wrapper
        .findAll('.org-chart-node-label-inner')
        .map((x: any) => x.text())
        .includes('B2')
    ).toBe(true) // 文本变更由模板响应式直接生效
  })

  it('原地 push 孙子节点时仅受影响路径重建，其余节点复用', async () => {
    const data = reactive(makeData())
    const wrapper = mount(VueOkrTree, { props: { data, nodeKey: 'id' } })
    const vm = wrapper.vm as VueOkrTreeInstance
    const nodeA = vm.getNode(1)
    const nodeD = vm.getNode(4)
    data[0].children![1].children = [{ id: 5, label: 'E' }]
    await nextTick()
    expect(vm.getNode(1)).toBe(nodeA) // 未受影响路径复用
    expect(vm.getNode(4)).toBe(nodeD)
    expect(vm.getNode(5)!.label).toBe('E')
    expect(vm.getNode(4)!.isLeaf).toBe(false)
  })

  it('顶层 push / remove 结构变更仍正常工作（回归）', async () => {
    const data = reactive(makeData())
    const wrapper = mount(VueOkrTree, { props: { data, nodeKey: 'id' } })
    const vm = wrapper.vm as VueOkrTreeInstance
    data.push({ id: 9, label: 'I' })
    await nextTick()
    expect(vm.getNode(9)).toBeTruthy()
    data[0].children!.pop()
    await nextTick()
    expect(vm.getNode(4)).toBeNull()
    expect(vm.getNode(3)).toBeTruthy()
  })
})

describe('deep-watch 开关（1.5.0 性能）', () => {
  it('deep-watch: false 时原地变更不触发更新，引用替换才更新', async () => {
    const data = reactive(makeData())
    const wrapper = mount(VueOkrTree, { props: { data, nodeKey: 'id', deepWatch: false } })
    const vm = wrapper.vm as VueOkrTreeInstance
    data.push({ id: 9, label: 'I' })
    await nextTick()
    expect(vm.getNode(9)).toBeNull() // 未侦听原地变更

    const replacement = [
      { id: 1, label: 'A', children: [{ id: 2, label: 'B' }] },
      { id: 9, label: 'I' },
    ]
    await wrapper.setProps({ data: replacement })
    expect(vm.getNode(9)).toBeTruthy()
    expect(vm.getNode(2)!.label).toBe('B')
  })

  it('默认（未传 deepWatch）保持原地变更增量更新', async () => {
    const data = reactive(makeData())
    const wrapper = mount(VueOkrTree, { props: { data, nodeKey: 'id' } })
    const vm = wrapper.vm as VueOkrTreeInstance
    data.push({ id: 9, label: 'I' })
    await nextTick()
    expect(vm.getNode(9)).toBeTruthy()
  })
})
