import { expect, test, type Page } from '@playwright/test'
import { snap } from './snap'

/**
 * 视觉回归（roadmap 1.5.0 #5）：真实浏览器对 Playground 关键用例截图比对。
 * 覆盖：三种布局模式、OKR 对齐、六套主题、动画落定态、懒加载、画布缩放。
 * 快照缺失时自动生成（updateSnapshots: 'missing'），已存在的不一致即失败。
 * 截图统一走 snap()：尺寸不符时补出可定位真因的提示。
 */

const demoCard = (page: Page, id: string) => page.locator(`#${id} ~ .base-card-wrapper`)

/** 稳定化：滚动到位、等字体加载完、等过渡动画落定 */
async function settle(page: Page, id: string) {
  await page.locator(`#${id}`).scrollIntoViewIfNeeded()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(120)
}

test.describe('三模式与 OKR 对齐', () => {
  test('基础用法（vertical）', async ({ page }) => {
    await page.goto('/')
    await settle(page, 'demo-1')
    await snap(demoCard(page, 'demo-1'), 'demo-vertical.png')
  })

  test('水平方向（horizontal）', async ({ page }) => {
    await page.goto('/')
    await settle(page, 'demo-2')
    await snap(demoCard(page, 'demo-2'), 'demo-horizontal.png')
  })

  test('节点展开（horizontal + collapsable，展开落定态）', async ({ page }) => {
    await page.goto('/')
    await page.locator('#demo-3').scrollIntoViewIfNeeded()
    await page.evaluate(() => document.fonts.ready)
    // 展开根节点，等过渡结束再截图（动画落定态）
    const card = demoCard(page, 'demo-3')
    await card.locator('.org-chart-node-btn').first().click()
    await page.waitForTimeout(150)
    await snap(card, 'demo-horizontal-expand.png')
  })

  test('OKR 模式（左右双向 + 根对齐）', async ({ page }) => {
    await page.goto('/')
    await settle(page, 'demo-10')
    await snap(demoCard(page, 'demo-10'), 'demo-okr.png')
  })

  test('OKR 多树根对齐（OkrTreeGroup）', async ({ page }) => {
    await page.goto('/')
    await page.locator('#group-demo').scrollIntoViewIfNeeded()
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(200) // 等 Group 测量完成
    await snap(page.locator('#group-demo'), 'demo-okr-group.png')
  })
})

test.describe('六套主题（作用于基础用法用例）', () => {
  const themes = ['default', 'feishu', 'dark', 'auto', 'minimal', 'colorful']

  for (const theme of themes) {
    test(`主题 ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light' }) // auto 主题固定浅色，保证确定性
      await page.goto('/')
      await page.locator('.demo-theme-bar').scrollIntoViewIfNeeded()
      await page.locator('.demo-theme-bar .demo-btn', { hasText: theme }).click()
      await settle(page, 'demo-1')
      await snap(demoCard(page, 'demo-1'), `theme-${theme}.png`)
    })
  }
})

test.describe('1.4.0 新能力', () => {
  test('懒加载：展开后子节点落定态', async ({ page }) => {
    await page.goto('/')
    await page.locator('#demo-18').scrollIntoViewIfNeeded()
    await page.evaluate(() => document.fonts.ready)
    const card = demoCard(page, 'demo-18')
    // 未展开状态（按钮 + 描述里的加载计数为 0）
    await snap(card, 'demo-lazy-before.png')
    // 点击展开 → 模拟接口 800ms → 加载完成渲染子节点
    await card.locator('.org-chart-node-btn').first().click()
    await page.waitForTimeout(1400)
    await snap(card, 'demo-lazy-loaded.png')
  })

  test('画布缩放：展开节点后的画布与工具栏', async ({ page }) => {
    await page.goto('/')
    await page.locator('#demo-19').scrollIntoViewIfNeeded()
    await page.evaluate(() => document.fonts.ready)
    const card = demoCard(page, 'demo-19')
    // 展开根节点，让画布内容可见（工具栏 + 缩放百分比 + 树）
    await card.locator('.org-chart-node-btn').first().click()
    await page.waitForTimeout(1400) // 懒加载模拟 800ms + 过渡
    await snap(card, 'demo-viewport.png')
  })

  test('打印媒体：隐藏展开按钮与画布工具栏、去掉卡片阴影', async ({ page }) => {
    await page.goto('/')
    const card = demoCard(page, 'demo-3')
    await card.scrollIntoViewIfNeeded()
    const btn = card.locator('.org-chart-node-btn').first()
    const label = card.locator('.org-chart-node-label-inner').first()
    const toolbar = demoCard(page, 'demo-19').locator('.okr-viewport-toolbar')

    // 屏幕上展开按钮可见且卡片带阴影
    await expect(btn).toBeVisible()
    expect(await label.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none')

    await page.emulateMedia({ media: 'print' })
    await expect(btn).toBeHidden()
    await expect(toolbar).toBeHidden()
    expect(await label.evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none')
  })
})
