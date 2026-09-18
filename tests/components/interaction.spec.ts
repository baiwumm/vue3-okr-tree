import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { VueOkrTree, type VueOkrTreeInstance } from '../../src/lib'

const makeData = () => [
  {
    id: 1,
    label: 'Root',
    children: [
      { id: 11, label: 'A', children: [{ id: 111, label: 'A1' }] },
      { id: 12, label: 'B', children: [{ id: 121, label: 'B1' }] },
      { id: 13, label: 'C', children: [{ id: 131, label: 'C1' }] },
    ],
  },
]

/**
 * 收起态的子容器仍渲染在 DOM 中（height: 0 隐藏），文档序包含未展开的子孙节点，
 * 且展开/收起会触发元素重建——按标签文本每次重新查找才是稳定定位。
 */
const nodeByLabel = (w: any, label: string) =>
  w
    .findAll('.org-chart-node')
    .find((n: any) => n.find('.org-chart-node-label-inner').text() === label)

const clickBtnOf = async (w: any, label: string) => {
  const btn = nodeByLabel(w, label).find('.org-chart-node-btn')
  await btn.trigger('click')
}

describe('accordion 手风琴模式（2.x #13）', () => {
  it('默认关闭：同级兄弟可同时展开', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), showCollapsable: true, nodeKey: 'id' },
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    await clickBtnOf(wrapper, 'A')
    await clickBtnOf(wrapper, 'B')
    expect(vm.getNode(11)!.expanded).toBe(true)
    expect(vm.getNode(12)!.expanded).toBe(true)
  })

  it('开启后：交互展开 B 时自动收起同级已展开的 A', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), showCollapsable: true, accordion: true, nodeKey: 'id' },
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    await clickBtnOf(wrapper, 'A')
    expect(vm.getNode(11)!.expanded).toBe(true)
    await clickBtnOf(wrapper, 'B')
    expect(vm.getNode(12)!.expanded).toBe(true)
    expect(vm.getNode(11)!.expanded).toBe(false)
  })

  it('键盘方向键触发的展开同样受互斥约束', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), showCollapsable: true, accordion: true, nodeKey: 'id' },
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    await clickBtnOf(wrapper, 'A')
    const nodeB = nodeByLabel(wrapper, 'B')
    ;(nodeB.element as HTMLElement).focus()
    // → 键展开当前节点（Enter 是选中/激活语义，展开需 expand-on-click-node）
    await nodeB.trigger('keydown', { key: 'ArrowRight' })
    expect(vm.getNode(12)!.expanded).toBe(true)
    expect(vm.getNode(11)!.expanded).toBe(false)
  })

  it('程序化 expandNode 不受互斥限制（与 el-tree 语义一致）', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), showCollapsable: true, accordion: true, nodeKey: 'id' },
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    vm.expandNode(11)
    vm.expandNode(12)
    expect(vm.getNode(11)!.expanded).toBe(true)
    expect(vm.getNode(12)!.expanded).toBe(true)
  })

  it('受控 expanded-keys 含多个同级 key 时全部生效', async () => {
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        showCollapsable: true,
        accordion: true,
        nodeKey: 'id',
        expandedKeys: [11, 12],
      },
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    expect(vm.getNode(11)!.expanded).toBe(true)
    expect(vm.getNode(12)!.expanded).toBe(true)
  })

  it('运行时切换 accordion 即时生效', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), showCollapsable: true, nodeKey: 'id' },
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    await wrapper.setProps({ accordion: true })
    await clickBtnOf(wrapper, 'A')
    await clickBtnOf(wrapper, 'B')
    expect(vm.getNode(12)!.expanded).toBe(true)
    expect(vm.getNode(11)!.expanded).toBe(false)
  })
})

describe('expand-on-click-node 点击节点内容展开（2.x #13）', () => {
  const clickLabel = async (w: any, label: string) => {
    await nodeByLabel(w, label).find('.org-chart-node-label-inner').trigger('click')
  }

  it('默认 false：点击节点内容只选中，不切换展开', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), showCollapsable: true, nodeKey: 'id' },
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    await clickLabel(wrapper, 'A')
    expect(vm.getNode(11)!.expanded).toBe(false)
    expect(vm.getNode(11)!.isCurrent).toBe(true)
  })

  it('开启后：点击节点内容切换展开/收起，且选中态与 node-click 正常', async () => {
    const onNodeClick = vi.fn()
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        showCollapsable: true,
        expandOnClickNode: true,
        nodeKey: 'id',
        onNodeClick,
      },
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    await clickLabel(wrapper, 'A')
    expect(vm.getNode(11)!.expanded).toBe(true)
    expect(vm.getNode(11)!.isCurrent).toBe(true)
    await clickLabel(wrapper, 'A')
    expect(vm.getNode(11)!.expanded).toBe(false)
    expect(onNodeClick).toHaveBeenCalledTimes(2)
  })

  it('叶子节点点击内容不切换展开', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), showCollapsable: true, expandOnClickNode: true, nodeKey: 'id' },
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    vm.expandNode(11)
    await nextTick()
    await clickLabel(wrapper, 'A1')
    expect(vm.getNode(11)!.expanded).toBe(true) // 不受影响
    expect(vm.getNode(111)!.isCurrent).toBe(true)
  })
})
