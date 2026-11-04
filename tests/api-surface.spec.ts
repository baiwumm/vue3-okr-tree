import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { VueOkrTree, OkrTreeViewport } from '../src/lib'
import {
  methodsSection,
  attributesSection,
  eventsSection,
  slotsSection,
  viewportSection,
} from '../shared/api'

/**
 * API 表与实现之间的防漂移测试，与 react-okr-tree 的 `tests/api-surface.spec.tsx` 同构。
 *
 * `shared/api.ts` 是 README（`pnpm gen:readme`）、文档站 `<ApiTable>` 与 playground API 页的
 * 单一来源；表格漏一行，用户就在三处文档里同时查不到而 CI 不会报错——
 * 建表时 `getNodeKey` 正是这样静默缺失的（defineExpose 有它，表里没有），
 * 1.16.0 的 `OkrTreeViewport` 整张表与 `#toolbar` 插槽也曾同样缺席。
 *
 * 覆盖四面：props（运行时 `.props` 可枚举）、events（编译产物 `.emits` 可枚举）、
 * slots（`<script setup>` 的 `defineSlots` 类型在编译后消失，只能读 SFC 源码）、
 * ref 方法（mount 后的 `$.exposed`）。Viewport 的 props / events / 方法单独成表，同法校验。
 */
const norm = (name: string) => name.toLowerCase().replace(/[-_:]/g, '')

/** 表格首列 → 名字集合；「store / root」这类合并单元格按 ` / ` 拆开 */
const documentedNames = (rows: string[][]) => {
  const names = new Set<string>()
  for (const row of rows) {
    for (const part of row[0].split(' / ')) names.add(part.trim())
  }
  return names
}

const propNames = (component: unknown) =>
  new Set(Object.keys((component as { props?: Record<string, unknown> }).props ?? {}))

/** `defineEmits<{...}>()` 由编译器落成运行时 emits 数组（字符串或 { name } 对象） */
const emitNames = (component: unknown) => {
  const emits = (component as { emits?: unknown }).emits
  if (Array.isArray(emits)) {
    return new Set(
      emits.map((entry: any) => (typeof entry === 'string' ? entry : (entry?.name ?? entry?.event)))
    )
  }
  return new Set(emits && typeof emits === 'object' ? Object.keys(emits) : [])
}

const okrTreeDir = resolve(process.cwd(), 'src/lib/okr-tree')

/** 从 SFC 源码的 `defineSlots<{...}>()` 里取顶层插槽名（无名插槽就是 default） */
const slotsOf = (file: string) => {
  const source = readFileSync(resolve(okrTreeDir, file), 'utf8')
  const start = source.indexOf('defineSlots<{')
  if (start === -1) throw new Error(`${file} 没有 defineSlots 声明`)

  // 从左花括号开始数配平，取出类型字面量的 body
  const open = source.indexOf('{', start)
  let depth = 0
  let close = open
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}' && --depth === 0) {
      close = i
      break
    }
  }

  const names: string[] = []
  let braceDepth = 0
  for (const line of source.slice(open + 1, close).split('\n')) {
    // 只认顶层键（toolbar 的作用域对象是嵌套花括号，里面的 zoomIn / fit 不算插槽）
    if (braceDepth === 0) {
      const match = line.match(/^\s*(?:'([^']+)'|([A-Za-z_$][\w$]*))\??:/)
      if (match) names.push(match[1] ?? match[2])
    }
    for (const ch of line) {
      if (ch === '{') braceDepth++
      else if (ch === '}') braceDepth--
    }
  }
  return names
}

const exposedOf = (vm: unknown) => (vm as any).$.exposed as Record<string, unknown>

const mountTree = () =>
  mount(VueOkrTree, { props: { data: [{ id: 1, label: 'R' }], nodeKey: 'id' } })

const mountViewport = () => mount(OkrTreeViewport)

describe('shared/api.ts 与 defineProps 一致', () => {
  it('Attributes 表里每个参数都是真实 prop', () => {
    const actual = new Set([...propNames(VueOkrTree)].map(norm))
    const documented = documentedNames(attributesSection.rows)
    expect([...documented].filter((name) => !actual.has(norm(name)))).toEqual([])
  })

  it('每个真实 prop 都写进了 Attributes 表（不允许出现未公开的 prop）', () => {
    const documented = new Set([...documentedNames(attributesSection.rows)].map(norm))
    const actual = propNames(VueOkrTree)
    expect([...actual].filter((name) => !documented.has(norm(name)))).toEqual([])
  })

  it('Attributes 行数与 prop 数一致', () => {
    expect(attributesSection.rows.length).toBe(propNames(VueOkrTree).size)
  })
})

describe('shared/api.ts 与 defineEmits 一致', () => {
  const documented = documentedNames(eventsSection.rows)

  it('Events 表里每个事件都能被组件触发', () => {
    const actual = emitNames(VueOkrTree)
    expect([...documented].filter((name) => !actual.has(name))).toEqual([])
  })

  it('组件触发的每个事件都写进了 Events 表', () => {
    const documentedNorm = new Set([...documented].map(norm))
    expect([...emitNames(VueOkrTree)].filter((name) => !documentedNorm.has(norm(name)))).toEqual([])
  })

  it('Events 行数与 emit 数一致', () => {
    expect(eventsSection.rows.length).toBe(emitNames(VueOkrTree).size)
  })
})

describe('shared/api.ts 与 defineSlots 一致', () => {
  // OkrTree 提供 default / expand-btn / empty，OkrTreeViewport 提供 default / toolbar
  const actual = new Set([...slotsOf('OkrTree.vue'), ...slotsOf('OkrTreeViewport.vue')])

  it('Slots 表里每个插槽都能在 SFC 里找到', () => {
    expect([...documentedNames(slotsSection.rows)].filter((name) => !actual.has(name))).toEqual([])
  })

  it('SFC 里的每个公开插槽都写进了 Slots 表', () => {
    const documented = new Set([...documentedNames(slotsSection.rows)].map(norm))
    expect([...actual].filter((name) => !documented.has(norm(name)))).toEqual([])
  })
})

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

describe('OkrTreeViewport 的表格与实现一致', () => {
  /** 表格首列去掉方法签名的括号，例如 fitToScreen(padding = 20) → fitToScreen */
  const bare = (name: string) => name.replace(/\(.*$/, '').trim()

  const actualProps = propNames(OkrTreeViewport)
  const actualEmits = emitNames(OkrTreeViewport)
  const actualMethods = new Set(Object.keys(exposedOf(mountViewport().vm)))

  // 「名称」列按签名归类：prop / event / method
  const sectionRows = viewportSection.rows
  const documentedProps = new Set(
    sectionRows.filter((row) => row[1].startsWith('prop')).map((row) => bare(row[0]))
  )
  const documentedEvents = new Set(
    sectionRows.filter((row) => row[1].startsWith('event')).map((row) => bare(row[0]))
  )
  const documentedMethods = new Set(
    sectionRows.filter((row) => row[1].startsWith('method')).map((row) => bare(row[0]))
  )

  it('props 双向一致（minZoom / maxZoom / zoomStep / zoom / offset / wheelBehavior / toolbar）', () => {
    expect([...documentedProps].filter((name) => !actualProps.has(name))).toEqual([])
    expect([...actualProps].filter((name) => !documentedProps.has(name))).toEqual([])
  })

  it('events 双向一致（update:zoom / update:offset）', () => {
    expect([...documentedEvents].filter((name) => !actualEmits.has(name))).toEqual([])
    expect([...actualEmits].filter((name) => !documentedEvents.has(name))).toEqual([])
  })

  it('ref 方法双向一致（含 exportImage）', () => {
    expect([...documentedMethods].filter((name) => !actualMethods.has(name))).toEqual([])
    expect([...actualMethods].filter((name) => !documentedMethods.has(name))).toEqual([])
  })

  it('表格行数 = props + events + methods', () => {
    expect(sectionRows.length).toBe(actualProps.size + actualEmits.size + actualMethods.size)
  })
})
