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

  /**
   * 与姊妹包 react-okr-tree 同批同形（其 G14）：`align-root` 说的是「根节点不被子树推着走」，
   * 此前只有那条 CSS 与一张像素基线，展开 / 收起这个动作序列本身没有任何几何断言守着。
   *
   * 两件实测过的事记在这里，免得后人误判这条的射程：
   * ① 量的是**相对树容器**的水平坐标，不是绝对 `left`：点击时 Playwright 会把目标滚进视口，
   *    横向滚动位置会一起改掉绝对坐标（react 侧实测第一、二次读取之间 962 → 591），
   *    拿绝对坐标断言只会得到一条与几何无关的红。
   * ② 它抓住的是「收起把子树整个从布局里拿走」这一类（给 `.is-hidden` 补一条
   *    `display:none` 即红）；现存实现收起走内联 `visibility:hidden`（`OkrTreeNode.vue:325`），
   *    盒子留在原地，所以坐标才不动。`align-root` 的静态形状不在本条射程内：两侧
   *    `flex:1 1 0` 改成 `0 0 auto`、根节点 `width:100%` 改成 `auto`，本条与两张 OKR 像素
   *    基线都照样绿——那是 `group-align.spec.ts` 的活（两条变异实测都把它打红）。
   */
  test('展开 / 收起不改变 OKR 根卡片的水平坐标', async ({ page }) => {
    await page.goto('/')
    await settle(page, 'demo-10')
    const tree = demoCard(page, 'demo-10').locator('.org-chart-container').first()
    const root = tree.locator('.org-chart-node.only-both-tree-node.align-root').first()
    const card = root.locator('> .org-chart-node-label > .org-chart-node-label-inner')
    const measure = async () => {
      const [box, containerLeft] = await Promise.all([
        card.evaluate((el) => {
          const r = el.getBoundingClientRect()
          return { left: r.left, width: r.width }
        }),
        tree.evaluate((el) => el.getBoundingClientRect().left),
      ])
      return { x: box.left - containerLeft, width: box.width }
    }

    const before = await measure()
    expect(before.width).toBeGreaterThan(50)
    /**
     * 本仓的视觉配置没有 react 侧那句 `reducedMotion: 'reduce'`，收起仍会走 200ms 过渡
     * （`animateDuration` 默认值），所以每次切换后等过渡落定再量——量中间帧会拿到一条
     * 只在机器慢的时候才红的用例。
     */
    const settled = async () => {
      await page.waitForTimeout(320)
      return measure()
    }

    // 每一步都先确认真的收起 / 展开了：否则「坐标没变」可能只是因为按钮没生效
    const rightBtn = root.locator('> .org-chart-node-label > .org-chart-node-btn')
    const leftBtn = root.locator('> .org-chart-node-label > .org-chart-node-left-btn')

    await rightBtn.click()
    await expect(root.locator('> .org-chart-node-children')).toHaveClass(/is-hidden/)
    const collapsedRight = await settled()
    expect(collapsedRight.x).toBeCloseTo(before.x, 0)
    expect(collapsedRight.width).toBeCloseTo(before.width, 0)

    await rightBtn.click()
    await expect(root.locator('> .org-chart-node-children')).not.toHaveClass(/is-hidden/)
    expect((await settled()).x).toBeCloseTo(before.x, 0)

    // 左子树那一侧是 align-root 的承重边（flex: 1 1 0 + 组内统一宽度），单独走一遍
    await leftBtn.click()
    await expect(root.locator('> .org-chart-node-left-children')).toHaveClass(/is-hidden/)
    const collapsedLeft = await settled()
    expect(collapsedLeft.x).toBeCloseTo(before.x, 0)
    expect(collapsedLeft.width).toBeCloseTo(before.width, 0)

    await leftBtn.click()
    await expect(root.locator('> .org-chart-node-left-children')).not.toHaveClass(/is-hidden/)
    const after = await settled()
    expect(after.x).toBeCloseTo(before.x, 0)
    expect(after.width).toBeCloseTo(before.width, 0)
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

  test('unstyled：中和卡片外观但不改节点盒尺寸', async ({ page }) => {
    await page.goto('/')
    const card = demoCard(page, 'demo-1')
    await card.scrollIntoViewIfNeeded()
    const label = card.locator('.org-chart-node-label-inner').first()
    const shadow = () => label.evaluate((el) => getComputedStyle(el).boxShadow)
    const height = () => label.evaluate((el) => Math.round(el.getBoundingClientRect().height))

    expect(await shadow()).not.toBe('none')
    const h0 = await height()
    // 直接挂类名即可验证选择器优先级压过了方向专属规则（vertical 的 box-shadow 在更后面）
    await card.locator('.org-chart-container').evaluate((el) => el.classList.add('okr-unstyled'))
    expect(await shadow()).toBe('none')
    expect(await height()).toBe(h0)
  })
})
