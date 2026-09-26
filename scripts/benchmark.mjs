/**
 * 性能基线 benchmark（roadmap 1.5.0 #6）：2000 节点的关键路径耗时。
 * 先构建产物再运行：pnpm build && pnpm bench
 * 输出 markdown 表格，结果记录在 docs/perf.md。
 */
import { JSDOM } from 'jsdom'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve, dirname } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distEs = resolve(root, 'dist/vue3-okr-tree.es.js')

const dom = new JSDOM('<!doctype html><html><body></body></html>')
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.SVGElement = dom.window.SVGElement
globalThis.Element = dom.window.Element
globalThis.Node = dom.window.Node
// virtual 的行几何路径要读 getComputedStyle 与 rAF（vitest 的 jsdom 环境自带，裸 jsdom 只给前者）。
// rAF 这里用 setTimeout 顶替：只为让代码跑到，不参与计时口径。
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)

const { createApp, h, nextTick, reactive } = await import('vue')
const { VueOkrTree } = await import(pathToFileURL(distEs).href)

/** 2000 节点：40 个部门 × 50 人（两层），加公司层共 2041 节点 */
function makeBigData() {
  const data = []
  let id = 1
  for (let d = 0; d < 40; d++) {
    const children = []
    for (let p = 0; p < 50; p++) {
      children.push({ id: id++, label: `员工-${d}-${p}` })
    }
    data.push({ id: id++, label: `部门-${d}`, children })
  }
  return data
}

const fmt = (ms) => (ms >= 100 ? `${ms.toFixed(0)}` : ms >= 10 ? `${ms.toFixed(1)}` : ms.toFixed(2))

async function measure(label, fn, rounds = 3) {
  const times = []
  let last
  for (let i = 0; i < rounds; i++) {
    last = await fn()
    times.push(last.ms)
  }
  const best = Math.min(...times)
  console.log(
    `| ${label} | ${fmt(best)} ms（${rounds} 轮取最优，末轮 ${fmt(last.ms)} ms） | ` +
      (last.note || '')
  )
  last.best = best
  return last
}

/** 挂载一棵树并返回 { el, vm, app } */
function mountTree(data, extraProps = {}) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  let exposed = null
  const app = createApp({
    render: () => h(VueOkrTree, { data, ...extraProps, ref: (r) => (exposed = r) }),
  })
  return {
    el,
    get exposed() {
      return exposed
    },
    app,
    mount: () => app.mount(el),
  }
}

console.log('## vue3-okr-tree 性能基线（2000 节点，jsdom + dist ESM 产物）\n')
console.log('| 场景 | 耗时 | 说明 |')
console.log('| ---- | ---- | ---- |')

// ---- 1. 首渲染（折叠态，仅顶层可见） ----
await measure('首渲染（2041 节点数据，仅顶层渲染）', async () => {
  const data = reactive(makeBigData())
  const t0 = performance.now()
  const tree = mountTree(data, { nodeKey: 'id', showCollapsable: true })
  tree.mount()
  const t1 = performance.now()
  tree.app.unmount()
  document.body.removeChild(tree.el)
  return { ms: t1 - t0 }
})

// ---- 2. 首渲染（全部展开，2000 节点全量 DOM） ----
await measure('首渲染（全部展开，约 2041 个节点 DOM）', async () => {
  const data = reactive(makeBigData())
  const t0 = performance.now()
  const tree = mountTree(data, { nodeKey: 'id', showCollapsable: true, defaultExpandAll: true })
  tree.mount()
  await nextTick()
  const t1 = performance.now()
  tree.app.unmount()
  document.body.removeChild(tree.el)
  return { ms: t1 - t0 }
})

// ---- 3. 展开 / 收起全部 ----
{
  const data = reactive(makeBigData())
  const tree = mountTree(data, {
    nodeKey: 'id',
    showCollapsable: true,
    filterNodeMethod: (value, d) => d.label && d.label.includes(value),
  })
  tree.mount()
  const vm = tree.exposed
  await measure('expandAll（2041 节点状态 + 渲染）', async () => {
    const t0 = performance.now()
    vm.expandAll()
    await nextTick()
    const t1 = performance.now()
    return { ms: t1 - t0 }
  })
  await measure('collapseAll（2041 节点状态 + 渲染）', async () => {
    const t0 = performance.now()
    vm.collapseAll()
    await nextTick()
    const t1 = performance.now()
    return { ms: t1 - t0 }
  })

  // ---- 4. filter ----
  vm.expandAll()
  await nextTick()
  await measure(
    'filter（全量 2000 节点过滤 + 渲染）',
    async () => {
      const t0 = performance.now()
      vm.filter('员工-1')
      await nextTick()
      const t1 = performance.now()
      vm.filter('')
      await nextTick()
      return { ms: t1 - t0, note: '含恢复全显的二次过滤' }
    },
    2
  )

  // ---- 5. 原地 push（deep watch + 脏检查增量更新） ----
  await measure(
    '原地 push 一个节点（deep watch 触发 → 脏检查增量）',
    async () => {
      const t0 = performance.now()
      data[0].children.push({ id: 90000 + Math.random(), label: '新人' })
      await nextTick()
      const t1 = performance.now()
      data[0].children.pop()
      await nextTick()
      return { ms: t1 - t0, note: '含一次 push + 一次 pop' }
    },
    2
  )

  // ---- 6. 非结构变更（深层 label 修改，脏检查跳过重建） ----
  await measure('深层 label 修改（脏检查跳过重建）', async () => {
    const t0 = performance.now()
    data[10].children[10].label = '改名-' + Math.random()
    await nextTick()
    const t1 = performance.now()
    return { ms: t1 - t0 }
  })

  tree.app.unmount()
  document.body.removeChild(tree.el)
}

// ---- 万级（1.16.0 已知边界的记账场景，不设门禁）：1 父 + 10000 平铺子节点 ----
// 两条场景共用同一份数据、同样 defaultExpandAll，唯一差别是 virtual。virtual 把渲染节点
// 从 10001 压到十几个，首帧却只降下面算出的那部分——剩下的全是 store 构建
// （TreeStore 逐节点 new TreeNode + 写注册表），与渲染层无关，virtual 碰不到它。
const FLAT = 10000

/** 1 父 + count 个平铺子节点：virtual 场景的形状（同层兄弟越多，窗口化收益越大） */
function makeFlatData(count) {
  return [
    {
      id: 1,
      label: '根',
      children: Array.from({ length: count }, (_, i) => ({ id: i + 2, label: `节点-${i + 2}` })),
    },
  ]
}

/** 挂一次万级树，返回耗时与渲染节点数（渲染节点数用来先证明窗口化真的生效） */
async function mountFlat(extraProps) {
  const data = reactive(makeFlatData(FLAT))
  const t0 = performance.now()
  const tree = mountTree(data, { nodeKey: 'id', defaultExpandAll: true, ...extraProps })
  tree.mount()
  await nextTick()
  const t1 = performance.now()
  const rendered = tree.el.querySelectorAll('.org-chart-node').length
  tree.app.unmount()
  document.body.removeChild(tree.el)
  return { ms: t1 - t0, note: `渲染 ${rendered} 个节点` }
}

// 一轮：全量渲染在 jsdom 上要十几秒，量级足够，两轮只是把 bench 拖慢一倍
const flatFull = await measure(
  `万级首渲染（1 + ${FLAT} 平铺，virtual: false）`,
  () => mountFlat({}),
  1
)
const flatVirtual = await measure(
  `万级首渲染（同数据，virtual: true，要求数字型 labelWidth）`,
  () => mountFlat({ virtual: true, labelWidth: 120 }),
  2
)
if (flatFull.ms <= flatVirtual.best) {
  throw new Error(
    `万级场景无效：virtual 版（${flatVirtual.ms.toFixed(0)} ms）不比全量版（${flatFull.ms.toFixed(0)} ms）快，` +
      '要么窗口化没生效，要么数据形状不对，别把这张表当结论'
  )
}
console.log(
  `| 万级：DOM 渲染侧成本（上两条之差） | ${fmt(flatFull.ms - flatVirtual.best)} ms | ` +
    `virtual 省掉的只有这么多；余下 ${fmt(flatVirtual.best)} ms 是 store 构建，` +
    '与 virtual / 全量渲染无关 |'
)

console.log('\n> 环境：Node ' + process.version + '，jsdom 模拟 DOM，dist/vue3-okr-tree.es.js。')
console.log('> jsdom 无真实布局/样式，数值仅用于横向对比与回归告警，不代表浏览器真实帧率。')
