/**
 * 发布产物冒烟验证：直接引入 dist/vue3-okr-tree.es.js，在 jsdom 中挂载三种模式并断言渲染结果；
 * 末尾另用 createRequire 加载 dist/vue3-okr-tree.cjs，验证 CJS 解析路径（Q9）。
 * 用法：pnpm build && pnpm verify:dist
 */
import { JSDOM } from 'jsdom'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distEs = resolve(root, 'dist/vue3-okr-tree.es.js')
const distUmd = resolve(root, 'dist/vue3-okr-tree.umd.js')
const distCjs = resolve(root, 'dist/vue3-okr-tree.cjs')
const distCss = resolve(root, 'dist/style.css')
const distDts = resolve(root, 'dist/index.d.ts')
const distDcts = resolve(root, 'dist/index.d.cts')

for (const f of [distEs, distUmd, distCjs, distCss, distDts, distDcts]) {
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
assert(css.includes('.org-chart-container'), 'style.css 含组件样式')
// Q6：六种内置过渡名必须在 CSS 里各有 enter / leave 两组类。
// 组件侧的 okr-anim-<name> 类是拼字符串生成的，CSS 少一组不会报错，只会静默没有动画。
const ANIMATE_NAMES = [
  'okr-fade-in-linear',
  'okr-fade-in',
  'okr-zoom-in-center',
  'okr-zoom-in-top',
  'okr-zoom-in-bottom',
  'okr-zoom-in-left',
]
for (const name of ANIMATE_NAMES) {
  assert(
    css.includes(`.${name}-enter-active`) && css.includes(`.${name}-leave-active`),
    `style.css 含 ${name} 的 enter / leave 过渡类`
  )
}
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

// Q9：本包是 "type": "module"，Node 会把 .umd.js 按 ESM 解析，require() 只能走 .cjs 这份。
// 此前该路径全靠人工验证，一旦构建端把 .cjs 的 exports 条件写坏，发包后才会被用户发现。
const req = createRequire(import.meta.url)
const cjs = req(distCjs)
assert(
  cjs.VueOkrTree && cjs.OkrTree === cjs.VueOkrTree,
  '.cjs 可被 require() 且组件导出指向同一实现'
)
assert(
  Array.isArray(cjs.BUILT_IN_THEMES) && cjs.BUILT_IN_THEMES.length === 6,
  '.cjs 导出 BUILT_IN_THEMES（6 个内置主题，与 react-okr-tree 导出面对齐）'
)
assert(
  typeof cjs.createTypedOkrTree === 'function' && typeof cjs.TreeStore === 'function',
  '.cjs 导出含类型收窄工具与 TreeStore'
)

console.log('[verify:dist] ALL PASSED')
