import { expect, test, type Page } from '@playwright/test'

/**
 * 冒烟守卫：真实浏览器打开 Playground，对关键 demo 逐一交互，断言全程控制台无报错
 * （console.error / pageerror）。
 *
 * 这里刻意不截图。像素级比对全部由 visual.spec.ts 负责；此前本文件另截了 6 张
 * `final-*.png`，且全部传 `maxDiffPixelRatio: 1`——等于不比像素、只比尺寸，而尺寸恰恰是
 * 半像素偏移最容易误报的维度，所以它们几乎只产生假警报，却要 win32 / linux 各维护一份基线。
 * 已移除，改为断言交互结果（渲染出节点、主题类切换生效、懒加载出子节点、zoomIn 改变百分比）。
 */

const demoCard = (page: Page, id: string) => page.locator(`#${id} ~ .base-card-wrapper`)

async function settle(page: Page, id: string) {
  await page.locator(`#${id}`).scrollIntoViewIfNeeded()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(120)
}

test('关键 demo 交互与零控制台报错', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`)
  })
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`))

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)

  // 1. 三种布局模式均渲染出完整树
  for (const id of ['demo-1', 'demo-2', 'demo-10']) {
    await settle(page, id)
    expect(
      await demoCard(page, id).locator('.org-chart-node').count(),
      `${id} 未渲染节点`
    ).toBeGreaterThan(3)
  }

  // 2. 主题切换：切到 dark 后页面容器带上主题类，再切回 default
  //    （Playground 的切换器把 okr-theme-* 加在 .vue-okr-tree-demo 上一次性给所有 demo 换肤；
  //     组件自身的 theme prop 则加在 .org-chart-container 上，由 verify:dist 与 theme.spec.ts 覆盖）
  await page.locator('.demo-theme-bar').scrollIntoViewIfNeeded()
  await page.locator('.demo-theme-bar .demo-btn', { hasText: 'dark' }).click()
  await page.waitForTimeout(200)
  await expect(page.locator('.vue-okr-tree-demo.okr-theme-dark')).toBeVisible()
  await page.locator('.demo-theme-bar .demo-btn', { hasText: 'default' }).click()
  await page.waitForTimeout(200)
  await expect(page.locator('.vue-okr-tree-demo:not(.okr-theme-dark)')).toBeVisible()

  // 3. 懒加载：点击展开 → 模拟 800ms 接口 → 子节点渲染出来
  await page.locator('#demo-18').scrollIntoViewIfNeeded()
  const lazyCard = demoCard(page, 'demo-18')
  await lazyCard.locator('.org-chart-node-btn').first().click()
  await page.waitForTimeout(1400)
  expect(await lazyCard.locator('.org-chart-node-label-inner').count()).toBeGreaterThan(2)

  // 4. 画布：展开 → 工具栏可见 → zoomIn 让缩放百分比变化
  await page.locator('#demo-19').scrollIntoViewIfNeeded()
  const vpCard = demoCard(page, 'demo-19')
  await vpCard.locator('.org-chart-node-btn').first().click()
  await page.waitForTimeout(1200)
  await expect(vpCard.locator('.okr-viewport-toolbar')).toBeVisible()
  const zoomBefore = await vpCard.locator('.okr-viewport-toolbar-zoom').textContent()
  await vpCard.locator('.okr-viewport-toolbar-btn[title="放大"]').click()
  await page.waitForTimeout(100)
  expect(await vpCard.locator('.okr-viewport-toolbar-zoom').textContent()).not.toBe(zoomBefore)

  // 5. 受控状态与方法用例正常挂载
  await settle(page, 'demo-17')
  await expect(demoCard(page, 'demo-17')).toBeVisible()

  expect(errors, '浏览器控制台不应有报错：\n' + errors.join('\n')).toHaveLength(0)
})
