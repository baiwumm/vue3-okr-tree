import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { VueOkrTree } from '../../src/lib'

const data = [
  {
    id: 1,
    label: 'R',
    children: [{ id: 2, label: 'C', children: [{ id: 3, label: 'G' }] }],
  },
]

describe('theme prop', () => {
  it('非 default 主题在根容器加 okr-theme-{name} 类', () => {
    const feishu = mount(VueOkrTree, { props: { data, theme: 'feishu' } })
    expect(feishu.find('.org-chart-container').classes()).toContain('okr-theme-feishu')
    const custom = mount(VueOkrTree, { props: { data, theme: 'my-brand' } })
    expect(custom.find('.org-chart-container').classes()).toContain('okr-theme-my-brand')
  })

  it('default 主题不加主题类（保持原版外观）', () => {
    const wrapper = mount(VueOkrTree, { props: { data } })
    const classes = wrapper.find('.org-chart-container').classes()
    expect(classes.some((c) => c.startsWith('okr-theme-'))).toBe(false)
  })

  it('节点带 data-level 属性（colorful 主题按层级着色用）', () => {
    const wrapper = mount(VueOkrTree, { props: { data } })
    const nodes = wrapper.findAll('.org-chart-node')
    const root = nodes.find((n) => n.find('.org-chart-node-label-inner').text() === 'R')!
    const child = nodes.find((n) => n.find('.org-chart-node-label-inner').text() === 'C')!
    expect(root.attributes('data-level')).toBe('1')
    expect(child.attributes('data-level')).toBe('2')
  })
})
