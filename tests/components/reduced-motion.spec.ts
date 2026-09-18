import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { VueOkrTree } from '../../src/lib'

/**
 * prefers-reduced-motion（roadmap 13 其他小项）：系统要求减少动效时，
 * 组件把 animate 视为关闭（状态类与 <transition> 的 css 都撤掉，状态直切），
 * 配套的 CSS 媒体查询在 style.css / transition.css 里。
 */

const data = [{ id: 1, label: 'R', children: [{ id: 2, label: 'C' }] }]

type MqlListener = (event: { matches: boolean }) => void
let mqlMatches = false
// 组件内的 matchMedia 监听是模块级单例，只会在首次 setup 时注册一次，所以数组跨用例保留
const mqlListeners: MqlListener[] = []

function stubMatchMedia() {
  mqlMatches = false
  vi.stubGlobal('matchMedia', (query: string) => ({
    media: query,
    get matches() {
      return mqlMatches
    },
    onchange: null,
    addEventListener: (_: string, cb: MqlListener) => mqlListeners.push(cb),
    removeEventListener: () => {},
    addListener: (cb: MqlListener) => mqlListeners.push(cb),
    removeListener: () => {},
    dispatchEvent: () => true,
  }))
}

function setReducedMotion(matches: boolean) {
  mqlMatches = matches
  mqlListeners.forEach((cb) => cb({ matches }))
}

const mountTree = () =>
  mount(VueOkrTree, {
    props: { data, nodeKey: 'id', showCollapsable: true, animate: true, defaultExpandAll: true },
    global: { stubs: { transition: false } },
  })

// 顶层的 role=tree 容器同样带 .org-chart-node-children，状态类只打在节点自己的子容器上
const childrenClasses = (wrapper: VueWrapper) =>
  wrapper.find('.org-chart-node .org-chart-node-children').classes()

describe('prefers-reduced-motion', () => {
  beforeEach(() => stubMatchMedia())
  afterEach(() => vi.unstubAllGlobals())

  it('默认（不要求减少动效）时 animate 状态类正常生效', () => {
    const wrapper = mountTree()
    expect(childrenClasses(wrapper)).toContain('is-animated')
    expect(childrenClasses(wrapper).some((c) => c.startsWith('okr-anim-'))).toBe(true)
  })

  it('系统要求减少动效时按 animate 关闭处理，状态类撤掉', async () => {
    const wrapper = mountTree()
    expect(childrenClasses(wrapper)).toContain('is-animated')

    setReducedMotion(true)
    await nextTick()
    expect(childrenClasses(wrapper)).not.toContain('is-animated')
    expect(childrenClasses(wrapper).some((c) => c.startsWith('okr-anim-'))).toBe(false)

    // 用户改回系统设置后动画恢复
    setReducedMotion(false)
    await nextTick()
    expect(childrenClasses(wrapper)).toContain('is-animated')
  })

  it('两份样式里都保留了 reduced-motion 媒体查询（防止误删）', () => {
    for (const file of ['src/lib/okr-tree/style.css', 'src/lib/okr-tree/model/transition.css']) {
      expect(readFileSync(file, 'utf8')).toContain('@media (prefers-reduced-motion: reduce)')
    }
  })
})
