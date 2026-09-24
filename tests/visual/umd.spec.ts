import { expect, test } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * UMD 在真实 `<script>` 环境里挂载一次（缺口清单 G9）。
 *
 * `verify:dist` 那三条只证明「UMD 能被 Node 执行 + 导出面对」，走的是 module 分支；
 * 浏览器分支（依赖从全局 `window.Vue` 取、导出挂到 `window.VueOkrTree`）、随包出去的
 * `style.css`、挂载期的 rAF / ResizeObserver 都不在那条路径上。文档站 CDN 用法页整篇
 * 建立在这条路径上，此前它一次都没被真实加载执行过。
 *
 * 刻意走 `page.setContent` + `addScriptTag({ content })` 而不是起一个临时 html 服务：
 * 与姊妹包 react-okr-tree 的 `scripts/gen-cross-impl-fixture.mjs` 同一套做法，两边
 * 「浏览器里加载 UMD」的路径保持一致，比多搭一个静态服务便宜。
 */
const UMD = resolve('dist/vue3-okr-tree.umd.js')
const SHEET = resolve('dist/style.css')
const VUE_GLOBAL = resolve('node_modules/vue/dist/vue.global.prod.js')

test('UMD 经 <script> 注入后在浏览器里挂载出可用的树', async ({ page }) => {
  // 缺产物判失败、不 skip：visual.yml 在 test:visual 前有 pnpm build，
  // skip 会让这条在漏了构建的步骤里安静消失，正好丢掉它要防的那类回归。
  for (const f of [UMD, SHEET, VUE_GLOBAL]) {
    expect(existsSync(f), `缺文件 ${f}：先跑 pnpm build`).toBe(true)
  }

  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`)
  })

  await page.setContent(
    '<!doctype html><html><head><meta charset="utf-8"><title>umd</title><style>' +
      readFileSync(SHEET, 'utf8') +
      '</style></head><body><div id="stage"></div></body></html>'
  )
  await page.addScriptTag({ content: readFileSync(VUE_GLOBAL, 'utf8') })
  await page.addScriptTag({ content: readFileSync(UMD, 'utf8') })

  const out = await page.evaluate(async () => {
    const g = window as unknown as Record<string, any>
    const shape = {
      vueGlobal: typeof g.Vue?.createApp,
      umdKeys: Object.keys(g.VueOkrTree ?? {}).sort(),
    }
    if (!g.VueOkrTree?.OkrTree) return { ...shape, mounted: false as const }

    const { createApp, h } = g.Vue
    const data = [
      {
        id: 1,
        label: 'Root',
        children: [
          { id: 2, label: 'B', children: [{ id: 3, label: 'C' }] },
          { id: 4, label: 'D' },
        ],
      },
    ]
    const host = document.createElement('div')
    document.getElementById('stage')!.appendChild(host)
    /**
     * `labelWidth` / `labelHeight` 钉死盒子尺寸：默认的 `auto` 下卡片宽高由文字度量决定，
     * 换机器（Windows 开发机 ↔ Linux CI）字体不同，svg 连线的几何就不同。主题选 feishu
     * 只为了拿一条确定的 `border-radius: 8px` 当「style.css 真的生效了」的证据。
     */
    const app = createApp({
      render: () =>
        h(g.VueOkrTree.OkrTree, {
          data,
          nodeKey: 'id',
          showCollapsable: true,
          defaultExpandAll: true,
          connector: 'svg',
          connectorShape: 'curve',
          labelWidth: 200,
          labelHeight: 60,
          theme: 'feishu',
        }),
    })
    app.mount(host)
    // 两帧之后才算稳态：挂载期排队的 rAF（svg 连线重绘）与 ResizeObserver 都要落完
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

    const container = host.querySelector<HTMLElement>('.org-chart-container')
    // 按 `.okr-connector-svg path` 取，不用裸 `svg path`：前者是 DOM 契约的一部分
    // （姊妹包的跨实现夹具与像素基线都锚这个类名），这里顺带把它钉一次
    const paths = Array.from(container?.querySelectorAll('.okr-connector-svg path') ?? [])
    const card = container?.querySelector<HTMLElement>('.org-chart-node-label-inner')
    const result = {
      ...shape,
      mounted: true as const,
      treeRole: container?.querySelector('[role="tree"]')?.getAttribute('role') ?? null,
      treeitems: container?.querySelectorAll('[role="treeitem"]').length ?? 0,
      cards: container?.querySelectorAll('.org-chart-node-label-inner').length ?? 0,
      paths: paths.length,
      emptyD: paths.filter((p) => !(p.getAttribute('d') ?? '').length).length,
      /** style.css 真的进了文档：feishu 主题的 --okr-node-radius: 8px */
      cardRadius: card ? getComputedStyle(card).borderRadius : null,
    }
    app.unmount()
    return result
  })

  expect(out.vueGlobal, 'vue.global.prod.js 没给出 window.Vue.createApp').toBe('function')
  // UMD 的浏览器分支真的把导出挂上全局了（Node 那条 module 分支证明不了这点）
  expect(out.umdKeys).toEqual(
    expect.arrayContaining(['OkrTree', 'OkrTreeGroup', 'BUILT_IN_THEMES'])
  )
  expect(out.mounted, 'window.VueOkrTree.OkrTree 不存在，挂载没发生').toBe(true)
  if (!out.mounted) return

  expect(out.treeRole, 'role="tree" 挂在 .org-chart-node-children 上，不是容器本身').toBe('tree')
  expect(out.cards).toBe(4)
  expect(out.treeitems).toBe(4)
  // svg 覆盖层真的算出几何了：一条 path 都没有 = 产物在浏览器里没跑起来
  expect(out.paths).toBeGreaterThan(0)
  expect(out.emptyD, '有 path 的 d 是空串：覆盖层画了但没几何').toBe(0)
  expect(out.cardRadius).toBe('8px')
  expect(errors, `浏览器里报错：\n${errors.join('\n')}`).toEqual([])
})
