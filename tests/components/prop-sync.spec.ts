import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { VueOkrTree, type VueOkrTreeInstance } from '../../src/lib'
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

describe('运行时 props 同步（1.6.0 #9）', () => {
  beforeEach(() => resetWarnings())

  it('showCollapsable 运行时切换：展开按钮即时显隐', async () => {
    const wrapper = mount(VueOkrTree, { props: { data: makeData() } })
    expect(wrapper.find('.org-chart-node-btn').exists()).toBe(false)
    await wrapper.setProps({ showCollapsable: true })
    expect(wrapper.find('.org-chart-node-btn').exists()).toBe(true)
    await wrapper.setProps({ showCollapsable: false })
    expect(wrapper.find('.org-chart-node-btn').exists()).toBe(false)
  })

  it('props 字段映射运行时变更：label 字段即时生效，children 字段变更触发重建', async () => {
    const data = [
      {
        id: 1,
        title: 'A-标题',
        name: 'A-名称',
        subs: [{ id: 2, title: 'B-标题' }],
      },
    ]
    const wrapper = mount(VueOkrTree, {
      props: { data, nodeKey: 'id', props: { label: 'title', children: 'children' } },
    })
    expect(labels(wrapper)).toEqual(['A-标题'])
    // label 字段映射变更（title → name），动态读取即时生效
    await wrapper.setProps({ props: { label: 'name', children: 'children' } })
    expect(labels(wrapper)).toEqual(['A-名称'])
    // children 字段映射变更（children → subs），触发重建
    await wrapper.setProps({ props: { label: 'title', children: 'subs' } })
    expect(labels(wrapper)).toEqual(['A-标题', 'B-标题'])
  })

  it('leftData 运行时变更：重建左树后按 expanded-keys / current-key 恢复左树状态', async () => {
    const leftV1 = [
      {
        id: 1,
        label: 'A',
        children: [{ id: 12, label: 'L1', children: [{ id: 13, label: 'L1C' }] }],
      },
    ]
    const leftV2 = [
      {
        id: 1,
        label: 'A',
        children: [{ id: 12, label: 'L1', children: [{ id: 13, label: 'L1C' }] }],
      },
    ]
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        leftData: leftV1,
        onlyBothTree: true,
        direction: 'horizontal',
        nodeKey: 'id',
        expandedKeys: [1, 12],
        currentKey: 13,
      },
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    // 初始：左树 L1 展开（受控 expandedKeys 含 12）、L1C 选中
    expect(vm.getNode(12)!.leftExpanded).toBe(true)
    expect(vm.getNode(13)!.isCurrent).toBe(true)

    // 替换 leftData → 左树重建 → 受控态恢复
    await wrapper.setProps({ leftData: leftV2 })
    expect(vm.getNode(12)!.leftExpanded).toBe(true)
    expect(vm.getNode(13)!.isCurrent).toBe(true)
  })
})

describe('创建期快照 prop 的运行时变更警告（1.6.0 #9）', () => {
  beforeEach(() => resetWarnings())

  it('nodeKey / direction / onlyBothTree 运行时变更加警告，配置不变时不警告', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), nodeKey: 'id', direction: 'vertical', onlyBothTree: false },
    })
    expect(warnSpy).not.toHaveBeenCalled()
    await wrapper.setProps({ nodeKey: 'uid' })
    await wrapper.setProps({ direction: 'horizontal' })
    await wrapper.setProps({ onlyBothTree: true })
    const messages = warnSpy.mock.calls.map((c) => String(c[0]))
    expect(messages.filter((m) => m.includes('nodeKey')).length).toBe(1)
    expect(messages.filter((m) => m.includes('direction')).length).toBe(1)
    expect(messages.filter((m) => m.includes('onlyBothTree')).length).toBe(1)
    expect(messages.every((m) => m.includes(':key'))).toBe(true)
    warnSpy.mockRestore()
  })
})
