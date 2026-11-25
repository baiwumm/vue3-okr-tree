#!/usr/bin/env node
/**
 * 文档站 SEO 断言（跑在 `pnpm docs:build:full` 之后，CI 的 docs 作业里）。
 *
 * 为什么要有这个脚本：2026-11 的审计里，两个最贵的缺陷都是「构建成功、站点能打开、
 * 但搜索引擎拿不到东西」的静默回归，肉眼完全看不出来：
 *
 * 1. sitemap.xml 的 <loc> 是相对路径 —— docus 5.13 自带的路由只读 NUXT_SITE_URL
 *    之类的环境变量，不读 nuxt.config 的 site.url，少配一个变量整份 sitemap 就被
 *    GSC 判为无效（20 个页面等于没提交）。docus 5.15 换成了 @nuxtjs/sitemap，已修复，
 *    但升级是不设防的，谁回退一次就再坏一次。
 * 2. `<html lang="en">` —— docus 5.13 拿 `zh-CN` 去查 `@nuxt/ui` 的 locale 表，
 *    而那张表的键是 `zh_cn`，查不到就回退 en。全站中文声明成英文，5.15 用
 *    getLocaleKey() 修掉了，同样是「升级才安全」的那一类。
 *
 * 断言面刻意选「不看内容只看骨架」的几条：标题措辞、正文长短这类会正常演进的东西
 * 一律不在这里拦，避免每次改文案都要动这个脚本。
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const outDir = join(root, 'docs-site/.output/public')
const SITE = 'https://vue3-okr-tree.baiwumm.com'

/** 不参与「每页 lang / h1」检查的产物：错误页与 SPA 回退壳本来就没有页面骨架。 */
const SKIP_FILES = new Set(['404.html', '200.html'])
/** 产物里的技术目录，不是页面。 */
const SKIP_DIRS = new Set([
  '_nuxt',
  '_ipx',
  '_og',
  '_og-static-fonts',
  '__nuxt_content',
  '__sitemap__',
])

const failures = []
const fail = (msg) => failures.push(msg)

if (!existsSync(outDir)) {
  console.error(`[verify:seo] 找不到构建产物：${outDir}\n先跑 pnpm docs:build:full`)
  process.exit(2)
}

/** 收集所有 HTML 页面（含 `x/index.html` 形态，它们同样会被托管出去）。 */
function collectHtml(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) out.push(...collectHtml(full))
    } else if (entry.name.endsWith('.html')) {
      out.push(full)
    }
  }
  return out
}

// 1. sitemap：必须是绝对 URL。协议要求 <loc> 带 scheme + host，相对路径整份 sitemap 作废。
const sitemapPath = join(outDir, 'sitemap.xml')
if (!existsSync(sitemapPath)) {
  fail('sitemap.xml 不存在')
} else {
  const sitemap = readFileSync(sitemapPath, 'utf8')
  const locs = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1])
  if (locs.length < 15) fail(`sitemap 只有 ${locs.length} 条 <loc>，疑似漏页`)
  const bad = locs.filter((loc) => !loc.startsWith(`${SITE}/`) && loc !== SITE)
  if (bad.length) {
    fail(`sitemap 有 ${bad.length} 条 <loc> 不是 ${SITE} 的绝对 URL：${bad.slice(0, 3).join(', ')}`)
  }
}

// 2. robots.txt：必须把 sitemap 指到绝对地址，否则爬虫找不到它。
const robotsPath = join(outDir, 'robots.txt')
if (!existsSync(robotsPath)) {
  fail('robots.txt 不存在')
} else {
  const robots = readFileSync(robotsPath, 'utf8')
  if (!robots.includes(`Sitemap: ${SITE}/sitemap.xml`)) fail('robots.txt 缺少绝对 Sitemap 声明')
  // 通配放行是 docus 的默认；若有人给它加了 Disallow，AI 抓取与收录会一起断。
  if (/^Disallow:\s*\/$/m.test(robots)) fail('robots.txt 出现了 Disallow: /')
}

// 3. 每页：html lang 必须是 zh-CN，且全页只有一个 h1。
const pages = collectHtml(outDir)
let checked = 0
for (const file of pages) {
  const rel = relative(outDir, file).replace(/\\/g, '/')
  if (SKIP_FILES.has(rel)) continue
  // playground 是 Vite 客户端壳，静态 HTML 里没有页面骨架（它有单独的 noindex 断言）。
  if (rel.startsWith('playground/')) continue

  const html = readFileSync(file, 'utf8')
  const htmlTag = html.match(/<html[^>]*>/)?.[0] ?? ''
  if (!/lang="zh-CN"/.test(htmlTag)) {
    fail(`${rel}: <html> 缺少 lang="zh-CN"（实际：${htmlTag || '无 <html> 标签'}）`)
  }
  const h1 = html.match(/<h1[\s>]/g)?.length ?? 0
  if (h1 !== 1) fail(`${rel}: h1 数量为 ${h1}，应为 1`)
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1]
  if (!canonical) fail(`${rel}: 缺少 canonical`)
  else if (!canonical.startsWith(SITE)) fail(`${rel}: canonical 不是绝对地址（${canonical}）`)
  checked += 1
}
if (!checked) fail('没有扫到任何页面 HTML，产物目录结构可能变了')

// 4. 站长平台验证 meta：删掉就等于在两个后台掉线，且不会有任何报错。
const home = readFileSync(join(outDir, 'index.html'), 'utf8')
for (const [name, content] of [
  ['google-site-verification', '4YBtBTmg5H9MGoyvCmvEeJx8viyBPjLnK4INCHT9SQs'],
  ['msvalidate.01', '6DEA985B20CA4A215DAC4EA659011A8A'],
]) {
  if (!home.includes(`name="${name}"`) || !home.includes(content)) {
    fail(`首页缺少 ${name} 验证 meta（或值被改动）`)
  }
}

// 5. Playground：客户端渲染的空壳不该进索引。
const playgroundIndex = join(outDir, 'playground/index.html')
if (existsSync(playgroundIndex)) {
  const pg = readFileSync(playgroundIndex, 'utf8')
  if (!/name="robots" content="noindex/.test(pg)) fail('playground/index.html 缺少 noindex')
}

// 6. favicon.ico：docus 默认会引用它，文件缺了就变成一次软 404。
if (!existsSync(join(outDir, 'favicon.ico'))) fail('favicon.ico 未进产物（public/ 里缺文件）')

if (failures.length) {
  console.error(`[verify:seo] ${failures.length} 项未通过：`)
  for (const f of failures) console.error(`  ✕ ${f}`)
  process.exit(1)
}

const size = (p) => statSync(join(outDir, p)).size
console.log(
  `[verify:seo] 通过：${checked} 个页面（lang / h1 / canonical）、sitemap 绝对 URL、robots 指向、验证 meta、playground noindex、favicon（${size('favicon.ico')} B）`
)
