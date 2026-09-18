/**
 * 从 shared/api.ts（API 单一来源）生成 README 的 API 段落。
 * 用法：pnpm gen:readme（Node 24 原生 type-stripping 直接导入 .ts）
 * README 中以 <!-- API-DOC-BEGIN --> / <!-- API-DOC-END --> 标记该段落。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { apiSections } from '../shared/api.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readmePath = resolve(root, 'README.md')
const BEGIN = '<!-- API-DOC-BEGIN（本段由 pnpm gen:readme 从 shared/api.ts 生成，勿手改） -->'
const END = '<!-- API-DOC-END -->'

/** HTML 片段转 markdown 行内格式 */
function toMarkdown(cell) {
  return String(cell)
    .replace(/<code>/g, '`')
    .replace(/<\/code>/g, '`')
    .replace(/<strong>/g, '**')
    .replace(/<\/strong>/g, '**')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ')
}

function renderTable(section, columnIdx) {
  const header = columnIdx.map((i) => section.columns[i]).filter(Boolean)
  const lines = [`| ${header.join(' | ')} |`, `| ${header.map(() => '---').join(' | ')} |`]
  for (const row of section.rows) {
    const cells = columnIdx.map((i) => toMarkdown(row[i] ?? '—'))
    lines.push(`| ${cells.join(' | ')} |`)
  }
  return lines.join('\n')
}

const parts = ['## API']

for (const section of apiSections) {
  parts.push(`### ${section.title}`)
  if (section.intro) parts.push(toMarkdown(section.intro))
  // Attributes 表 5 列 → README 用 参数/说明/类型/默认值（可选值并入类型列）
  if (section.columns.length === 5) {
    const merged = {
      ...section,
      columns: ['参数', '说明', '类型', '默认值'],
      rows: section.rows.map(([name, desc, type, values, dft]) => [
        name,
        desc,
        values && values !== '—' ? `${type}（可选值：${values}）` : type,
        dft,
      ]),
    }
    parts.push(renderTable(merged, [0, 1, 2, 3]))
  } else {
    parts.push(
      renderTable(
        section,
        section.columns.map((_, i) => i)
      )
    )
  }
}

const generated = `${BEGIN}\n${parts.join('\n\n')}\n\n${END}`
const readme = readFileSync(readmePath, 'utf8')
const start = readme.indexOf(BEGIN)
const end = readme.indexOf(END)
if (start === -1 || end === -1) {
  console.error('[gen:readme] README 缺少 API-DOC 标记段落')
  process.exit(1)
}
writeFileSync(readmePath, readme.slice(0, start) + generated + readme.slice(end + END.length))
console.log('[gen:readme] README API 段落已从 shared/api.ts 重新生成')
