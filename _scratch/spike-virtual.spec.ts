import { expect, test } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * #15 虚拟滚动预研 spike（半天时间盒，结论写回 roadmap 后本文件移入 _scratch）。
 *
 * 三个测量，全部在真实 Chromium 里（模式同 umd.spec.ts：setContent + addScriptTag）：
 * A. 基线：1 父 + 10000 平铺子节点，首帧耗时与 DOM 规模；
 * B. content-visibility: auto（DOM 全保留、结构选择器不破）：首帧耗时 + 中间兄弟连接线核对；
 * C. 真·窗口化（DOM 删除）：验证边界帽（:first-child/:last-child）必然错位这一 CSS 事实。
 */

const UMD = resolve('dist/vue3-okr-tree.umd.js')
const SHEET = resolve('dist/style.css')
const VUE_GLOBAL = resolve('node_modules/vue/dist/vue.global.prod.js')

const N = 10000

async function boot(page, extraStyle: string) {
  for (const f of [UMD, SHEET, VUE_GLOBAL]) {
    expect(existsSync(f), `缺文件 ${f}：先跑 pnpm build`).toBe(true)
  }
  await page.setContent(
    '<!doctype html><html><head><meta charset="utf-8"><style>' +
      readFileSync(SHEET, 'utf8') +
      extraStyle +
      '</style></head><body style="margin:0"><div id="stage"></div></body></html>'
  )
  await page.addScriptTag({ content: readFileSync(VUE_GLOBAL, 'utf8') })
  await page.addScriptTag({ content: readFileSync(UMD, 'utf8') })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`)
  })
  return errors
}

const mountTree = async (n: number) => {
  const g = window as unknown as Record<string, any>
  const t0 = performance.now()
  const { createApp, h } = g.Vue
  const data = [
    {
      id: 0,
      label: 'Root',
      children: Array.from({ length: n }, (_, i) => ({ id: i + 1, label: `N${i + 1}` })),
    },
  ]
  const app = createApp({
    render: () =>
      h(g.VueOkrTree.OkrTree, {
        data,
        nodeKey: 'id',
        defaultExpandAll: true,
        labelWidth: 200,
        labelHeight: 60,
      }),
  })
  app.mount('#stage')
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  void document.body.offsetHeight
  return Math.round(performance.now() - t0)
}

test('A/B: 基线 vs content-visibility 的首帧与连接线', async ({ page }) => {
  const errors = await boot(page, '')
  const firstFrameMs = await page.evaluate(mountTree, N)
  const base = await page.evaluate(() => ({
    nodes: document.querySelectorAll('.org-chart-node').length,
  }))
  console.log('A 基线:', JSON.stringify({ firstFrameMs, ...base }))
  expect(errors, errors.join('\n')).toEqual([])
  expect(base.nodes).toBe(N + 1)

  // B：content-visibility 预注入后全新页面再测一次（首帧就把 cv 生效算进去）
  const errors2 = await boot(
    page,
    '.org-chart-node { content-visibility: auto; contain-intrinsic-size: auto 64px; }'
  )
  const cvFrameMs = await page.evaluate(mountTree, N)
  const cv = await page.evaluate(() => {
    const kids = document.querySelectorAll('[data-level="2"]')
    const mid = [4999, 5000, 5001].map((i) => {
      const el = kids[i] as HTMLElement
      const before = getComputedStyle(el, '::before')
      const after = getComputedStyle(el, '::after')
      return { i, before: before.borderTopWidth, after: after.borderTopWidth, trunk: after.borderLeftWidth }
    })
    const a = (kids[5000] as HTMLElement).getBoundingClientRect()
    const b = (kids[5001] as HTMLElement).getBoundingClientRect()
    return { mid, gap: Math.round((b.left - a.right) * 100) / 100 }
  })
  console.log('B content-visibility:', JSON.stringify({ cvFrameMs, ...cv }))

  expect(errors2, errors2.join('\n')).toEqual([])
  for (const l of cv.mid) {
    expect(l.before, `节点 ${l.i} 的左半段`).toBe('1px')
    expect(l.after, `节点 ${l.i} 的右半段`).toBe('1px')
    expect(l.trunk, `节点 ${l.i} 的竖线`).toBe('1px')
  }
  expect(Math.abs(cv.gap)).toBeLessThanOrEqual(1)
})

test('C: 真·窗口化（DOM 删除）后边界帽必然错位', async ({ page }) => {
  const errors = await boot(page, '')
  const result = await page.evaluate(async (n) => {
    const g = window as unknown as Record<string, any>
    const { createApp, h } = g.Vue
    const data = [
      {
        id: 0,
        label: 'Root',
        children: Array.from({ length: n }, (_, i) => ({ id: i + 1, label: `N${i + 1}` })),
      },
    ]
    const app = createApp({
      render: () =>
        h(g.VueOkrTree.OkrTree, {
          data,
          nodeKey: 'id',
          defaultExpandAll: true,
          labelWidth: 200,
          labelHeight: 60,
        }),
    })
    app.mount('#stage')
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const kids = document.querySelectorAll('[data-level="2"]')
    const container = kids[0].parentElement as HTMLElement
    const heightBefore = container.getBoundingClientRect().height
    kids.forEach((el, i) => {
      if (i < 5000 || i > 5049) el.remove()
    })
    const after = document.querySelectorAll('.org-chart-node-children > .org-chart-node')
    const first = after[0] as HTMLElement
    const last = after[after.length - 1] as HTMLElement
    return {
      remaining: after.length,
      firstBefore: getComputedStyle(first, '::before').borderTopWidth,
      lastAfter: getComputedStyle(last, '::after').borderTopWidth,
      heightBefore,
      heightAfter: container.getBoundingClientRect().height,
    }
  }, N)
  console.log('C 窗口化:', JSON.stringify(result))
  expect(errors, errors.join('\n')).toEqual([])
  // 5000..5049 的真实兄弟仍在树模型里，只是被窗口化删了 DOM——边界帽却把它们当成「首/末」
  expect(result.firstBefore).toBe('0px')
  expect(result.lastAfter).toBe('0px')
})
