import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { VueOkrTree } from '../../src/lib'
import { resetWarnings } from '../../src/lib/okr-tree/model/util'

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

  it('unstyled 切换 okr-unstyled 类（卡片外观的中和由样式表负责）', () => {
    const plain = mount(VueOkrTree, { props: { data } })
    expect(plain.find('.org-chart-container').classes()).not.toContain('okr-unstyled')
    const bare = mount(VueOkrTree, { props: { data, unstyled: true } })
    expect(bare.find('.org-chart-container').classes()).toContain('okr-unstyled')
  })

  it('节点带 data-level 属性（colorful 主题按层级着色用）', () => {
    const wrapper = mount(VueOkrTree, { props: { data } })
    const nodes = wrapper.findAll('.org-chart-node')
    const root = nodes.find((n) => n.find('.org-chart-node-label-inner').text() === 'R')!
    const child = nodes.find((n) => n.find('.org-chart-node-label-inner').text() === 'C')!
    expect(root.attributes('data-level')).toBe('1')
    expect(child.attributes('data-level')).toBe('2')
  })

  describe('未知 theme 值的开发期警告', () => {
    beforeEach(() => resetWarnings())

    it('不在内置清单里的 theme 值提示需自行编写变量', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mount(VueOkrTree, { props: { data, theme: 'my-brand' } })
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('theme="my-brand" 不是内置主题'))
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('.okr-theme-my-brand'))
      // 前缀是用户排查警告来源的唯一线索，改掉了没人会发现，所以单独钉一条
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('[vue3-okr-tree]'))
      spy.mockRestore()
    })

    it('内置主题名不警告', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      for (const theme of ['default', 'feishu', 'dark', 'auto', 'minimal', 'colorful']) {
        mount(VueOkrTree, { props: { data, theme } })
      }
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })
  })
})
