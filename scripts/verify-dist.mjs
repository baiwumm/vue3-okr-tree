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
/** 这两条此前只有 react 侧有：两仓 style.css 同源，门禁集合也不该一边多一边少 */
assert(css.includes('@media print') && css.includes('prefers-reduced-motion'), '含打印与减弱动效块')
assert(!css.includes('1px solid #ccc'), '连接线颜色无残留硬编码')

/**
 * CSS 几何常量门禁（react 侧权威清单 G17 / 第 1 轮审计报告 §7 第 3 条）。
 *
 * 两仓的 `style.css` 逐字同源（实测只差头注释与 `@import` 路径两处），`transition.css` 全等，
 * 但**产物** CSS 是两套压缩器各写一遍（本仓 esbuild，react 仓走 rolldown 内置的那套），实测
 * 差异全在写法层面：合并声明体相同的相邻规则、重排声明顺序、`transparent` 写成 `0 0`、
 * `.3s height` 写成 `height .3s`、`rgba(255,255,255,.94)` 折成 `#fffffff0`。所以
 * 「两仓产物逐字 diff」这条路走不通（那正是 G17 原本设想的「重装做法」的坑），这里退一步
 * 钉**相互咬合的几何值本身**：这些数字改一个就是连接线错位，组件层没有任何断言能发现它。
 *
 * 匹配前先归一两种形态：`cssFlat` 抹掉全部空白（声明体用它，绕开两侧「逗号后有无空格」的
 * 差异）；`cssSquash` 只把空白串折成一个空格（选择器用它——`.a b` 压成 `.ab` 就不是原意了）。
 */
const cssFlat = css.replace(/\s+/g, '')
const cssSquash = css.replace(/\s+/g, ' ')
/**
 * 几何类变量的兜底值要**处处存在且处处同值**：兜底就是这些值的单一来源（消费方不设变量时
 * 靠它），少一处或改一处都算漂移。只钉兜底里不含嵌套 `var()` 的那几个 ——
 * `--okr-*-shadow` / `--okr-line-color` 一类默认值带括号，简单正则会截断，且两仓压缩后
 * 颜色写法还不一致（实测 `rgba(31,35,41,.08)` vs `#1f232914`），不在这里管。
 */
const GEOMETRY_VARS = [
  ['--okr-gap-level', '20px'],
  ['--okr-gap-sibling', '5px'],
  ['--okr-line-width', '1px'],
  ['--okr-line-radius', '5px'],
  ['--okr-btn-size', '20px'],
  ['--okr-gap-node-y', '10px'],
]
for (const [name, expect] of GEOMETRY_VARS) {
  const hits = [...cssFlat.matchAll(new RegExp(`var\\(${name},([^()]*)\\)`, 'g'))].map((m) => m[1])
  const uses = cssFlat.split(`var(${name}`).length - 1
  assert(
    uses > 0 && hits.length === uses,
    `${name} 每处使用都带兜底（uses=${uses}，带兜底=${hits.length}）`
  )
  assert(
    new Set(hits).size === 1 && hits[0] === expect,
    `${name} 的兜底值处处为 ${expect}（实测 ${[...new Set(hits)].join(' / ') || '无'}）`
  )
}
/**
 * 左子树连接线短头：`12px`（宽）/ `calc(100% - 11px)`（左偏移）/ `10px`（高）三个值相互咬合，
 * 源文件里就注明「保持硬编码」。断「恰好出现一次」而不是「出现过」——出现两次说明有人复制
 * 了这条规则却没删原件，那种重复在同特异度下会让后一条说了算。
 */
for (const [label, token] of [
  ['短头宽 12px', 'width:12px'],
  ['短头高 10px', 'height:10px'],
  ['短头左偏移 calc(100% - 11px)', 'left:calc(100%-11px)'],
  ['垂直独子的 -1px 修正', 'margin-right:-1px'],
  ['水平独子去圆角', 'border-radius:0!important'],
]) {
  const n = cssFlat.split(token).length - 1
  assert(n === 1, `几何常量 ${label} 恰好转录一次（实测 ${n} 次）`)
}
/**
 * unstyled 的中和规则必须带满 5 个类：方向专属规则是 4 个类且排在它之后，同特异度后者胜，
 * 少一个类 unstyled 就压不住 hover 阴影。基础 + `:hover` 各一处。
 */
assert(
  cssSquash.split(
    '.org-chart-container.okr-unstyled .org-chart-node .org-chart-node-label .org-chart-node-label-inner'
  ).length -
    1 ===
    2,
  'okr-unstyled 的中和规则是五类选择器（基础与 :hover 各一处）'
)
/**
 * 组对齐的两条规则顺序：`.is-measuring`（`width: max-content`，测量时按自然宽度排）必须排在
 * `.is-measured`（`width: var(--okr-group-left-width)`，把宽度钉住）**之前** —— 两条特异度相同，
 * 后者胜，所以测量期间必须把 `is-measured` 摘掉才读得到自然宽度。顺序一旦颠倒，`measure()`
 * 无论怎么改都会读回被钉住的值。压缩器实测保留规则顺序，故能在产物层钉。
 */
const measuringAt = cssFlat.indexOf('.is-measuring')
const measuredAt = cssFlat.indexOf('.is-measured')
assert(
  measuringAt >= 0 && measuredAt > measuringAt,
  `.is-measuring 排在 .is-measured 之前（实测 ${measuringAt} / ${measuredAt}）`
)
assert(
  cssFlat.includes('width:max-content') && cssFlat.includes('width:var(--okr-group-left-width)'),
  '组对齐的自然宽度与钉宽两条规则都在产物里'
)

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

// optional peer（html-to-image）在产物里要同时满足三件事，缺一都会在下游炸：
// 1. 说明符经变量传递，不出现静态 import/require —— 否则 Vite/Rollup 会把可选依赖内联成
//    额外 chunk，或让没装它的消费者连加载都过不了；
// 2. 三种产物都保留 @vite-ignore / webpackIgnore / turbopackIgnore 三条注释 ——
//    Next 16 的 Turbopack 只认后两家，缺了会在**构建期**直接 Module not found
//    （文档站是第一个撞上的真实消费者）；注释被压缩吃掉是这个门禁的真正来由
//    （esbuild 四档压缩全丢，故 build.minify 用 terser + comments 白名单）；
// 3. 动态 import 的调用点确实存在（防止哪天改成顶层 await 被摇掉）。
const esSource = readFileSync(distEs, 'utf8')
const cjsSource = readFileSync(distCjs, 'utf8')
const umdSource = readFileSync(distUmd, 'utf8')
for (const [label, source] of [
  ['ESM', esSource],
  ['.cjs', cjsSource],
  ['.umd', umdSource],
]) {
  assert(
    !/from\s*['"]html-to-image['"]/.test(source) &&
      !/require\(\s*['"]html-to-image['"]\s*\)/.test(source),
    `${label} 未把可选 peer 静态引入`
  )
  assert(
    /@vite-ignore/.test(source) &&
      /webpackIgnore:\s*true/.test(source) &&
      /turbopackIgnore:\s*true/.test(source),
    `${label} 保留可选 peer 的三家打包器 ignore 注释`
  )
}
assert(/import\(/.test(esSource), 'ESM 保留 html-to-image 的动态 import 调用点')

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

// UMD 此前只 existsSync 一下、从未被执行：它外部化 vue，工厂签名或依赖声明一旦出问题，
// 只有浏览器 <script> 用户会撞上而 CI 全绿。走 CJS 分支真跑一遍即可证明签名正确。
assert(/require\((["'`])vue\1\)/.test(umdSource), 'UMD 的 CJS 分支把 vue 作为外部依赖 require')
const umdModule = { exports: {} }
new Function('module', 'exports', 'require', umdSource)(umdModule, umdModule.exports, req)
assert(
  umdModule.exports.OkrTree && umdModule.exports.OkrTree === umdModule.exports.VueOkrTree,
  '.umd.js 可被执行且导出与 .cjs 一致（OkrTree === VueOkrTree）'
)
assert(
  Array.isArray(umdModule.exports.BUILT_IN_THEMES) &&
    umdModule.exports.BUILT_IN_THEMES.length === 6,
  '.umd.js 导出 BUILT_IN_THEMES（6 个内置主题）'
)

console.log('[verify:dist] ALL PASSED')
