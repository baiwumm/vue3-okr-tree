import { expect, test, type Page } from '@playwright/test'
import { snap } from './snap'

/**
 * 发包门禁终验：真实浏览器打开 Playground，对关键 demo 逐一交互并截图，
 * 断言全程浏览器控制台无报错（console.error / pageerror）。
 * 截图统一走 snap()：尺寸不符时补出可定位真因的提示。
 */

const demoCard = (page: Page, id: string) => page.locator(`#${id} ~ .base-card-wrapper`)

async function settle(page: Page, id: string) {
  await page.locator(`#${id}`).scrollIntoViewIfNeeded()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(120)
}

test('关键 demo 截图与控制台零报错', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`)
  })
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`))

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)

  // 1. 垂直模式
  await settle(page, 'demo-1')
  await snap(demoCard(page, 'demo-1'), 'final-vertical.png', { maxDiffPixelRatio: 1 })

  // 2. 水平方向
  await settle(page, 'demo-2')
  await snap(demoCard(page, 'demo-2'), 'final-horizontal.png', { maxDiffPixelRatio: 1 })

  // 3. OKR 左右树
  await settle(page, 'demo-10')
  await snap(demoCard(page, 'demo-10'), 'final-okr.png', { maxDiffPixelRatio: 1 })

  // 4. 主题切换（切到 dark 再切回 default）
  await page.locator('.demo-theme-bar .demo-btn', { hasText: 'dark' }).click()
  await settle(page, 'demo-1')
  await snap(page.locator('.demo-theme-bar'), 'final-theme-dark.png', { maxDiffPixelRatio: 1 })
  await page.locator('.demo-theme-bar .demo-btn', { hasText: 'default' }).click()
  await page.waitForTimeout(150)

  // 5. 懒加载：点击展开 → 模拟 800ms 接口 → 子节点渲染
  await page.locator('#demo-18').scrollIntoViewIfNeeded()
  const lazyCard = demoCard(page, 'demo-18')
  await lazyCard.locator('.org-chart-node-btn').first().click()
  await page.waitForTimeout(1400)
  const lazyLabels = await lazyCard.locator('.org-chart-node-label-inner').all()
  expect(lazyLabels.length).toBeGreaterThan(2) // 根 + 两个懒加载子节点
  await snap(lazyCard, 'final-lazy.png', { maxDiffPixelRatio: 1 })

  // 6. 画布缩放：展开 → 工具栏可见 → zoomIn 生效
  await page.locator('#demo-19').scrollIntoViewIfNeeded()
  const vpCard = demoCard(page, 'demo-19')
  await vpCard.locator('.org-chart-node-btn').first().click()
  await page.waitForTimeout(1200)
  await expect(vpCard.locator('.okr-viewport-toolbar')).toBeVisible()
  const zoomBefore = await vpCard.locator('.okr-viewport-toolbar-zoom').textContent()
  await vpCard.locator('.okr-viewport-toolbar-btn[title="放大"]').click()
  await page.waitForTimeout(100)
  const zoomAfter = await vpCard.locator('.okr-viewport-toolbar-zoom').textContent()
  expect(zoomAfter).not.toBe(zoomBefore) // 100% → 120%
  await snap(vpCard, 'final-viewport.png', { maxDiffPixelRatio: 1 })

  // 7. 方法调用（受控状态与方法用例）
  await settle(page, 'demo-17')
  await expect(demoCard(page, 'demo-17')).toBeVisible()

  expect(errors, '浏览器控制台不应有报错：\n' + errors.join('\n')).toHaveLength(0)
})
