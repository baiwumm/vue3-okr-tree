import { expect, test } from '@playwright/test'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

/**
 * 浏览器真实性能基线（roadmap 1.5.0 #6 验收：2000 节点首渲染 < 300ms，开发机）。
 * 通过 route 拦截注入构建产物与 vue 浏览器版，避免依赖外部网络；
 * 结果写入 test-results/perf-browser.json（docs/perf.md 引用）。
 * 运行前提：pnpm build（dist 产物存在）。
 */

const esSource = readFileSync(new URL('../../dist/vue3-okr-tree.es.js', import.meta.url), 'utf8')
const vueSource = readFileSync(
  new URL('../../node_modules/vue/dist/vue.esm-browser.prod.js', import.meta.url),
  'utf8'
)

const fixtureHtml = `<!doctype html>
<html><head>
<script type="importmap">{"imports": {"vue": "http://fixture.local/vue.js"}}</script>
</head><body><div id="app"></div></body></html>`

test('2000 节点浏览器首渲染 < 300ms（开发机基准，CI 放宽）', async ({ page }) => {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/' || url.pathname === '') {
      return route.fulfill({ contentType: 'text/html', body: fixtureHtml })
    }
    if (url.pathname === '/lib.js') {
      return route.fulfill({ contentType: 'text/javascript', body: esSource })
    }
    if (url.pathname === '/vue.js') {
      return route.fulfill({ contentType: 'text/javascript', body: vueSource })
    }
    return route.fulfill({ status: 404, body: '' })
  })
  await page.goto('http://fixture.local/')

  // 5 轮取最优，剔除偶发抖动
  await page.evaluate(
    `
    (async () => {
      const { createApp, h, reactive } = await import('/vue.js')
      const { VueOkrTree } = await import('/lib.js')
      const makeData = () => {
        let id = 1
        const arr = []
        for (let d = 0; d < 40; d++) {
          const children = []
          for (let p = 0; p < 50; p++) children.push({ id: id++, label: '员工-' + d + '-' + p })
          arr.push({ id: id++, label: '部门-' + d, children })
        }
        return arr
      }
      const rounds = []
      const host = document.createElement('div')
      document.body.appendChild(host)
      for (let i = 0; i < 5; i++) {
        const data = reactive(makeData())
        const t0 = performance.now()
        const app = createApp({ render: () => h(VueOkrTree, { data, nodeKey: 'id', showCollapsable: true }) })
        app.mount(host)
        rounds.push(performance.now() - t0)
        app.unmount()
      }
      window.__perf = { rounds, best: Math.min(...rounds) }
    })()
  `
  )
  await page.waitForFunction('window.__perf')
  const perf = (await page.evaluate('window.__perf')) as { rounds: number[]; best: number }

  const limit = process.env.CI ? 1500 : 300
  expect(perf.best, `2000 节点首渲染 ${perf.best.toFixed(1)}ms 应低于 ${limit}ms`).toBeLessThan(
    limit
  )

  mkdirSync('test-results', { recursive: true })
  writeFileSync(
    'test-results/perf-browser.json',
    JSON.stringify(
      {
        date: new Date().toISOString().slice(0, 10),
        scenario: '2000 节点首渲染（挂载，默认折叠）',
        rounds: perf.rounds.map((r) => Number(r.toFixed(1))),
        bestMs: Number(perf.best.toFixed(1)),
        limitMs: limit,
        browser: 'chromium',
      },
      null,
      2
    )
  )
  console.log(`[perf] 2000 节点浏览器首渲染（5 轮取最优）: ${perf.best.toFixed(1)} ms`)
})
