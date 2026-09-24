import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

/**
 * 组对齐宽度的行为判据（浏览器级；jsdom 没有布局，量不出宽度）。
 *
 * 测的是用户可见的那一条：**后加入的更宽成员要把对齐宽度顶上去**。
 * 缺陷形状是：`.is-measured` 把左容器宽度钉成 var(--okr-group-left-width)，而测量读的就是
 * 这些左容器自己的宽度 —— 若临时测量态（max-content）没生效，读回来的一直是「上一轮那个
 * 被钉住的值」，宽度只会越用越死。实测旧行为下：一棵窄树先量得 V1，再加入一棵左子树宽得多的
 * 成员，var 仍然是 V1（两个根节点的水平坐标从此与内容不匹配）。
 *
 * 判据不用「与手工测出的自然宽度比」那种预言：本场景里 flex 分配宽度恰好等于内容宽度，
 * 预言与被测值同源自证，实测在变异下照样全绿（写过一次，废了）。
 *
 * 运行前提：pnpm build（dist 产物存在）。注入方式与 perf.spec.ts 一致（route 拦截 +
 * importmap），不依赖外部网络。
 */
const libSource = readFileSync(new URL('../../dist/vue3-okr-tree.es.js', import.meta.url), 'utf8')
const vueSource = readFileSync(
  new URL('../../node_modules/vue/dist/vue.esm-browser.prod.js', import.meta.url),
  'utf8'
)
const cssSource = readFileSync(new URL('../../dist/style.css', import.meta.url), 'utf8')

const pageHtml = `<!doctype html>
<html><head><meta charset="utf-8"><style>${cssSource}</style>
<script type="importmap">{"imports": {"vue": "http://fixture.local/vue.js"}}</script>
</head><body><div id="host" style="width:1200px"></div></body></html>`

// 第二个成员足够宽，保证它才是真正的最大值来源（宽到一定超出一棵窄树的左容器宽度）
const WIDE = '一'.repeat(40)

const mountScript = `
import * as Vue from 'http://fixture.local/vue.js'
import * as Lib from 'http://fixture.local/lib.js'
const { createApp, h, reactive } = Vue
const { VueOkrTree, OkrTreeGroup } = Lib
const tree = leftLabel => ({
  data: [{ id: 1, label: 'Root', children: [{ id: 11, label: 'A' }] }],
  leftData: [{ id: 1, label: 'Root', children: [{ id: 21, label: leftLabel }] }],
  nodeKey: 'id',
  onlyBothTree: true,
  direction: 'horizontal',
  showCollapsable: true,
  defaultExpandAll: true,
})
const st = reactive({ two: false })
window.__st = st
createApp({
  render: () =>
    h(OkrTreeGroup, null, () =>
      st.two
        ? [h(VueOkrTree, tree('短')), h(VueOkrTree, tree('${WIDE}'))]
        : [h(VueOkrTree, tree('短'))]
    ),
}).mount(document.getElementById('host'))
window.__var = () =>
  parseFloat(getComputedStyle(document.querySelector('.okr-tree-group')).getPropertyValue('--okr-group-left-width'))
window.__settle = async () => {
  for (let i = 0; i < 5; i++) await new Promise(r => requestAnimationFrame(() => r()))
}
`

test('组内后加入更宽成员时，对齐宽度要跟着涨（不被首量钉死）', async ({ page }) => {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/' || url.pathname === '') {
      return route.fulfill({ contentType: 'text/html', body: pageHtml })
    }
    if (url.pathname === '/vue.js') {
      return route.fulfill({ contentType: 'text/javascript', body: vueSource })
    }
    if (url.pathname === '/lib.js') {
      return route.fulfill({ contentType: 'text/javascript', body: libSource })
    }
    return route.fulfill({ status: 200, contentType: 'text/plain', body: '' })
  })

  await page.goto('http://fixture.local/')
  await page.addScriptTag({ content: mountScript, type: 'module' })
  await page.waitForFunction(() => typeof (window as any).__var === 'function')
  await page.evaluate(() => (window as any).__settle())

  const one = await page.evaluate(() => (window as any).__var())
  expect(one, '首量就要拿到宽度').toBeGreaterThan(0)

  await page.evaluate(() => {
    ;(window as any).__st.two = true
    return (window as any).__settle()
  })
  const two = await page.evaluate(() => (window as any).__var())
  expect(two, '加入更宽的第二棵树的左子树后，对齐宽度必须涨上去').toBeGreaterThan(one)
})
