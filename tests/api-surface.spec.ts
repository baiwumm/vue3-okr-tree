import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { VueOkrTree } from '../src/lib'
import { methodsSection } from '../shared/api'

/**
 * API 表与实现之间的防漂移测试，与 react-okr-tree 的 `tests/api-surface.spec.tsx` 同构。
 *
 * `shared/api.ts` 是 README（`pnpm gen:readme`）、文档站 `<ApiTable>` 与 playground API 页的
 * 单一来源；表格漏一行，用户就在三处文档里同时查不到这个方法而 CI 不会报错——
 * 建表时 `getNodeKey` 正是这样静默缺失的（defineExpose 有它，表里没有）。
 *
 * 只比对 ref 方法面：props / 事件在运行时不是可枚举的，那两节靠渲染同一份数据保证口径。
 */
const exposedOf = (vm: unknown) => (vm as any).$.exposed as Record<string, unknown>

const mountTree = () =>
  mount(VueOkrTree, { props: { data: [{ id: 1, label: 'R' }], nodeKey: 'id' } })

describe('shared/api.ts 与 defineExpose 一致', () => {
  const documented = new Set<string>()
  for (const row of methodsSection.rows) {
    // 「store / root」是合并单元格，按分隔符拆开
    for (const name of row[0].split(' / ')) documented.add(name.trim())
  }

  it('表里的每个方法都能在 ref 上拿到', () => {
    const inst = exposedOf(mountTree().vm)
    expect([...documented].filter((name) => inst[name] === undefined)).toEqual([])
  })

  it('ref 上的每个成员都写进了表（不允许出现未记录的公开方法）', () => {
    const inst = exposedOf(mountTree().vm)
    expect(Object.keys(inst).filter((name) => !documented.has(name))).toEqual([])
  })

  it('方法面数量与表格行数一致', () => {
    const inst = exposedOf(mountTree().vm)
    // 28 行里「store / root」一行覆盖 2 个成员，故成员数比行数多 1
    expect(methodsSection.rows.length).toBe(28)
    expect(Object.keys(inst).length).toBe(documented.size)
  })
})
