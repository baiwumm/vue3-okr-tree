import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { VueOkrTree } from '../../src/lib'
import type { VueOkrTreeInstance } from '../../src/lib'

const fresh = () => [
  {
    id: 1,
    label: 'xxx科技有有限公司',
    children: [
      {
        id: 2,
        label: '产品研发部',
        children: [
          { id: 3, label: '研发-前端' },
          { id: 4, label: '研发-后端' },
          { id: 5, label: 'UI 设计' },
        ],
      },
      {
        id: 6,
        label: '销售部',
        children: [
          { id: 7, label: '销售一部' },
          { id: 8, label: '销售二部' },
        ],
      },
      { id: 9, label: '财务部' },
    ],
  },
]

const filterNode = (value: string, data: any) => (!value ? true : data.label.indexOf(value) !== -1)
const labels = (w: any) => w.findAll('.org-chart-node-label-inner').map((x: any) => x.text())

const mountDemo = (extraProps: Record<string, any> = {}) => {
  const Parent = defineComponent({
    setup() {
      const data = ref(fresh())
      const reset = () => {
        data.value = fresh()
      }
      return { data, reset }
    },
    render(ctx: any) {
      return h(VueOkrTree, {
        data: ctx.data,
        nodeKey: 'id',
        filterNodeMethod: filterNode,
        ref: 'tree',
        ...extraProps,
      })
    },
  })
  // 不 stub <transition>，走真实的 Transition 组件
  return mount(Parent, { global: { stubs: { transition: false } } })
}

describe('子容器 <transition> 在 rAF 被节流环境下的健壮性', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('animate 关闭时，Demo 13 完整序列后重置数据，旧子节点 DOM 被同步移除（不依赖 rAF）', async () => {
    // 模拟后台/隐藏标签页：requestAnimationFrame 永不回调
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0)

    const wrapper = mountDemo()
    const vm = wrapper.vm as any
    const t = vm.$refs.tree as VueOkrTreeInstance

    t.filter('销售')
    await nextTick()
    expect(labels(wrapper)).toEqual(['xxx科技有有限公司', '销售部', '销售一部', '销售二部'])
    t.filter('')
    await nextTick()
    expect(labels(wrapper)).toHaveLength(9)

    t.remove(t.getNode(2)!)
    t.append({ id: 10, label: '销售三部' }, t.getNode(6)!)
    t.insertBefore({ id: 11, label: '销售总部' }, t.getNode(6)!)
    t.updateKeyChildren(6, [
      {
        id: 7,
        label: '销售一部',
        children: [
          { id: 1117, label: '销售一部--子一' },
          { id: 1118, label: '销售一部--子二' },
        ],
      },
      { id: 8, label: '销售二部' },
      { id: 77, label: '销售三部' },
    ])
    await nextTick()
    expect(labels(wrapper)).toContain('销售一部--子一')
    expect(labels(wrapper)).not.toContain('产品研发部')

    vm.reset()
    await nextTick()
    await nextTick()
    expect(labels(wrapper)).toEqual([
      'xxx科技有有限公司',
      '产品研发部',
      '研发-前端',
      '研发-后端',
      'UI 设计',
      '销售部',
      '销售一部',
      '销售二部',
      '财务部',
    ])
    // 不应残留卡在 leave 状态的容器
    expect(wrapper.findAll('[class*="leave-active"]')).toHaveLength(0)
  })

  it('animate 开启时使用 CSS 过渡（name / duration 透传），关闭时 css:false', async () => {
    const on = mountDemo({ animate: true, animateName: 'okr-fade-in', animateDuration: 50 })
    const container = on.find('.org-chart-node > .org-chart-node-children')
    expect(container.classes()).toContain('is-animated')
    expect(container.classes()).toContain('okr-anim-okr-fade-in')
    expect(container.attributes('style')).toContain('--okr-anim-duration: 50ms')

    const off = mountDemo()
    const c2 = off.find('.org-chart-node > .org-chart-node-children')
    expect(c2.classes()).not.toContain('is-animated')
    expect(c2.attributes('style') ?? '').not.toContain('--okr-anim-duration')
  })
})
