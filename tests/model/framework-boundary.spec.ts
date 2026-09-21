import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 模型层边界守卫（requirements 5.2「必须替换的 Vue 2 专属实现」+ Q7「死代码不移植」）。
 *
 * 模型层刻意只依赖 vue 的响应式 API（当前仅 `shallowReactive`），这样它才能同时跑在 jsdom、
 * SSR 与纯 node 下。一旦有人把组件实例、eventBus 或 `$on` / `$emit` 塞回 model，
 * 现有单测不会红，只有真实使用才会炸——所以把边界钉成断言，而不是靠 review 记忆。
 */
const modelDir = resolve(process.cwd(), 'src/lib/okr-tree/model')

const tsFiles = () => readdirSync(modelDir).filter((f) => /\.ts$/.test(f))
const read = (f: string) => readFileSync(resolve(modelDir, f), 'utf8')

describe('模型层不含 Vue 2 专属实现（Q7 / 5.2）', () => {
  it('模型层目录下确有源文件', () => {
    expect(tsFiles().length).toBeGreaterThan(0)
  })

  it.each(tsFiles())('%s 无 Vue 2 残留写法', (f) => {
    const src = read(f)
    expect(src).not.toMatch(/new Vue\(/)
    expect(src).not.toMatch(/\beventBus\b/)
    expect(src).not.toMatch(/\$on\s*\(|\$off\s*\(|\$emit\s*\(/)
    expect(src).not.toMatch(/\$set\s*\(|\$children\b|\$listeners\b|\$refs\b/)
    expect(src).not.toMatch(/Vue\.prototype/)
  })

  it('模型层只从 vue 引入响应式 API', () => {
    const allowed = new Set([
      'shallowReactive',
      'reactive',
      'ref',
      'computed',
      'watch',
      'isRef',
      'toRaw',
      'type Ref',
    ])
    const offenders: string[] = []
    for (const f of tsFiles()) {
      for (const m of read(f).matchAll(/import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+'vue'/g)) {
        for (const raw of m[1].split(',')) {
          const name = raw.trim().replace(/^type\s+/, '')
          if (name && !allowed.has(name)) offenders.push(`${f}: ${name}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
