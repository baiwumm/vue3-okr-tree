import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * G8（acceptance.md 第 6 节 / requirements.md 第 7 节第 2 条）：24 个 Demo 的**交互层**断言。
 *
 * 这批用例全部只读 DOM 状态与计算样式，一张 png 都不截——像素比对归 visual.spec.ts，
 * 而「点下去到底发生了什么」此前只由 smoke.spec.ts 覆盖 5 处、其余靠人工点。
 * 每个用例自带 console / pageerror 守卫，所以「可交互」与「不报错」两件事一起钉住。
 *
 * 定位约定：
 * - 每个 Demo 的 h3 锚点（`#demo-*`）与 BaseCard 根节点是兄弟，用 `#${id} ~ .base-card-wrapper`
 *   把选择器限制在单个用例内——同一条 label 文本在多个用例里重复出现，全局选择器会串台。
 * - 读文本一律用 `allTextContents()`：折叠的子树靠 `visibility: hidden` 收起，
 *   `allInnerTexts()` 对它们一律返回空串，会把「折叠着的节点」读成「不存在的节点」。
 * - 定位单个节点只走直接子代链（`> .org-chart-node-label > …`），后代文本会污染 `:has()`。
 */

const card = (page: Page, id: string) => page.locator(`#${id} ~ .base-card-wrapper`)

/**
 * 按 label 文本定位「那一个节点」。自定义 render-content 的用例把标题包进 `.diy-con-name`，
 * 此时 label-inner 的整段文本是「标题 + 描述」，需要把真正写标题的那层传进来。
 */
const nodeByLabel = (root: Locator, label: string, sel = '.org-chart-node-label-inner') =>
  root.locator(`.org-chart-node:has(> .org-chart-node-label > ${sel}:text-is("${label}"))`)
const btnOf = (node: Locator) => node.locator('> .org-chart-node-label > .org-chart-node-btn')
const leftBtnOf = (node: Locator) =>
  node.locator('> .org-chart-node-label > .org-chart-node-left-btn')
const kidsOf = (node: Locator) => node.locator('> .org-chart-node-children')
const leftKidsOf = (node: Locator) => node.locator('> .org-chart-node-left-children')
const innerOf = (node: Locator) =>
  node.locator('> .org-chart-node-label > .org-chart-node-label-inner')
const boxOf = (node: Locator) => innerOf(node).locator('.org-chart-node-checkbox')

/** 该节点右子树的直接子代 label 文本，按 DOM 顺序 */
async function childLabels(node: Locator, sel = '.org-chart-node-label-inner') {
  const texts = await node
    .locator(`> .org-chart-node-children > .org-chart-node > .org-chart-node-label > ${sel}`)
    .allTextContents()
  return texts.map((t) => t.trim())
}

async function openPlayground(page: Page): Promise<string[]> {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`)
  })
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`))
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  return errors
}

const labelsIn = async (root: Locator) =>
  (await root.locator('.org-chart-node-label-inner').allTextContents()).map((t) => t.trim())

test.describe('展开 / 收起 / 默认展开', () => {
  test('demo-3 show-collapsable：按钮态与子树可见性同步切换', async ({ page }) => {
    const errors = await openPlayground(page)
    const c = card(page, 'demo-3')
    const root = nodeByLabel(c, 'xxx科技有有限公司')

    // 默认全折叠：三个有子代的节点各挂一个 is-hidden 容器，且折叠是真的从布局里拿走
    await expect(c.locator('.org-chart-node-children.is-hidden')).toHaveCount(3)
    await expect(nodeByLabel(c, '研发-前端')).toBeHidden()
    await expect(btnOf(root)).not.toHaveClass(/expanded/)

    await btnOf(root).click()
    await expect(btnOf(root)).toHaveClass(/expanded/)
    await expect(kidsOf(root)).not.toHaveClass(/is-hidden/)
    await expect(c.locator('.org-chart-node-children.is-hidden')).toHaveCount(2)
    await expect(nodeByLabel(c, '产品研发部')).toBeVisible()
    await expect(nodeByLabel(c, '研发-前端')).toBeHidden()

    await btnOf(root).click()
    await expect(btnOf(root)).not.toHaveClass(/expanded/)
    await expect(nodeByLabel(c, '产品研发部')).toBeHidden()

    expect(errors).toHaveLength(0)
  })

  test('demo-4 / demo-5：default-expand-all 全展开，default-expanded-keys 连带展开父链', async ({
    page,
  }) => {
    const errors = await openPlayground(page)
    const all = card(page, 'demo-4')
    await expect(all.locator('.org-chart-node-children.is-hidden')).toHaveCount(0)
    await expect(all.locator('.org-chart-node-btn.expanded')).toHaveCount(3)
    await expect(nodeByLabel(all, 'UI 设计')).toBeVisible()

    // 本例写的 key 是 5，而 5（UI 设计）是叶子节点——它自身没有可展开的子树，
    // 但 TreeNode.expand(true) 会把父链拉起来，所以可观察结果是「根与产品研发部展开、销售部仍折叠」。
    const keyed = card(page, 'demo-5')
    await expect(keyed.locator('.org-chart-node-children.is-hidden')).toHaveCount(1)
    await expect(nodeByLabel(keyed, 'UI 设计')).toBeVisible()
    await expect(nodeByLabel(keyed, '销售一部')).toBeHidden()
    expect(await childLabels(nodeByLabel(keyed, '产品研发部'))).toEqual([
      '研发-前端',
      '研发-后端',
      'UI 设计',
    ])

    expect(errors).toHaveLength(0)
  })

  test('demo-1 / demo-2：两种 direction 全展开渲染，树根容器带上方向类', async ({ page }) => {
    const errors = await openPlayground(page)
    const vertical = card(page, 'demo-1')
    await expect(vertical.locator('[role="tree"].vertical')).toHaveCount(1)
    await expect(vertical.locator('.org-chart-node')).toHaveCount(9)
    await expect(vertical.locator('.org-chart-node-btn')).toHaveCount(0)
    await expect(nodeByLabel(vertical, 'UI 设计')).toBeVisible()

    const horizontal = card(page, 'demo-2')
    await expect(horizontal.locator('[role="tree"].horizontal')).toHaveCount(1)
    expect(await childLabels(nodeByLabel(horizontal, 'xxx科技有有限公司'))).toEqual([
      '产品研发部',
      '销售部',
      '财务部',
    ])

    expect(errors).toHaveLength(0)
  })
})

test.describe('节点外观与自定义内容', () => {
  test('demo-6：label-width / label-height 落到内联尺寸，点击后换成选中样式', async ({ page }) => {
    const errors = await openPlayground(page)
    const c = card(page, 'demo-6')
    const root = nodeByLabel(c, 'xxx科技有有限公司')
    const inputs = c.locator('.demo-controls input')

    // labelClassName 一直在，currentLableClassName 只在选中后出现
    await expect(innerOf(root)).toHaveClass(/label-class-blue/)
    await expect(innerOf(root)).not.toHaveClass(/label-bg-blue/)

    await inputs.nth(0).fill('200')
    await inputs.nth(1).fill('80')
    await expect(innerOf(root)).toHaveCSS('width', '200px')
    await expect(innerOf(root)).toHaveCSS('height', '80px')

    await innerOf(root).click()
    await expect(innerOf(root)).toHaveClass(/is-current/)
    await expect(innerOf(root)).toHaveClass(/label-bg-blue/)

    expect(errors).toHaveLength(0)
  })

  test('demo-7：render-content / node-component / 插槽三种写法都渲染出自定义内容，点击带 current-select', async ({
    page,
  }) => {
    const errors = await openPlayground(page)
    const c = card(page, 'demo-7')
    const buttons = c.locator('.demo-controls .demo-btn')
    await expect(buttons).toHaveCount(3)

    for (const index of [0, 1, 2]) {
      await buttons.nth(index).click()
      await expect(buttons.nth(index)).toHaveClass(/is-active/)
      await expect(c.locator('.diy-wrapper .diy-con-name').first()).toBeVisible()
      expect(await c.locator('.diy-con-name').count()).toBeGreaterThan(3)
      const first = c.locator('.diy-wrapper').first()
      await expect(first).not.toHaveClass(/current-select/)
      await first.click()
      await expect(first).toHaveClass(/current-select/)
    }

    expect(errors).toHaveLength(0)
  })

  test('demo-8：node-btn-content 把展开按钮内容换成「智」', async ({ page }) => {
    const errors = await openPlayground(page)
    const c = card(page, 'demo-8')
    await expect(c.locator('.org-chart-node-btn')).toHaveCount(3)
    await expect(c.locator('.org-chart-node-btn-text')).toHaveText(['智', '智', '智'])

    expect(errors).toHaveLength(0)
  })

  test('demo-9：动画名落在节点子容器上，duration 落到 --okr-anim-duration，媒体查询实时关掉动画', async ({
    page,
  }) => {
    const errors = await openPlayground(page)
    const c = card(page, 'demo-9')
    // [role=tree] 那层是树根自己的容器，不带动画类；动画类与动画变量都挂在各节点的子容器上
    const container = c.locator('.org-chart-node > .org-chart-node-children').first()
    const readDuration = () =>
      container.evaluate((el) => getComputedStyle(el).getPropertyValue('--okr-anim-duration'))

    await expect(container).toHaveClass(/is-animated/)
    await expect(container).toHaveClass(/okr-anim-okr-zoom-in-center/)
    await expect.poll(readDuration).toBe('200ms')

    await c.locator('.demo-controls .demo-btn').filter({ hasText: 'okr-zoom-in-top' }).click()
    await expect(container).toHaveClass(/okr-anim-okr-zoom-in-top/)

    await c.locator('.demo-controls input').fill('500')
    await expect.poll(readDuration).toBe('500ms')

    // prefers-reduced-motion 走 matchMedia 的 change 监听，实时把 animate 视为关闭（1.7.0 的档位）
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(container).not.toHaveClass(/is-animated/)
    await expect.poll(readDuration).toBe('')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await expect(container).toHaveClass(/is-animated/)

    expect(errors).toHaveLength(0)
  })
})

test.describe('OKR 双向树', () => {
  test('demo-10：左右两棵树各自独立折叠，align-root 开关落到根节点状态类', async ({ page }) => {
    const errors = await openPlayground(page)
    const c = card(page, 'demo-10')
    // 本例是 OkrTreeGroup 里的两棵树，必须逐棵树圈定作用域
    const first = c.locator('.org-chart-container').first()
    const root = nodeByLabel(first, 'xxx科技有有限公司')

    await expect(leftBtnOf(root)).toHaveCount(1)
    await expect(kidsOf(root)).toHaveCount(1)
    await expect(leftKidsOf(root)).toHaveCount(1)

    await leftBtnOf(root).click()
    await expect(leftKidsOf(root)).toHaveClass(/is-hidden/)
    await expect(kidsOf(root)).not.toHaveClass(/is-hidden/)
    await leftBtnOf(root).click()
    await expect(leftKidsOf(root)).not.toHaveClass(/is-hidden/)

    const align = c.locator('.demo-controls .demo-btn')
    await expect(root).toHaveClass(/align-root/)
    await align.click()
    await expect(root).not.toHaveClass(/align-root/)
    await align.click()
    await expect(root).toHaveClass(/align-root/)

    expect(errors).toHaveLength(0)
  })

  test('demo-11：render-content 里 isLeftChild 分支只作用于左子树', async ({ page }) => {
    const errors = await openPlayground(page)
    const c = card(page, 'demo-11')
    // 只看每个节点自己的内容层：左子树节点的后代同样带 left-child，用后代选择器会比错
    await expect(
      c.locator(
        '.org-chart-node.is-left-child-node > .org-chart-node-label > .org-chart-node-label-inner .diy-wrapper2.left-child'
      )
    ).not.toHaveCount(0)
    await expect(
      c.locator(
        '.org-chart-node:not(.is-left-child-node) > .org-chart-node-label > .org-chart-node-label-inner .diy-wrapper2.left-child'
      )
    ).toHaveCount(0)
    await expect(
      c
        .locator(
          '.org-chart-node:not(.is-left-child-node) > .org-chart-node-label > .org-chart-node-label-inner .diy-wrapper2'
        )
        .first()
    ).toBeVisible()

    expect(errors).toHaveLength(0)
  })

  test('demo-12：show-node-num 折叠时给出可见子节点数，展开后收起数字', async ({ page }) => {
    const errors = await openPlayground(page)
    const c = card(page, 'demo-12')
    const nameSel = '.org-chart-node-label-inner .diy-con-name'
    const root = nodeByLabel(c, 'xxx科技有有限公司', nameSel)

    const rightCount = await kidsOf(root).locator('> .org-chart-node').count()
    const leftCount = await leftKidsOf(root).locator('> .org-chart-node').count()
    expect(rightCount).toBeGreaterThan(1)
    expect(leftCount).toBeGreaterThan(1)
    await expect(
      root.locator('> .org-chart-node-label > .org-chart-node-btn .org-chart-node-btn-text')
    ).toHaveText(String(rightCount))
    await expect(
      root.locator('> .org-chart-node-label > .org-chart-node-left-btn .org-chart-node-btn-text')
    ).toHaveText(String(leftCount))

    await btnOf(root).click()
    await expect(btnOf(root).locator('.org-chart-node-btn-text')).toHaveCount(0)
    await expect(kidsOf(root)).not.toHaveClass(/is-hidden/)
    await expect(nodeByLabel(c, '产品研发部', nameSel)).toBeVisible()
    // 展开根之后，仍折叠的子孙节点带着自己的数字
    await expect(
      nodeByLabel(c, '销售部', nameSel).locator(
        '> .org-chart-node-label > .org-chart-node-btn .org-chart-node-btn-text'
      )
    ).toHaveText('2')

    expect(errors).toHaveLength(0)
  })
})

test.describe('过滤与实例方法', () => {
  test('demo-13：过滤只留匹配项与父链，清空恢复；增删改方法都反映到 DOM', async ({ page }) => {
    const errors = await openPlayground(page)
    const c = card(page, 'demo-13')
    expect(await labelsIn(c)).toHaveLength(9)

    await c.locator('.filter-wrapper input').fill('销售')
    const filtered = await labelsIn(c)
    expect(filtered).toContain('销售部')
    expect(filtered).toContain('销售一部')
    expect(filtered).toContain('xxx科技有有限公司')
    expect(filtered).not.toContain('产品研发部')
    expect(filtered).not.toContain('研发-前端')

    await c.locator('.filter-wrapper input').fill('')
    expect(await labelsIn(c)).toContain('产品研发部')

    const button = (text: string) => c.locator('.btns-wrap button', { hasText: text })
    await button('删除产品研发部').click()
    await expect(nodeByLabel(c, '产品研发部')).toHaveCount(0)
    await button('为销售部门增加新的部门').click()
    expect(await childLabels(nodeByLabel(c, '销售部'))).toEqual([
      '销售一部',
      '销售二部',
      '销售三部',
    ])
    await button('更新销售部子部门').click()
    await expect(nodeByLabel(c, '销售一部--子一')).toBeVisible()

    await button('通过 node 设置 销售一部 为选中状态').click()
    await expect(nodeByLabel(c, '销售一部')).toHaveClass(/is-current/)
    await expect(innerOf(nodeByLabel(c, '销售一部'))).toHaveClass(/crrentClass/)
    await button('取消选中').click()
    await expect(c.locator('.org-chart-node.is-current')).toHaveCount(0)

    expect(errors).toHaveLength(0)
  })

  test('demo-14：OKR 模式下过滤对左右两棵树同时生效', async ({ page }) => {
    const errors = await openPlayground(page)
    const c = card(page, 'demo-14')
    const before = await labelsIn(c)
    expect(before.length).toBeGreaterThan(6)

    await c.locator('.filter-wrapper input').fill('销售')
    const after = await labelsIn(c)
    expect(after).toContain('销售部')
    expect(after).not.toContain('产品研发部')
    expect(after).not.toContain('(左)产品研发部')
    expect(after.length).toBeLessThan(before.length)

    await c.locator('.filter-wrapper input').fill('')
    expect(await labelsIn(c)).toHaveLength(before.length)

    // 只命中左子树的关键字：共用的根节点必须留在页面上。旧行为是根被判不可见，
    // 于是连刚命中的左子树一起从 DOM 卸载，整棵树凭空消失
    await c.locator('.filter-wrapper input').fill('左')
    const leftOnly = await labelsIn(c)
    expect(leftOnly).toContain('(左)销售部')
    expect(leftOnly).toContain('xxx科技有有限公司')
    expect(leftOnly).not.toContain('销售部')
    await expect(c.locator('.org-chart-node:not(.is-left-child-node)').first()).toBeVisible()

    await c.locator('.filter-wrapper input').fill('')
    expect(await labelsIn(c)).toHaveLength(before.length)

    expect(errors).toHaveLength(0)
  })
})

test.describe('事件', () => {
  test('demo-15：node-click 与 node-contextmenu 各自进日志，空态提示消失', async ({ page }) => {
    const errors = await openPlayground(page)
    const c = card(page, 'demo-15')
    const log = c.locator('.event-log')
    await expect(log.locator('.event-log-empty')).toBeVisible()

    const target = innerOf(nodeByLabel(c, '财务部'))
    await target.click()
    await expect(log.locator('.event-log-item').first()).toContainText('node-click')
    await expect(log.locator('.event-log-item').first()).toContainText('财务部')

    await target.click({ button: 'right' })
    await expect(log.locator('.event-log-item').first()).toContainText('node-contextmenu')
    await expect(log.locator('.event-log-empty')).toHaveCount(0)
    await expect(log.locator('.event-log-item')).toHaveCount(2)

    expect(errors).toHaveLength(0)
  })

  test('demo-16：收起触发 node-collapse，再展开触发 node-expand', async ({ page }) => {
    const errors = await openPlayground(page)
    const c = card(page, 'demo-16')
    const log = c.locator('.event-log')
    const root = nodeByLabel(c, 'xxx科技有有限公司')

    await expect(btnOf(root)).toHaveClass(/expanded/)
    await btnOf(root).click()
    await expect(log.locator('.event-log-item').first()).toContainText('node-collapse')
    await btnOf(root).click()
    await expect(log.locator('.event-log-item').first()).toContainText('node-expand')

    expect(errors).toHaveLength(0)
  })
})

test.describe('受控状态、懒加载与画布', () => {
  test('demo-17：expandAll / collapseAll / current-key 回写，#expand-btn 插槽可开关', async ({
    page,
  }) => {
    const errors = await openPlayground(page)
    const c = card(page, 'demo-17')
    const state = c.locator('.demo-controls code')
    const button = (text: string) => c.locator('.btns-wrap button', { hasText: text })

    // 插槽默认开启：按钮内容由 #expand-btn 提供，作用域 side 被写进 title
    await expect(c.locator('.org-chart-node-btn-text[title="right"]')).toHaveCount(3)

    await expect(state.nth(0)).toHaveText('[1]')
    await button('expandAll').click()
    await expect(state.nth(0)).not.toHaveText('[1]')
    await expect(c.locator('.org-chart-node-children.is-hidden')).toHaveCount(0)
    await button('collapseAll').click()
    await expect(c.locator('.org-chart-node-btn.expanded')).toHaveCount(0)

    await button('expandedKeys = [1, 6]').click()
    await expect(state.nth(0)).toHaveText('[1,6]')
    await expect(nodeByLabel(c, '销售一部')).toBeVisible()

    await button('currentKey = 8').click()
    await expect(state.nth(1)).toHaveText('8')
    await expect(nodeByLabel(c, '销售二部')).toHaveClass(/is-current/)
    await button('currentKey = null').click()
    await expect(c.locator('.org-chart-node.is-current')).toHaveCount(0)

    await button('#expand-btn 插槽').click()
    await expect(c.locator('.org-chart-node-btn-text[title="right"]')).toHaveCount(0)

    expect(errors).toHaveLength(0)
  })

  test('demo-18：懒加载出 is-loading，且每个节点只请求一次', async ({ page }) => {
    const errors = await openPlayground(page)
    const c = card(page, 'demo-18')
    const root = nodeByLabel(c, 'xxx科技有有限公司')
    const loads = c.locator('.description strong')

    await expect(loads).toHaveText('0')
    await btnOf(root).click()
    await expect(btnOf(root)).toHaveClass(/is-loading/)
    await expect
      .poll(async () => await childLabels(root), { message: 'load resolve 后才写入子节点' })
      .toEqual(['xxx科技有有限公司-子 A', 'xxx科技有有限公司-子 B'])
    await expect(btnOf(root)).not.toHaveClass(/is-loading/)
    await expect(loads).toHaveText('1')

    await btnOf(root).click()
    await btnOf(root).click()
    await expect(loads).toHaveText('1')

    expect(errors).toHaveLength(0)
  })

  test('demo-19：平移改写偏移量且只吞掉松手那一次点击；fit / reset 改写缩放百分比', async ({
    page,
  }) => {
    const errors = await openPlayground(page)
    const c = card(page, 'demo-19')
    const viewport = c.locator('.okr-viewport')
    const zoomText = c.locator('.okr-viewport-toolbar-zoom')
    const toolbarBtn = (text: string) => c.locator('.okr-viewport-toolbar-btn', { hasText: text })
    const currentTexts = () =>
      viewport.evaluate((v: any) =>
        Array.from(
          v.querySelectorAll(
            '.org-chart-node.is-current > .org-chart-node-label > .org-chart-node-label-inner'
          )
        ).map((e: any) => e.textContent?.trim())
      )

    await viewport.scrollIntoViewIfNeeded()
    expect(await viewport.locator('.org-chart-node').count()).toBeGreaterThan(3)

    // 展开一层，拿到两个可点选的直接子节点
    await btnOf(nodeByLabel(c, 'xxx科技有有限公司')).click()
    const nodeA = innerOf(nodeByLabel(c, 'xxx科技有有限公司-A'))
    const nodeB = innerOf(nodeByLabel(c, 'xxx科技有有限公司-B'))

    const before = await zoomText.innerText()
    await toolbarBtn('适应窗口').click()
    await expect(zoomText).not.toHaveText(before)
    await toolbarBtn('重置').click()
    await expect(zoomText).toHaveText('100%')

    /**
     * 在画布空白处按下、横向拖 110px、仍在画布内松手。
     * 松手本身会在画布上补出一次 click，那一次由标志位吞掉——所以紧接着的节点点击应当正常生效。
     */
    const pan = async (dx: number) => {
      const box = (await viewport.boundingBox())!
      const y = box.y + box.height - 14
      await page.mouse.move(box.x + 30, y)
      await page.mouse.down()
      await page.mouse.move(box.x + 30 + dx, y, { steps: 8 })
      await page.mouse.up()
      await expect(viewport).not.toHaveClass(/is-panning/)
    }

    await pan(110)
    expect(await viewport.locator('.okr-viewport-canvas').getAttribute('style')).toMatch(
      /translate\(1\d\dpx/
    )
    await nodeA.click()
    await expect.poll(currentTexts).toEqual(['xxx科技有有限公司-A'])

    // 用工具栏复位（此刻没有待吞的点击，一次就够），再平移一次：验证不会连坐到后面的点击上
    await toolbarBtn('重置').click()
    await expect
      .poll(async () => await viewport.locator('.okr-viewport-canvas').getAttribute('style'))
      .toMatch(/translate\(0px, 0px/)

    await pan(110)
    await nodeB.click()
    await expect.poll(currentTexts).toEqual(['xxx科技有有限公司-B'])
    await nodeA.click()
    await expect.poll(currentTexts).toEqual(['xxx科技有有限公司-A'])

    const wheelBtn = c.locator('.okr-viewport-toolbar-btn').first()
    await expect(wheelBtn).not.toHaveClass(/is-active/)
    await wheelBtn.click()
    await expect(wheelBtn).toHaveClass(/is-active/)

    /**
     * 松手落在画布外（2026-09-25 修的那条）：元素侧收不到 pointerup，手势必须照样收尾——
     * 之后不按键的悬停不能再拖动画布，而且这一次不该武装「吞一次点击」，
     * 否则用户回到画布里的第一次正常点击会被无故吃掉。
     */
    await toolbarBtn('重置').click()
    const box2 = (await viewport.boundingBox())!
    const y2 = box2.y + box2.height - 14
    await page.mouse.move(box2.x + 30, y2)
    await page.mouse.down()
    await page.mouse.move(box2.x + 130, y2, { steps: 6 })
    await page.mouse.move(box2.x + 170, box2.y - 40, { steps: 4 })
    await page.mouse.up()
    await expect(viewport).not.toHaveClass(/is-panning/)
    const styleAfterRelease = await viewport.locator('.okr-viewport-canvas').getAttribute('style')
    expect(styleAfterRelease).toMatch(/translate\(1\d\dpx/)
    // 不按键地移回画布：偏移必须一动不动
    await page.mouse.move(box2.x + 300, y2, { steps: 6 })
    await page.mouse.move(box2.x + 420, y2, { steps: 6 })
    await expect(viewport.locator('.okr-viewport-canvas')).toHaveAttribute(
      'style',
      styleAfterRelease!
    )
    // 画布外松手不该武装「吞一次点击」：回到画布里的第一次点击就得管用，
    // 工具栏的复位点击正是那一次（被吞掉的话偏移会停在原处）
    await toolbarBtn('重置').click()
    await expect(viewport.locator('.okr-viewport-canvas')).toHaveAttribute(
      'style',
      /translate\(0px, 0px/
    )
    await nodeA.click()
    await expect.poll(currentTexts).toEqual(['xxx科技有有限公司-A'])

    expect(errors).toHaveLength(0)
  })
})

test.describe('交互档（accordion / expand-on-click-node / checkbox / draggable / connector）', () => {
  test('accordion：展开兄弟时同级互斥收起', async ({ page }) => {
    const errors = await openPlayground(page)
    const c = card(page, 'demo-accordion')
    const root = nodeByLabel(c, 'xxx科技有有限公司')
    const dev = nodeByLabel(c, '产品研发部')
    const sales = nodeByLabel(c, '销售部')

    await btnOf(root).click()
    await btnOf(dev).click()
    await expect(kidsOf(dev)).not.toHaveClass(/is-hidden/)
    await expect(nodeByLabel(c, 'UI 设计')).toBeVisible()

    await btnOf(sales).click()
    await expect(kidsOf(sales)).not.toHaveClass(/is-hidden/)
    await expect(kidsOf(dev)).toHaveClass(/is-hidden/)
    await expect(nodeByLabel(c, 'UI 设计')).toBeHidden()

    expect(errors).toHaveLength(0)
  })

  test('expand-on-click-node：点卡片内容即切换展开，叶子只选中不切换', async ({ page }) => {
    const errors = await openPlayground(page)
    const c = card(page, 'demo-node-click-expand')
    const root = nodeByLabel(c, 'xxx科技有有限公司')
    const dev = nodeByLabel(c, '产品研发部')

    await innerOf(root).click()
    await expect(btnOf(root)).toHaveClass(/expanded/)
    await expect(nodeByLabel(c, '销售部')).toBeVisible()

    await btnOf(dev).click()
    await expect(kidsOf(dev)).not.toHaveClass(/is-hidden/)
    const frontend = nodeByLabel(c, '研发-前端')
    await innerOf(frontend).click()
    await expect(frontend).toHaveClass(/is-current/)
    await expect(kidsOf(dev)).not.toHaveClass(/is-hidden/)

    await innerOf(frontend).click()
    await expect(kidsOf(dev)).not.toHaveClass(/is-hidden/)

    expect(errors).toHaveLength(0)
  })

  test('checkbox：联动半选、strictly 关闭联动、工具条方法按钮真的作用到树上', async ({ page }) => {
    const errors = await openPlayground(page)
    const c = card(page, 'demo-checkbox')
    const root = nodeByLabel(c, 'xxx科技有有限公司')
    const dev = nodeByLabel(c, '产品研发部')
    const sales = nodeByLabel(c, '销售部')
    const toolbar = (text: string) =>
      c.locator('.demo-checkbox-toolbar .demo-btn', { hasText: text })
    const log = c.locator('.event-log')

    // default-checked-keys=[3,4]：两个叶子已选，父节点与根都只到半选
    await expect(boxOf(nodeByLabel(c, '研发-前端'))).toHaveClass(/is-checked/)
    await expect(boxOf(dev)).toHaveClass(/is-indeterminate/)
    await expect(boxOf(root)).toHaveClass(/is-indeterminate/)
    await expect(boxOf(sales)).not.toHaveClass(/is-checked|is-indeterminate/)

    await btnOf(root).click()
    await btnOf(dev).click()
    await btnOf(sales).click()
    await expect(nodeByLabel(c, '销售一部')).toBeVisible()

    await boxOf(dev).click()
    await expect(log.locator('.event-log-item').first()).toContainText('check')
    for (const label of ['研发-前端', '研发-后端', 'UI 设计']) {
      await expect(boxOf(nodeByLabel(c, label))).toHaveClass(/is-checked/)
    }

    // check-strictly：只动自己，子孙保持原样（销售一部此前从未被勾过）
    await toolbar('check-strictly').click()
    await boxOf(sales).click()
    await expect(boxOf(sales)).toHaveClass(/is-checked/)
    await expect(boxOf(nodeByLabel(c, '销售一部'))).not.toHaveClass(/is-checked/)

    // 关回联动，走 ref 上的 setCheckedKeys：[7,8] 恰好是销售部的全部子节点 ⇒ 销售部全选、根半选
    await toolbar('check-strictly').click()
    await toolbar('setCheckedKeys').click()
    await expect(boxOf(nodeByLabel(c, '销售一部'))).toHaveClass(/is-checked/)
    await expect(boxOf(nodeByLabel(c, '销售二部'))).toHaveClass(/is-checked/)
    await expect(boxOf(sales)).toHaveClass(/is-checked/)
    await expect(boxOf(root)).toHaveClass(/is-indeterminate/)
    await expect(boxOf(dev)).not.toHaveClass(/is-checked|is-indeterminate/)

    await toolbar('getCheckedKeys').click()
    await expect(log.locator('.event-log-item').first()).toContainText('checked=[')

    expect(errors).toHaveLength(0)
  })

  test('draggable：inner 放置改写层级并给出事件日志，allow-drag 拦住财务部', async ({ page }) => {
    const errors = await openPlayground(page)
    const c = card(page, 'demo-draggable')
    const log = c.locator('.event-log')
    const logItem = (event: string) => log.locator('.event-log-item', { hasText: event })
    const root = nodeByLabel(c, 'xxx科技有有限公司')
    const dev = nodeByLabel(c, '产品研发部')
    const sales = nodeByLabel(c, '销售部')

    await btnOf(root).click()
    await btnOf(dev).click()
    const frontend = nodeByLabel(c, '研发-前端')
    await expect(frontend).toBeVisible()
    expect(await childLabels(dev)).toEqual(['研发-前端', '研发-后端', 'UI 设计'])

    await innerOf(frontend).dragTo(innerOf(sales), { targetPosition: { x: 12, y: 12 } })
    await expect(logItem('node-drag-start')).toHaveCount(1)
    await expect(logItem('node-drop')).toHaveCount(1)
    // 载荷修好后（2026-09-25）成功放置这一路报的是「放置完成」而不是「未完成放置」
    await expect(logItem('node-drag-end')).toHaveText(/放置完成/)
    expect(await childLabels(dev)).toEqual(['研发-后端', 'UI 设计'])
    expect(await childLabels(sales)).toEqual(['销售一部', '销售二部', '研发-前端'])

    // allow-drag(node) 返回 false：拖不起来，一个事件都不产生
    const finance = nodeByLabel(c, '财务部')
    const before = await log.locator('.event-log-item').count()
    await innerOf(finance).dragTo(innerOf(root), { targetPosition: { x: 12, y: 12 } })
    await expect(log.locator('.event-log-item')).toHaveCount(before)
    expect(await childLabels(root)).toEqual(['产品研发部', '销售部', '财务部'])

    expect(errors).toHaveLength(0)
  })

  test('connector：svg 模式出线，形状切换改写路径，切回 css 后覆盖层消失', async ({ page }) => {
    const errors = await openPlayground(page)
    const c = card(page, 'demo-connector')
    const toolbar = c.locator('.demo-connector-toolbar')
    const paths = c.locator('.okr-connector-svg path')
    const root = nodeByLabel(c, 'xxx科技有有限公司')

    await expect(toolbar.locator('.demo-btn', { hasText: 'connector: svg' })).toHaveClass(
      /is-active/
    )
    await expect(paths.first()).toBeVisible()
    const curveD = await paths.first().getAttribute('d')
    expect(curveD).toBeTruthy()

    await btnOf(root).click()
    await expect.poll(async () => await paths.first().getAttribute('d')).not.toBe(curveD)
    await btnOf(root).click()

    const orthogonal = toolbar.locator('.demo-btn', { hasText: 'orthogonal' })
    await expect(orthogonal).toBeEnabled()
    await orthogonal.click()
    const orthogonalD = await paths.first().getAttribute('d')
    expect(orthogonalD).toBeTruthy()
    expect(orthogonalD).not.toBe(curveD)
    await toolbar.locator('.demo-btn', { hasText: 'straight' }).click()
    expect(await paths.first().getAttribute('d')).not.toBe(orthogonalD)

    await toolbar.locator('.demo-btn', { hasText: 'connector: css' }).click()
    await expect(c.locator('.okr-connector-svg')).toHaveCount(0)
    await expect(toolbar.locator('.demo-btn', { hasText: 'curve' })).toBeDisabled()

    expect(errors).toHaveLength(0)
  })
})
