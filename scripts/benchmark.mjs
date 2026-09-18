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

console.log('\n> 环境：Node ' + process.version + '，jsdom 模拟 DOM，dist/vue3-okr-tree.es.js。')
console.log('> jsdom 无真实布局/样式，数值仅用于横向对比与回归告警，不代表浏览器真实帧率。')
