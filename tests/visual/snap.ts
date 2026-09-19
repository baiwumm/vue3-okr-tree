import { expect, type Locator } from '@playwright/test'

type ShotOptions = { maxDiffPixelRatio?: number; maxDiffPixels?: number; threshold?: number }

/** 元素截图与基线的宽高不一致（尺寸不符时 maxDiffPixelRatio 容差不生效，直接判失败） */
const SIZE_MISMATCH = /Expected an image \d+px by \d+px, received \d+px by \d+px/

/**
 * 元素截图统一入口：失败原因若是截图尺寸与基线不符，补一条能定位真因的提示。
 *
 * 这类失败几乎都是被截元素上方布局出现了半像素偏移：Playwright 把元素截图的裁剪框向外
 * 取整，元素顶边带小数时截图就比元素实际高度多 1 行，而报错只会说「Expected 326, received
 * 327」，看不出与组件渲染有任何关系。2026-09 那次 14 张基线集体失配即由此而来——真因是
 * demo 导航（13px 字号继承 line-height:1.5）算出 19.5px 行高，加用例后累计高度落在 .5px 上。
 */
export async function snap(locator: Locator, name: string, options?: ShotOptions) {
  try {
    await expect(locator).toHaveScreenshot(name, options)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (SIZE_MISMATCH.test(message)) {
      const box = await locator.evaluate((el) => {
        const rect = el.getBoundingClientRect()
        return { top: rect.top, height: rect.height }
      })
      throw new Error(
        `${message}\n\n[视觉门禁提示] ${name}：元素自身高度 ${box.height}px、视口顶边 ${box.top}px。` +
          `顶边带小数会让截图裁剪向外取整、比基线多 1 行。先取整该元素上方产生 .5px 的行高或间距，` +
          `确认渲染无误后再跑 pnpm test:visual:update 重生成基线。\n`
      )
    }
    throw err
  }
}
