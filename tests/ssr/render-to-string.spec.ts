// @vitest-environment node
/**
 * SSR 冒烟测试（roadmap 2.x #13 / #16）：组件 setup 与渲染阶段不访问 window / document，
 * 可在 Node 环境（无 DOM）下经 vue/server-renderer 完整输出 HTML。
 * 浏览器专属能力（matchMedia、ResizeObserver、scrollIntoView 等）均在
 * onMounted / 事件回调中且带 typeof 守卫，客户端激活阶段才执行。
 */
import { describe, it, expect } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { VueOkrTree, OkrTreeGroup, OkrTreeViewport } from '../../src/lib'

const makeData = () => [
  {
    id: 1,
    label: '总部',
    children: [
      { id: 11, label: '研发部', children: [{ id: 111, label: '前端组' }] },
      { id: 12, label: '市场部' },
    ],
  },
]

const makeLeftData = () => [{ id: 1, label: '总部', children: [{ id: 21, label: '行政部' }] }]

function render(component: any, props: Record<string, any> = {}, slots: Record<string, any> = {}) {
  const app = createSSRApp({ render: () => h(component, props, slots) })
  return renderToString(app)
}

describe('SSR renderToString 冒烟', () => {
  it('VueOkrTree 基础渲染：输出节点标签与 tree 语义结构', async () => {
    const html = await render(VueOkrTree, { data: makeData() })
    expect(html).toContain('总部')
    expect(html).toContain('研发部')
    expect(html).toContain('前端组')
    expect(html).toContain('role="tree"')
    expect(html).not.toContain('undefined')
  })

  it('OKR 模式（onlyBothTree + leftData）：左右两树均输出', async () => {
    const html = await render(VueOkrTree, {
      data: makeData(),
      leftData: makeLeftData(),
      onlyBothTree: true,
      direction: 'horizontal',
      nodeKey: 'id',
    })
    expect(html).toContain('行政部')
    expect(html).toContain('研发部')
  })

  it('受控展开态与交互 props 组合不抛错', async () => {
    const html = await render(VueOkrTree, {
      data: makeData(),
      nodeKey: 'id',
      showCollapsable: true,
      accordion: true,
      expandOnClickNode: true,
      defaultExpandAll: false,
      expandedKeys: [1],
      currentKey: 11,
    })
    expect(html).toContain('市场部')
  })

  it('#default 插槽与 #empty 插槽', async () => {
    const withSlot = await render(
      VueOkrTree,
      { data: makeData() },
      {
        default: ({ data }: any) => h('span', { class: 'x' }, `自定义-${data.label}`),
      }
    )
    expect(withSlot).toContain('自定义-总部')

    const empty = await render(
      VueOkrTree,
      { data: [] },
      {
        empty: () => h('span', '暂无数据'),
      }
    )
    expect(empty).toContain('暂无数据')
  })

  it('OkrTreeGroup 包裹渲染', async () => {
    const html = await render(
      OkrTreeGroup,
      {},
      { default: () => h(VueOkrTree, { data: makeData() }) }
    )
    expect(html).toContain('总部')
  })

  it('OkrTreeViewport 包裹渲染', async () => {
    const html = await render(
      OkrTreeViewport,
      {},
      { default: () => h(VueOkrTree, { data: makeData() }) }
    )
    expect(html).toContain('总部')
    expect(html).toContain('okr-viewport')
  })
})
