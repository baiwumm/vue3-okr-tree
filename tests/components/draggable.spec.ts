import { describe, it, expect, vi } from 'vitest'
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

const ownLabel = (n: any) =>
  n.find(':scope > .org-chart-node-label > .org-chart-node-label-inner').text()

const nodeByLabel = (w: any, label: string) =>
  w.findAll('.org-chart-node').find((n: any) => ownLabel(n) === label)

/** 模拟 getBoundingClientRect（分区处理器读的是 label 的 currentTarget），返回触发坐标 */
const mockRect = (w: any, label: string) => {
  const el = nodeByLabel(w, label).find('.org-chart-node-label').element as HTMLElement
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
const horizontalOffset = (offset: number) => ({ clientY: offset, clientX: offset })

/** 完整拖放流程：dragstart(from) → dragover(to, offset) → drop(to) */
const dragDrop = async (w: any, from: string, to: string, offset: number) => {
  await nodeByLabel(w, from).find('.org-chart-node-label-inner').trigger('dragstart')
  mockRect(w, to)
  await nodeByLabel(w, to)
    .find('.org-chart-node-label')
    .trigger('dragover', horizontalOffset(offset))
  await nodeByLabel(w, to).find('.org-chart-node-label').trigger('drop')
  await nodeByLabel(w, from).find('.org-chart-node-label-inner').trigger('dragend')
}

/** 源数据辅助：从 data 数组里摘出某个 id 的对象引用 */
const findData = (list: any[], id: number): any =>
  list.reduce<any>((found, item) => {
    if (found) return found
    if (item.id === id) return item
    return findData(item.children || [], id)
  }, null)

describe('draggable 基础', () => {
  it('默认不可拖；开启后卡片 draggable，disabled 节点不可拖', () => {
    const plain = mount(VueOkrTree, { props: { data: makeData() } })
    expect(plain.find('.org-chart-node-label-inner').attributes('draggable')).toBe('false')

    const wrapper = mount(VueOkrTree, {
      props: { data: makeData(), draggable: true, nodeKey: 'id' },
    })
    expect(
      nodeByLabel(wrapper, 'A').find('.org-chart-node-label-inner').attributes('draggable')
    ).toBe('true')

    const withDisabled = mount(VueOkrTree, {
      props: {
        data: [{ id: 1, label: 'R', children: [{ id: 2, label: 'D', disabled: true }] }],
        draggable: true,
        nodeKey: 'id',
      },
    })
    expect(
      nodeByLabel(withDisabled, 'D').find('.org-chart-node-label-inner').attributes('draggable')
    ).toBe('false')
  })

  it('dragstart / dragend 事件', async () => {
    const onDragStart = vi.fn()
    const onDragEnd = vi.fn()
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        draggable: true,
        nodeKey: 'id',
        onNodeDragStart: onDragStart,
        onNodeDragEnd: onDragEnd,
      },
    })
    await nodeByLabel(wrapper, 'A').find('.org-chart-node-label-inner').trigger('dragstart')
    expect(onDragStart).toHaveBeenCalledTimes(1)
    expect(onDragStart.mock.calls[0][0].key).toBe(11)
    await nodeByLabel(wrapper, 'A').find('.org-chart-node-label-inner').trigger('dragend')
    expect(onDragEnd).toHaveBeenCalledTimes(1)
  })

  it('成功放置后 node-drag-end 报出真实落点（不是 null 载荷）', async () => {
    const onDragEnd = vi.fn()
    const onDrop = vi.fn()
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        draggable: true,
        nodeKey: 'id',
        onNodeDrop: onDrop,
        onNodeDragEnd: onDragEnd,
      },
    })
    // B 拖进 A 的 inner 区：drop 先派发，dragend 紧随其后
    await dragDrop(wrapper, 'B', 'A', 50)
    expect(onDrop).toHaveBeenCalledTimes(1)
    expect(onDragEnd).toHaveBeenCalledTimes(1)
    // 旧实现这里两个参数恒为 null——handleDrop 在 dragend 之前就把 dragOver 清了，
    // 于是宿主侧每次成功拖动只能记一句「未完成放置」，第六个事件的载荷等于没有
    const [dragged, dropNode, dropType] = onDragEnd.mock.calls[0]
    expect(dragged.key).toBe(12)
    expect(dropNode.key).toBe(11)
    expect(dropType).toBe('inner')
  })

  it('连续两次放置：每次都收到一对 drop / drag-end（手势状态不泄漏到下一轮）', async () => {
    const onDragEnd = vi.fn()
    const onDrop = vi.fn()
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        draggable: true,
        nodeKey: 'id',
        onNodeDrop: onDrop,
        onNodeDragEnd: onDragEnd,
      },
    })
    await dragDrop(wrapper, 'B', 'A', 50)
    await dragDrop(wrapper, 'C', 'A', 50)
    expect(onDrop).toHaveBeenCalledTimes(2)
    expect(onDragEnd).toHaveBeenCalledTimes(2)
    expect(onDragEnd.mock.calls.map((c: any[]) => [c[0].key, c[1]?.key, c[2]])).toEqual([
      [12, 11, 'inner'],
      [13, 11, 'inner'],
    ])
  })

  it('被 allow-drop 拒掉的放置：node-drag-end 仍然报 null', async () => {
    const onDragEnd = vi.fn()
    const onDrop = vi.fn()
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        draggable: true,
        nodeKey: 'id',
        allowDrop: () => false,
        onNodeDrop: onDrop,
        onNodeDragEnd: onDragEnd,
      },
    })
    await dragDrop(wrapper, 'B', 'A', 50)
    expect(onDrop).not.toHaveBeenCalled()
    expect(onDragEnd).toHaveBeenCalledTimes(1)
    expect(onDragEnd.mock.calls[0][1]).toBeNull()
    expect(onDragEnd.mock.calls[0][2]).toBeNull()
  })

  it('allow-drag 返回 false：不可拖拽且不触发 node-drag-start', async () => {
    const onDragStart = vi.fn()
    const wrapper = mount(VueOkrTree, {
      props: {
        data: makeData(),
        draggable: true,
        nodeKey: 'id',
        allowDrag: (node: any) => node.key !== 11,
        onNodeDragStart: onDragStart,
      },
    })
    expect(
      nodeByLabel(wrapper, 'A').find('.org-chart-node-label-inner').attributes('draggable')
    ).toBe('false')
    await nodeByLabel(wrapper, 'A').find('.org-chart-node-label-inner').trigger('dragstart')
    expect(onDragStart).not.toHaveBeenCalled()
  })
})

describe('放置分区与数据同步（水平模式按 Y 轴）', () => {
  it('prev：拖到目标同级之前，源数据同步', async () => {
    const data = makeData()
    const onDrop = vi.fn()
    const wrapper = mount(VueOkrTree, {
      props: { data, draggable: true, nodeKey: 'id', onNodeDrop: onDrop },
    })
    await dragDrop(wrapper, 'B', 'A', 10) // B 拖到 A 上方 25% → prev
    // 视图：B 成为 A 的前置兄弟
    const vm = wrapper.vm as VueOkrTreeInstance
    expect(vm.getNode(12)!.parent!.key).toBe(1)
    const siblingIds = data[0].children.map((c: any) => c.id)
    expect(siblingIds).toEqual([12, 11, 13])
    // 事件
    expect(onDrop).toHaveBeenCalledTimes(1)
    const [dragged, dropped, type] = onDrop.mock.calls[0]
    expect(dragged.key).toBe(12)
    expect(dropped.key).toBe(11)
    expect(type).toBe('prev')
  })

  it('next：拖到目标同级之后', async () => {
    const data = makeData()
    const wrapper = mount(VueOkrTree, {
      props: { data, draggable: true, nodeKey: 'id' },
    })
    await dragDrop(wrapper, 'C', 'A', 90) // A 下方 75% → next
    expect(data[0].children.map((c: any) => c.id)).toEqual([11, 13, 12])
  })

  it('inner：成为目标子节点，目标自动展开并回写受控 expanded-keys', async () => {
    const data = makeData()
    const onExpandedKeys = vi.fn()
    const wrapper = mount(VueOkrTree, {
      props: {
        data,
        draggable: true,
        nodeKey: 'id',
        expandedKeys: [1],
        'onUpdate:expandedKeys': onExpandedKeys,
      },
    })
    await dragDrop(wrapper, 'C', 'A', 50) // 中间 → inner
    const vm = wrapper.vm as VueOkrTreeInstance
    expect(vm.getNode(13)!.parent!.key).toBe(11)
    expect(findData(data, 11).children.map((c: any) => c.id)).toEqual([111, 112, 13])
    // v-model 回写契约：emit 的新列表包含被自动展开的目标 11；
    // 真实 v-model 下父组件回写后 setExpandedKeys 会保持展开态
    // （测试内静态 prop 不回写，data deep watch 会按旧值 [1] 重设，属受控模式的既定语义）
    const calls = onExpandedKeys.mock.calls
    const emittedKeys = calls[calls.length - 1][0] as number[]
    expect(emittedKeys).toContain(11)
    expect(emittedKeys).toContain(1)
  })

  it('硬性禁止：不可放到自身或自己的子树内', async () => {
    const data = makeData()
    const onDrop = vi.fn()
    const wrapper = mount(VueOkrTree, {
      props: { data, draggable: true, nodeKey: 'id', onNodeDrop: onDrop },
    })
    await dragDrop(wrapper, 'A', 'A1', 50) // A 拖进自己的子节点
    expect(findData(data, 111).children).toBeUndefined()
    expect(onDrop).not.toHaveBeenCalled()
    // 树结构未被破坏
    const vm = wrapper.vm as VueOkrTreeInstance
    expect(vm.getNode(11)!.parent!.key).toBe(1)
  })

  it('allow-drop 返回 false：对应放置位置被禁止，其他位置可用', async () => {
    const data = makeData()
    const wrapper = mount(VueOkrTree, {
      props: {
        data,
        draggable: true,
        nodeKey: 'id',
        allowDrop: (_d: any, _t: any, type: string) => type !== 'inner',
      },
    })
    await dragDrop(wrapper, 'C', 'A', 50) // inner 被禁止
    expect(findData(data, 11).children.map((c: any) => c.id)).toEqual([111, 112])
    await dragDrop(wrapper, 'C', 'A', 90) // next 仍可用
    expect(data[0].children.map((c: any) => c.id)).toEqual([11, 13, 12])
  })
})

describe('moveNode 方法与层级修正', () => {
  it('ref.moveNode 编程式移动，层级随新位置修正', async () => {
    const data = makeData()
    const wrapper = mount(VueOkrTree, { props: { data, draggable: true, nodeKey: 'id' } })
    const vm = wrapper.vm as VueOkrTreeInstance
    expect(vm.moveNode(111, 12, 'inner')).toBe(true)
    expect(vm.getNode(111)!.parent!.key).toBe(12)
    expect(vm.getNode(111)!.level).toBe(3)
    expect(vm.getNode(1)!.level).toBe(1)
    expect(findData(data, 12).children.map((c: any) => c.id)).toEqual([121, 111])
    // 硬性禁止：移动到自身子树
    expect(vm.moveNode(12, 111, 'inner')).toBe(false)
  })
})

describe('OKR 模式跨左右树', () => {
  const okrMount = (props: Record<string, any> = {}) => {
    const rightData = [
      {
        id: 1,
        label: 'R',
        children: [{ id: 11, label: 'RA', children: [{ id: 111, label: 'RA1' }] }],
      },
    ]
    const leftData = [
      {
        id: 2,
        label: 'L',
        children: [{ id: 21, label: 'LA', children: [{ id: 211, label: 'LA1' }] }],
      },
    ]
    return {
      rightData,
      leftData,
      wrapper: mount(VueOkrTree, {
        props: {
          data: rightData,
          leftData,
          onlyBothTree: true,
          direction: 'horizontal',
          draggable: true,
          nodeKey: 'id',
          ...props,
        },
      }),
    }
  }

  const rightOrLeft = (w: any, label: string, left: boolean) =>
    w
      .findAll('.org-chart-node')
      .filter((n: any) => n.classes().includes('is-left-child-node') === left)
      .find((n: any) => ownLabel(n) === label)

  it('默认禁止跨左右树拖动', async () => {
    const { wrapper, rightData, leftData } = okrMount()
    // 从左树发起拖拽
    await rightOrLeft(wrapper, 'LA', true)!.find('.org-chart-node-label-inner').trigger('dragstart')
    mockRect(wrapper, 'RA')
    await rightOrLeft(wrapper, 'RA', false)!
      .find('.org-chart-node-label')
      .trigger('dragover', horizontalOffset(50))
    expect(wrapper.find('.drop-inner').exists()).toBe(false)
    await rightOrLeft(wrapper, 'RA', false)!.find('.org-chart-node-label').trigger('drop')
    expect(findData(rightData, 11).children.map((c: any) => c.id)).toEqual([111])
    expect(findData(leftData, 2).children.map((c: any) => c.id)).toEqual([21])
  })

  it('allow-drop 返回 true 放开跨树，注册表与 isLeftChild 随之迁移', async () => {
    const { wrapper, rightData, leftData } = okrMount({
      allowDrop: () => true,
    })
    const vm = wrapper.vm as VueOkrTreeInstance
    // 左树 LA1 拖到右树 RA1（inner）
    await rightOrLeft(wrapper, 'LA1', true)!
      .find('.org-chart-node-label-inner')
      .trigger('dragstart')
    mockRect(wrapper, 'RA1')
    await rightOrLeft(wrapper, 'RA1', false)!
      .find('.org-chart-node-label')
      .trigger('dragover', horizontalOffset(50))
    expect(wrapper.find('.drop-inner').exists()).toBe(true)
    await rightOrLeft(wrapper, 'RA1', false)!.find('.org-chart-node-label').trigger('drop')
    // 源数据：leftData 失去 211，rightData 的 111 得到 211
    expect(findData(leftData, 21).children).toEqual([])
    expect(findData(rightData, 111).children.map((c: any) => c.id)).toEqual([211])
    // 注册表：211 迁到右树注册表，isLeftChild 翻转，层级修正
    expect(vm.getNode(211)!.isLeftChild).toBe(false)
    expect(vm.getNode(211)!.parent!.key).toBe(111)
    expect(vm.getNode(211)!.level).toBe(4)
    expect((vm as any).store.nodesMap['211']).toBeTruthy()
    expect((vm as any).store.leftNodesMap['211']).toBeUndefined()
  })
})
