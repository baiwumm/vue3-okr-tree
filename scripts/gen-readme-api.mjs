/**
 * 从 shared/api.ts（API 单一来源）生成 README 的 API 段落——只生成**分组概览**
 * （分组 / 条数 / 成员名清单），完整表格由文档站 API 页渲染同一份数据。
 * README 承载概览即可，逐条说明放在文档站，避免同一份内容两处维护篇幅。
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
/** 概览里的「完整表格」链接指向线上文档站（与 README 顶部的文档站链接同源） */
const API_DOC_URL = 'https://vue3-okr-tree.baiwumm.com/api/'

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

/** 成员名单元格 → 概览里统一的内联代码写法（剥掉数据里已有的反引号避免重复包裹） */
function toName(cell) {
  return toMarkdown(cell)
    .replace(/`/g, '')
    .replace(/（(?:prop|slot|method)）/g, '')
    .trim()
}

const parts = [
  '## API',
  [
    '完整表格（每个参数的说明、类型与默认值）见 **[文档站 API 页](' +
      API_DOC_URL +
      ')**，Playground 的 API 页与下面这份概览读的都是同一份 [`shared/api.ts`](https://github.com/baiwumm/vue3-okr-tree/blob/main/shared/api.ts)——条数由脚本统计，表与实现的偏差不超过一条用例（`tests/api-surface.spec.ts`）。',
  ].join('\n'),
  apiSections
    .map(
      (section) =>
        `- **${section.title}**（${section.rows.length} 条）：` +
        section.rows.map((row) => `\`${toName(row[0])}\``).join(' / ')
    )
    .join('\n'),
]

// 标记前后各留一个空行：与 Prettier 对 markdown 的规范形态一致，
// 否则 pnpm gen:readme 之后再跑 format:check（CI 里有一步）会报未格式化。
const generated = `${BEGIN}\n\n${parts.join('\n\n')}\n\n${END}`
const readme = readFileSync(readmePath, 'utf8')
const start = readme.indexOf(BEGIN)
const end = readme.indexOf(END)
if (start === -1 || end === -1) {
  console.error('[gen:readme] README 缺少 API-DOC 标记段落')
  process.exit(1)
}
writeFileSync(readmePath, readme.slice(0, start) + generated + readme.slice(end + END.length))
console.log(
  `[gen:readme] README API 概览已生成（${apiSections.length} 组 / ${apiSections.reduce(
    (n, s) => n + s.rows.length,
    0
  )} 条）`
)
