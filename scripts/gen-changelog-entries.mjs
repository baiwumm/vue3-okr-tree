/**
 * 生成文档站「更新日志」摘要数据：从仓库根 CHANGELOG.md 提取最近 N 个版本的
 * 标题 / 日期 / 首段摘要，写成 docs-site/app/components/content/changelog-entries.data.ts。
 * 产物文件带 DO-NOT-EDIT 头，由 docs:build 自动重新生成，不要手改。
 * 用法：node scripts/gen-changelog-entries.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const COUNT = 5

const raw = readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8')
const lines = raw.split('\n')
// 摘要取自 CHANGELOG 的 Markdown 原文，而 <UChangelogVersion :description> 按纯文本渲染，
// **强调** 与 `代码` 的标记会原样显示在页面上——这里剥掉标记，保留文字。
const stripMd = (s) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1')
const entries = []
for (let i = 0; i < lines.length && entries.length < COUNT; i++) {
  const m = lines[i].match(/^## (\S+?)（([^）]+)）/)
  if (!m) continue
  let summary = ''
  for (let j = i + 1; j < lines.length && j < i + 8; j++) {
    if (lines[j].trim()) {
      summary = lines[j].trim()
      break
    }
  }
  entries.push({ version: m[1], date: m[2], summary: stripMd(summary) })
}
if (!entries.length) {
  console.error('[gen-changelog-entries] 未从 CHANGELOG.md 解析出任何版本条目，请检查格式')
  process.exit(1)
}

const out = resolve(root, 'docs-site/app/components/content/changelog-entries.data.ts')
const banner =
  '// DO-NOT-EDIT：本文件由 `node scripts/gen-changelog-entries.mjs` 从仓库根 CHANGELOG.md 生成（docs:build 会自动重跑），要改请改 CHANGELOG.md 或生成脚本。\n'
const body = `export interface ChangelogEntry {\n  version: string\n  date: string\n  summary: string\n}\n\nexport const changelogEntries: ChangelogEntry[] = ${JSON.stringify(entries, null, 2)}\n`
writeFileSync(out, banner + body)
console.log(`[gen-changelog-entries] ${entries.length} 条版本摘要 → ${out}`)
