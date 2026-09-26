import { expect, test, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 虚拟滚动（virtual）浏览器级门禁。jsdom 没有布局，这里的断言全部依赖真实几何：
 * - 等宽性：同一棵树 virtual on/off 的行 scrollWidth 一致（spacer 保宽的核心契约）；
 * - 连续性：窗口边界帽与占位块的连线段真实衔接（:first-child / :last-child 语义
 *   由占位块自然继承，无需覆盖类）；
 * - 滚动 / 揭示 / 键盘漫游在真实滚动容器里走完整链路。
 * 刻意不加像素基线：几何关系由计算样式与坐标断言钉住，比截图更准也更不怕字体差异。
 * evaluate 一律用函数形式（TS 由 spec 转译层处理，数据在函数内自包含）。
 */

const UMD = resolve('dist/vue3-okr-tree.umd.js')
const SHEET = resolve('dist/style.css')
const VUE_GLOBAL = resolve('node_modules/vue/dist/vue.global.prod.js')

const N = 2000

test.beforeEach(async ({ page }) => {
  for (const f of [UMD, SHEET, VUE_GLOBAL]) {
    expect(existsSync(f), `缺文件 ${f}：先跑 pnpm build`).toBe(true)
  }
  await page.setContent(
    '<!doctype html><html><head><meta charset="utf-8"><style>' +
      readFileSync(SHEET, 'utf8') +
      '</style></head><body style="margin:0"><div id="stage"></div></body></html>'
  )
  await page.addScriptTag({ content: readFileSync(VUE_GLOBAL, 'utf8') })
  await page.addScriptTag({ content: readFileSync(UMD, 'utf8') })
})

const errorsGuard = (page: Page) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`)
  })
  return errors
}

/** 挂一棵 1 根 + N 平铺叶子的树；virtual 树用 800px 滚动容器，非 virtual 用超宽容器（float 行不折行） */
const mountFlat = (page: Page, opts: { virtual: boolean; id: string }) =>
  page.evaluate(
    ({ n, virtual, id }: { n: number; virtual: boolean; id: string }) => {
      const { createApp, h } = (window as unknown as Record<string, any>).Vue
      const host = document.createElement('div')
      host.id = id
      host.style.cssText = virtual
        ? 'width: 800px; overflow: auto'
        : 'width: 300000px; overflow: hidden'
      document.getElementById('stage')!.appendChild(host)
      const data = [
        {
          id: 0,
          label: 'Root',
          children: Array.from({ length: n }, (_, i) => ({ id: i + 1, label: `N${i + 1}` })),
        },
      ]
      const app = createApp({
        render: () =>
          h((window as unknown as Record<string, any>).VueOkrTree.OkrTree, {
            data,
            nodeKey: 'id',
            labelWidth: 120,
            defaultExpandAll: true,
            virtual,
          } as Record<string, unknown>),
      })
      app.mount(host)
      return host.querySelectorAll('.org-chart-node').length
    },
    { n: N, virtual: opts.virtual, id: opts.id }
  )

const readRow = (page: Page, id: string) =>
  page.evaluate((id: string) => {
    const wrap = document.querySelector('#' + id)!
    // 目标行是 Root 节点自己的子容器（root 行只有 1 个根节点，不参与窗口化）
    const root = wrap.querySelector('.org-chart-node')!
    const row = root.querySelector(':scope > .org-chart-node-children')!
    const children = Array.from(row.children) as HTMLElement[]
    const spacer = children.find((c) => c.classList.contains('okr-v-spacer')) ?? null
    return {
      nodes: wrap.querySelectorAll('.org-chart-node').length,
      rowWidth: row.scrollWidth,
      spacerWidth: spacer ? spacer.style.width : null,
      firstChildIsSpacer: children[0].classList.contains('okr-v-spacer'),
    }
  }, id)

test('等宽性 + 渲染有界 + 滚动驱动窗口移动 + 边界帽连续', async ({ page }) => {
  const errors = errorsGuard(page)

  const virtNodes = await mountFlat(page, { virtual: true, id: 'virtual-wrap' })
  expect(virtNodes).toBeLessThan(40)
  await page.waitForTimeout(120)

  const virt = await readRow(page, 'virtual-wrap')
  expect(virt.nodes).toBeLessThan(40)
  expect(virt.spacerWidth).toBeTruthy()

  // 等宽性：非 virtual 树在超宽容器（不折行）里与 virtual 树的根节点宽度一致（±2px）
  // ——float shrink-to-fit 下两者都应落在模型行宽 2000×130 + 根节点左右内边距 10
  const plainNodes = await mountFlat(page, { virtual: false, id: 'plain-wrap' })
  expect(plainNodes).toBe(N + 1)
  await page.waitForTimeout(250)
  const widths = await page.evaluate(() => {
    const rootW = (sel: string) =>
      (document.querySelector(sel + ' .org-chart-node') as HTMLElement)!.offsetWidth
    return { plain: rootW('#plain-wrap'), virt: rootW('#virtual-wrap') }
  })
  expect(Math.abs(widths.plain - widths.virt)).toBeLessThanOrEqual(2)

  // 滚动到最右：窗口移动到尾段节点，行宽不变
  const mid = await page.evaluate(async (id: string) => {
    const wrap = document.querySelector('#' + id)!
    wrap.scrollLeft = wrap.scrollWidth
    await new Promise((r) => setTimeout(r, 100))
    const labels = Array.from(
      wrap.querySelectorAll(
        ':scope .org-chart-node-children:not([role]) .org-chart-node-label-inner, :scope .org-chart-node .org-chart-node-children .org-chart-node-label-inner'
      )
    ).map((el) => el.textContent!.trim())
    const root = wrap.querySelector('.org-chart-node')!
    const row = root.querySelector(':scope > .org-chart-node-children')!
    return {
      labels,
      nodes: wrap.querySelectorAll('.org-chart-node').length,
      width: row.scrollWidth,
    }
  }, 'virtual-wrap')
  expect(mid.width).toBe(virt.rowWidth)
  expect(mid.nodes).toBeLessThan(40)
  expect(mid.labels.some((l) => Number(l.slice(1)) > 1900)).toBe(true)

  // 边界帽连续性：滚动到最右后，行末是真实节点（:last-child 生效，::after 去线），
  // 行首是 lead 占位块（线段 1px 续接，首个渲染节点 ::before 也是 1px）
  const caps = await page.evaluate((id: string) => {
    const wrap = document.querySelector('#' + id)!
    const root = wrap.querySelector('.org-chart-node')!
    const row = root.querySelector(':scope > .org-chart-node-children')!
    const children = Array.from(row.children) as HTMLElement[]
    const firstEl = children[0]
    const lastEl = children[children.length - 1]
    const firstNode = row.querySelector('.org-chart-node')!
    const spacerLine = firstEl.classList.contains('okr-v-spacer')
      ? getComputedStyle(firstEl).borderTopWidth
      : null
    return {
      firstChildIsSpacer: firstEl.classList.contains('okr-v-spacer'),
      spacerLine,
      firstNodeBefore: getComputedStyle(firstNode, '::before').borderTopWidth,
      lastIsNode: !lastEl.classList.contains('okr-v-spacer'),
      lastNodeAfter: lastEl.classList.contains('okr-v-spacer')
        ? null
        : getComputedStyle(lastEl, '::after').borderTopWidth,
    }
  }, 'virtual-wrap')
  expect(caps.firstChildIsSpacer).toBe(true)
  expect(caps.spacerLine).toBe('1px')
  expect(caps.firstNodeBefore).toBe('1px')
  expect(caps.lastIsNode).toBe(true)
  expect(caps.lastNodeAfter).toBe('0px')

  expect(errors).toEqual([])
})

test('scrollToNode 揭示窗口外目标并滚动到位；键盘漫游跨窗口边界不丢焦', async ({ page }) => {
  const errors = errorsGuard(page)

  await page.evaluate((n: number) => {
    const { createApp } = (window as unknown as Record<string, any>).Vue
    const host = document.createElement('div')
    host.id = 'wrap'
    host.style.cssText = 'width: 800px; overflow: auto'
    document.getElementById('stage')!.appendChild(host)
    const data = [
      {
        id: 0,
        label: 'Root',
        children: Array.from({ length: n }, (_, i) => ({ id: i + 1, label: `N${i + 1}` })),
      },
    ]
    const app = createApp({
      data: () => ({ data }),
      mounted() {
        ;(window as unknown as Record<string, unknown>).__tree = this.$refs.tree
      },
      template: `
        <okr-tree ref="tree" :data="data" node-key="id" :label-width="120" default-expand-all virtual></okr-tree>
      `,
    })
    app.component('okr-tree', (window as unknown as Record<string, any>).VueOkrTree.OkrTree)
    app.mount(host)
  }, N)
  await page.waitForTimeout(150)

  // scrollToNode：窗口外的 N1800 揭示 + 滚动（behavior auto 消除平滑滚动的不确定性）
  const scrolled = await page.evaluate(async () => {
    const wrap = document.querySelector('#wrap')!
    const tree = (window as unknown as Record<string, any>).__tree
    const ok = await tree.scrollToNode(1800, { behavior: 'auto' })
    await new Promise((r) => setTimeout(r, 250))
    const labels = Array.from(wrap.querySelectorAll('.org-chart-node-label-inner')).map((el) =>
      el.textContent!.trim()
    )
    return { ok, after: wrap.scrollLeft, hasTarget: labels.includes('N1800') }
  })
  expect(scrolled.ok).toBe(true)
  expect(scrolled.hasTarget).toBe(true)
  expect(scrolled.after).toBeGreaterThan(0)

  // 键盘漫游：焦点从头连续 ArrowDown 30 步，跨出初始窗口（约 7 条）仍逐条推进
  const keyboard = await page.evaluate(async () => {
    const wrap = document.querySelector('#wrap')!
    wrap.scrollLeft = 0
    await new Promise((r) => setTimeout(r, 100))
    const first = wrap.querySelector('.org-chart-node') as HTMLElement
    first.focus()
    const visited: string[] = []
    for (let i = 0; i < 30; i++) {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      )
      await new Promise((r) => setTimeout(r, 25))
      const el = document.activeElement as HTMLElement
      const label = el.querySelector?.('.org-chart-node-label-inner')?.textContent?.trim()
      if (!label) break
      visited.push(label)
    }
    return { count: visited.length, first: visited[0], seq: visited }
  })
  expect(keyboard.first).toBe('N1')
  expect(keyboard.count).toBe(30)
  // 契约：跨出初始窗口（约 11 条）后焦点仍逐条 +1 推进、无跳焦（每次 reveal 都成功）
  const indexes = keyboard.seq.map((l: string) => Number(l.slice(1)))
  for (let i = 1; i < indexes.length; i++) {
    expect(indexes[i]).toBe(indexes[i - 1] + 1)
  }
  expect(indexes[indexes.length - 1]).toBeGreaterThanOrEqual(30)

  expect(errors).toEqual([])
})
