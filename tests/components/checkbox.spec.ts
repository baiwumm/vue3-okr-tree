import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
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

/** 节点自身的标签元素：必须用 :scope 限定直接子代——find 会下降到整个子树，
 *  OKR 模式根节点的左子树容器在模板序上先于自身标签，子树查找会命中后代节点的标签 */
const ownLabel = (n: any) =>
  n.find(':scope > .org-chart-node-label > .org-chart-node-label-inner').text()

const nodeByLabel = (w: any, label: string) =>
  w.findAll('.org-chart-node').find((n: any) => ownLabel(n) === label)

/** 点击某个节点的复选框（.stop 修饰符不会触发节点选中 / node-click） */
const clickCheckbox = async (w: any, label: string) => {
  await nodeByLabel(w, label).find('.org-chart-node-checkbox').trigger('click')
}

describe('show-checkbox 渲染', () => {
  it('默认不渲染复选框；开启后每个节点带一个，treeitem 输出 aria-checked', () => {
    const plain = mount(VueOkrTree, { props: { data: makeData() } })
    expect(plain.find('.org-chart-node-checkbox').exists()).toBe(false)

    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), showCheckbox: true, nodeKey: 'id' },
    })
    expect(wrapper.findAll('.org-chart-node-checkbox').length).toBe(
      wrapper.findAll('.org-chart-node').length
    )
    expect(nodeByLabel(wrapper, 'Root').attributes('aria-checked')).toBe('false')
    // aria-checked 为 mixed 需先产生半选，见联动用例
  })

  it('运行时切换 show-checkbox：隐藏后重新开启，勾选状态保留', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), showCheckbox: true, nodeKey: 'id' },
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    await clickCheckbox(wrapper, 'A1')
    expect(vm.isChecked(111)).toBe(true)

    await wrapper.setProps({ showCheckbox: false })
    expect(wrapper.find('.org-chart-node-checkbox').exists()).toBe(false)
    expect(vm.isChecked(111)).toBe(true)

    await wrapper.setProps({ showCheckbox: true })
    expect(nodeByLabel(wrapper, 'A1').find('.org-chart-node-checkbox').classes()).toContain(
      'is-checked'
    )
  })
})

describe('父子联动与半选传播', () => {
  it('勾选子节点：兄弟未选时父节点半选，全选后父节点选中', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), showCheckbox: true, nodeKey: 'id' },
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    await clickCheckbox(wrapper, 'A1')
    expect(vm.getNode(111)!.checked).toBe(true)
    expect(vm.getNode(11)!.checked).toBe(false)
    expect(vm.getNode(11)!.indeterminate).toBe(true)
    expect(vm.getNode(1)!.indeterminate).toBe(true)

    await clickCheckbox(wrapper, 'A2')
    expect(vm.getNode(11)!.checked).toBe(true)
    expect(vm.getNode(11)!.indeterminate).toBe(false)
    // Root 下 A 全选但 B、C 未选 → 仍半选
    expect(vm.getNode(1)!.checked).toBe(false)
    expect(vm.getNode(1)!.indeterminate).toBe(true)
  })

  it('勾选父节点：向下联动全部后代；取消勾选整体回退', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), showCheckbox: true, nodeKey: 'id' },
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    await clickCheckbox(wrapper, 'A')
    expect(vm.getNode(111)!.checked).toBe(true)
    expect(vm.getNode(112)!.checked).toBe(true)
    expect(vm.getNode(11)!.checked).toBe(true)

    await clickCheckbox(wrapper, 'A')
    expect(vm.getNode(111)!.checked).toBe(false)
    expect(vm.getNode(11)!.checked).toBe(false)

    await clickCheckbox(wrapper, 'Root')
    expect(vm.isChecked(13)).toBe(true)
    expect(vm.getCheckedKeys()).toEqual([1, 11, 111, 112, 12, 121, 13])
  })

  it('check-strictly：勾选只作用于自身，无联动无半选', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), showCheckbox: true, checkStrictly: true, nodeKey: 'id' },
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    await clickCheckbox(wrapper, 'A')
    expect(vm.getNode(11)!.checked).toBe(true)
    expect(vm.getNode(111)!.checked).toBe(false)
    expect(vm.getNode(11)!.indeterminate).toBe(false)
    expect(vm.getNode(1)!.indeterminate).toBe(false)
  })

  it('disabled 节点：自身不可点击勾选，但被父节点联动覆盖（与 el-tree 一致）', async () => {
    const data = () => [
      {
        id: 1,
        label: 'Root',
        children: [
          { id: 14, label: 'D', disabled: true },
          { id: 15, label: 'E' },
        ],
      },
    ]
    const wrapper = mount(VueOkrTree, {
      props: { data: data(), showCheckbox: true, nodeKey: 'id' },
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    await clickCheckbox(wrapper, 'D')
    expect(vm.isChecked(14)).toBe(false)

    await clickCheckbox(wrapper, 'Root')
    expect(vm.isChecked(14)).toBe(true)
    // 父节点点击后整体全选，Root 为选中而非半选
    expect(vm.getNode(1)!.indeterminate).toBe(false)
  })
})

describe('default-checked-keys 与方法', () => {
  it('default-checked-keys：初始勾选并推导祖先半选；需 node-key', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const withoutKey = mount(VueOkrTree, {
      props: { data: makeData(), showCheckbox: true, defaultCheckedKeys: [111] },
    })
    expect(withoutKey.find('.org-chart-node-checkbox.is-checked').exists()).toBe(false)
    expect(warnSpy).toHaveBeenCalled()

    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        showCheckbox: true,
        defaultCheckedKeys: [111, 121],
        nodeKey: 'id',
      },
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    expect(vm.getNode(111)!.checked).toBe(true)
    expect(vm.getNode(11)!.indeterminate).toBe(true)
    // B 只有唯一子节点 B1，B1 被勾选 → B 全选（el-tree 语义：全部子节点选中 ⇒ 父选中）
    expect(vm.getCheckedKeys()).toEqual([111, 12, 121])
    expect(vm.getHalfCheckedKeys()).toEqual([1, 11])
    warnSpy.mockRestore()
  })

  it('setCheckedKeys：先清空再按列表勾选（带联动），leafOnly 只计叶子', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), showCheckbox: true, nodeKey: 'id' },
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    await clickCheckbox(wrapper, 'A1') // 先制造一点状态

    vm.setCheckedKeys([12])
    expect(vm.isChecked(12)).toBe(true)
    expect(vm.isChecked(121)).toBe(true)
    expect(vm.getCheckedKeys()).toEqual([12, 121])
    expect(vm.getHalfCheckedKeys()).toEqual([1])
    expect(vm.isChecked(111)).toBe(false)

    vm.setCheckedKeys([1])
    // 全树勾选后 leafOnly 只返回叶子
    expect(vm.getCheckedKeys(true)).toEqual([111, 112, 121, 13])
  })

  it('default-checked-keys 运行时变更：以新列表为准（先清空再应用）', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), showCheckbox: true, defaultCheckedKeys: [111], nodeKey: 'id' },
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    expect(vm.isChecked(111)).toBe(true)
    await wrapper.setProps({ defaultCheckedKeys: [13] })
    expect(vm.isChecked(111)).toBe(false)
    expect(vm.isChecked(13)).toBe(true)
    expect(vm.getCheckedKeys()).toEqual([13])
  })

  it('default-checked-keys 换引用不换内容：不把用户改过的勾选整片抹回去', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), showCheckbox: true, defaultCheckedKeys: [111], nodeKey: 'id' },
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    vm.getNode(13)!.setChecked(true)
    expect(vm.getCheckedKeys()).toEqual([111, 13])

    // 宿主每次渲染新建一个等值数组（计算属性、派生表达式都会这样）：内容没变就不该重放默认勾选
    await wrapper.setProps({ defaultCheckedKeys: [111] })
    expect(vm.isChecked(13)).toBe(true)
    expect(vm.isChecked(111)).toBe(true)

    // 内容真的变了才重放：先清空，再按新列表勾选
    await wrapper.setProps({ defaultCheckedKeys: [12] })
    expect(vm.isChecked(13)).toBe(false)
    expect(vm.getCheckedKeys()).toEqual([12, 121])
  })
})

describe('check / check-change 事件', () => {
  it('点击复选框触发 check（含全量勾选信息），不触发 node-click', async () => {
    const onCheck = vi.fn()
    const onNodeClick = vi.fn()
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        showCheckbox: true,
        nodeKey: 'id',
        onCheck,
        onNodeClick,
      },
    })
    await clickCheckbox(wrapper, 'A1')
    expect(onCheck).toHaveBeenCalledTimes(1)
    const info = onCheck.mock.calls[0][1]
    expect(info.checkedKeys).toEqual([111])
    expect(info.halfCheckedKeys).toEqual([1, 11])
    expect(info.checkedNodes.map((d: any) => d.id)).toEqual([111])
    expect(info.halfCheckedNodes.map((n: any) => n.key)).toEqual([1, 11])
    expect(onNodeClick).not.toHaveBeenCalled()
  })

  it('check-change：每个受影响节点各触发一次，联动与级联都覆盖', async () => {
    const onCheckChange = vi.fn()
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        showCheckbox: true,
        nodeKey: 'id',
        onCheckChange,
      },
    })
    await clickCheckbox(wrapper, 'A')
    const changes = onCheckChange.mock.calls.map((c: any[]) => `${c[0].id}:${c[1]}:${c[2]}`)
    // A 勾选 → 自身 + 两个叶子变选中；Root 变半选；B / C 子树不受影响
    expect(changes).toContain('11:true:false')
    expect(changes).toContain('111:true:false')
    expect(changes).toContain('112:true:false')
    expect(changes).toContain('1:false:true')
    expect(changes.every((c: string) => !c.startsWith('12:') && !c.startsWith('13:'))).toBe(true)

    // 程序化 setCheckedKeys 只触发 check-change，不触发 check
    const onCheck = vi.fn()
    await wrapper.setProps({ onCheck })
    onCheckChange.mockClear()
    ;(wrapper.vm as VueOkrTreeInstance).setCheckedKeys([13])
    await nextTick()
    expect(onCheck).not.toHaveBeenCalled()
    expect(onCheckChange.mock.calls.some((c: any[]) => c[0].id === 13)).toBe(true)
  })

  it('空格键切换勾选（show-checkbox 开启时），Enter 仍是选中语义', async () => {
    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), showCheckbox: true, nodeKey: 'id' },
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    const nodeA = nodeByLabel(wrapper, 'A')
    ;(nodeA.element as HTMLElement).focus()
    await nodeA.trigger('keydown', { key: ' ' })
    expect(vm.isChecked(11)).toBe(true)

    await nodeA.trigger('keydown', { key: 'Enter' })
    expect(vm.getNode(11)!.isCurrent).toBe(true)
    expect(vm.isChecked(11)).toBe(true) // Enter 不改勾选
  })
})

describe('OKR 模式（onlyBothTree）', () => {
  it('勾选按左右两树独立维护；setCheckedKeys / getCheckedKeys 按 key 合并生效', async () => {
    const leftData = [
      {
        id: 1,
        label: 'Root',
        children: [{ id: 11, label: 'A', children: [{ id: 111, label: 'A1' }] }],
      },
    ]
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        leftData,
        onlyBothTree: true,
        direction: 'horizontal',
        showCheckbox: true,
        nodeKey: 'id',
      },
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    // 点击右树的 A1，只作用于右树（左树存在同标签节点，需按类过滤）
    const rightNodeByLabel = (label: string) =>
      wrapper
        .findAll('.org-chart-node')
        .filter((n: any) => !n.classes().includes('is-left-child-node'))
        .find((n: any) => ownLabel(n) === label)
    await rightNodeByLabel('A1')!.find('.org-chart-node-checkbox').trigger('click')
    expect(vm.isChecked(111)).toBe(true)
    expect((vm as any).store.leftNodesMap['111']?.checked ?? false).toBe(false)

    // 方法按 key 对左右两树同时生效
    vm.setCheckedKeys([11])
    expect(vm.isChecked(11)).toBe(true)
    expect((vm as any).store.leftNodesMap['11'].checked).toBe(true)
    // 联动：右树 A2 随 A 勾选；左树 A 的唯一子链全选 → 左根 1 全选
    expect(vm.isChecked(112)).toBe(true)
    expect((vm as any).store.leftNodesMap['1'].checked).toBe(true)
    // getCheckedKeys 左右合并去重：右 11/111/112 + 左 1（11/111 已去重）
    expect(vm.getCheckedKeys()).toEqual([11, 111, 112, 1])
  })
})
