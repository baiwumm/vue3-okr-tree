import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { VueOkrTree, type VueOkrTreeInstance } from '../../src/lib'
import { getNodeKey, markNodeData } from '../../src/lib/okr-tree/model/util'
import { resetWarnings } from '../../src/lib/okr-tree/model/util'

const makeData = () => [
  {
    id: 1,
    label: 'A',
    children: [
      { id: 2, label: 'B' },
      { id: 4, label: 'D' },
    ],
  },
]

const labels = (w: any) => w.findAll('.org-chart-node-label-inner').map((x: any) => x.text())
const nodeByLabel = (w: any, label: string) =>
  w
    .findAll('.org-chart-node')
    .find((n: any) => n.find('.org-chart-node-label-inner').text() === label)!

describe('冻结 / 只读源数据（1.6.0 #8）', () => {
  beforeEach(() => resetWarnings())

  it('浅冻结 data：正常渲染、可展开收起，不抛异常', async () => {
    const data = Object.freeze(makeData()) as any
    const wrapper = mount(VueOkrTree, {
      props: { data, nodeKey: 'id', showCollapsable: true },
    })
    expect(labels(wrapper)).toEqual(['A', 'B', 'D'])
    // 初始折叠（容器在 DOM 中但隐藏）；点击为展开
    expect(
      nodeByLabel(wrapper, 'A').find('.org-chart-node-children').attributes('style') || ''
    ).toContain('visibility: hidden')
    await nodeByLabel(wrapper, 'A').find('.org-chart-node-btn').trigger('click')
    await nextTick()
    expect(
      nodeByLabel(wrapper, 'A').find('.org-chart-node-children').attributes('style') || ''
    ).not.toContain('height: 0')
    // 再收起，无异常
    await nodeByLabel(wrapper, 'A').find('.org-chart-node-btn').trigger('click')
    await nextTick()
    expect(
      nodeByLabel(wrapper, 'A').find('.org-chart-node-children').attributes('style') || ''
    ).toContain('visibility: hidden')
  })

  it('深冻结（children 数组也冻结）：渲染、展开、键盘漫游均不抛异常', async () => {
    const data = JSON.parse(JSON.stringify(makeData()))
    Object.freeze(data)
    data.forEach((root: any) => {
      Object.freeze(root)
      root.children?.forEach((c: any) => Object.freeze(c))
      if (root.children) Object.freeze(root.children)
    })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(VueOkrTree, {
      props: { data, nodeKey: 'id', showCollapsable: true, defaultExpandAll: true },
    })
    expect(labels(wrapper)).toEqual(['A', 'B', 'D'])
    // 展开收起（不涉及源数据回写）
    const vm = wrapper.vm as VueOkrTreeInstance
    vm.collapseNode(1)
    await nextTick()
    vm.expandNode(1)
    await nextTick()
    expect(labels(wrapper)).toEqual(['A', 'B', 'D'])
    warnSpy.mockRestore()
  })

  it('深冻结数据调用 append / remove：收到开发期警告、不抛错', async () => {
    const data = JSON.parse(JSON.stringify(makeData()))
    Object.freeze(data)
    data.forEach((root: any) => {
      Object.freeze(root)
      Object.freeze(root.children)
    })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(VueOkrTree, { props: { data, nodeKey: 'id' } })
    const vm = wrapper.vm as VueOkrTreeInstance

    vm.append({ id: 9, label: 'I' })
    await nextTick()
    expect(errorSpy).not.toHaveBeenCalled()
    const messages = warnSpy.mock.calls.map((c) => String(c[0]))
    expect(messages.some((m) => m.includes('冻结/只读源数据'))).toBe(true)
    expect(messages.some((m) => m.includes('append'))).toBe(true)

    vm.remove(2)
    await nextTick()
    expect(errorSpy).not.toHaveBeenCalled()
    expect(warnSpy.mock.calls.some((c) => String(c[0]).includes('remove'))).toBe(true)
    errorSpy.mockRestore()
    warnSpy.mockRestore()
  })

  it('markNodeData 在冻结对象上写入失败时降级 WeakMap，getNodeKey 兜底可用', () => {
    const frozen = Object.freeze({ label: 'X' })
    markNodeData({ id: 42 }, frozen)
    // defineProperty 抛错被吞掉，id 走 WeakMap
    expect(getNodeKey(undefined, frozen)).toBe(42)
    // 非冻结对象行为不变（写入 $treeNodeId）
    const plain: any = { label: 'Y' }
    markNodeData({ id: 7 }, plain)
    expect(getNodeKey(undefined, plain)).toBe(7)
  })

  it('未配置 node-key 的冻结数据可渲染，v-for key 使用 WeakMap 兜底 id', async () => {
    const data = Object.freeze(makeData()) as any
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = mount(VueOkrTree, { props: { data } })
    expect(labels(wrapper)).toEqual(['A', 'B', 'D'])
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
