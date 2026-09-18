/**
 * 发布产物冒烟验证：直接引入 dist/vue3-okr-tree.es.js，在 jsdom 中挂载三种模式并断言渲染结果。
 * 用法：pnpm build && pnpm verify:dist
 */
import { JSDOM } from 'jsdom'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distEs = resolve(root, 'dist/vue3-okr-tree.es.js')
const distUmd = resolve(root, 'dist/vue3-okr-tree.umd.js')
const distCss = resolve(root, 'dist/style.css')
const distDts = resolve(root, 'dist/index.d.ts')
const distDcts = resolve(root, 'dist/index.d.cts')

for (const f of [distEs, distUmd, distCss, distDts, distDcts]) {
  if (!existsSync(f)) {
    console.error(`[verify:dist] 缺少产物: ${f}`)
    process.exit(1)
  }
}

const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>')
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.SVGElement = dom.window.SVGElement
globalThis.Element = dom.window.Element
globalThis.Node = dom.window.Node
globalThis.MouseEvent = dom.window.MouseEvent

const { createApp, h } = await import('vue')
const lib = await import(pathToFileURL(distEs).href)
const { VueOkrTree, VueOkrTreePlugin, TreeStore, TreeNode } = lib

const assert = (cond, msg) => {
  if (!cond) {
    console.error(`[verify:dist] FAILED: ${msg}`)
    process.exit(1)
  }
  console.log(`[verify:dist] ok: ${msg}`)
}

assert(typeof VueOkrTree === 'object' || typeof VueOkrTree === 'function', '导出 VueOkrTree')
assert(typeof VueOkrTreePlugin.install === 'function', '导出 VueOkrTreePlugin')
assert(
  typeof TreeStore === 'function' && typeof TreeNode === 'function',
  '导出 TreeStore / TreeNode'
)
assert(lib.default === VueOkrTreePlugin, 'default 导出为插件')

const data = [
  {
    id: 1,
    label: 'R',
    children: [
      { id: 2, label: 'C' },
      { id: 3, label: 'D' },
    ],
  },
]
const leftData = [{ id: 1, label: 'R', children: [{ id: 12, label: 'L' }] }]

const mountTree = (props) => {
  const el = document.createElement('div')
  document.body.appendChild(el)
  let exposed = null
  const app = createApp({
    render: () => h(VueOkrTree, { ...props, ref: (r) => (exposed = r) }),
  })
  app.mount(el)
  return { el, exposed, app }
}

const texts = (el) =>
  [...el.querySelectorAll('.org-chart-node-label-inner')].map((e) => e.textContent.trim())

const v = mountTree({ data })
assert(JSON.stringify(texts(v.el)) === JSON.stringify(['R', 'C', 'D']), '垂直模式渲染')
assert(v.el.querySelector('.org-chart-node-children').classList.contains('vertical'), 'vertical 类')

const hz = mountTree({ data, direction: 'horizontal', showCollapsable: true, nodeKey: 'id' })
assert(
  hz.el.querySelector('.org-chart-node-children').classList.contains('horizontal'),
  'horizontal 类'
)
assert(hz.el.querySelector('.org-chart-node-btn') !== null, '展开按钮存在')
assert(hz.exposed.getNode(2).label === 'C', 'ref 方法 getNode 可用')

const okr = mountTree({
  data,
  leftData,
  onlyBothTree: true,
  direction: 'horizontal',
  nodeKey: 'id',
})
assert(okr.el.querySelector('.org-chart-node-left-children') !== null, 'OKR 左子树渲染')
assert(okr.el.querySelector('.org-chart-node').classList.contains('align-root'), 'align-root 类')
assert(texts(okr.el).includes('L'), 'OKR 左节点文本')

const css = readFileSync(distCss, 'utf8')
assert(
  css.includes('.org-chart-container') && css.includes('.okr-zoom-in-center-enter-active'),
  'style.css 含组件与动画样式'
)
assert(!/^\s*\*\s*\{/m.test(css), 'style.css 无全局 * reset')
assert(
  css.includes('.okr-theme-feishu') &&
    css.includes('.okr-theme-dark') &&
    css.includes('.okr-theme-minimal') &&
    css.includes('.okr-theme-colorful'),
  'style.css 含内置主题预设'
)
assert(
  /prefers-color-scheme:\s*dark/.test(css) && css.includes('.okr-theme-auto'),
  'auto 主题跟随系统暗色'
)
assert(
  css.includes('var(--okr-line-color') && css.includes('var(--okr-node-shadow'),
  '样式已变量化'
)
assert(!css.includes('1px solid #ccc'), '连接线颜色无残留硬编码')

const themed = mountTree({ data, theme: 'feishu' })
assert(
  themed.el.querySelector('.org-chart-container').classList.contains('okr-theme-feishu'),
  'theme prop 加类'
)

const dts = readFileSync(distDts, 'utf8')
assert(
  dts.includes('export declare const VueOkrTree') && dts.includes('export declare class TreeStore'),
  'index.d.ts 含导出声明'
)
assert(!/from '\.\.?\//.test(dts), 'index.d.ts 无未打包的相对路径引用')
const dcts = readFileSync(distDcts, 'utf8')
assert(
  dcts === dts || (dcts.includes('export declare const VueOkrTree') && !/from '\.\.?\//.test(dcts)),
  'index.d.cts 与 index.d.ts 内容一致（CJS require 类型条件）'
)

console.log('[verify:dist] ALL PASSED')
