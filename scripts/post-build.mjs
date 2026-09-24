/**
 * 构建后处理：为 CJS require 条件生成 dist/index.d.cts。
 *    package.json 声明 "type": "module"，单一 index.d.ts 会被 TS 视为 ESM 声明，
 *    导致 @arethetypeswrong/cli 报 "Masquerading as ESM"（CJS require 解析到 ESM 类型）。
 *    声明内容为纯 `export declare` 语法，.d.cts 与 .d.ts 通用，直接复制即可。
 *
 * 这里**曾经还有一步**「用 esbuild 把 ESM 产物补压缩一次」（因为 Vite lib 多格式构建里
 * es 输出不随 cjs/umd 一起压缩，gzip 高出约 2 kB）。已删除，原因：那道压缩会把
 * `src/lib/okr-tree/viewport.ts` 的三条 `@vite-ignore` / `webpackIgnore` / `turbopackIgnore`
 * 一并删掉，而这三条注释必须活到**发布出去的 ES 产物**里——消费者用 Next 16 的 Turbopack 时
 * 它只认前两家，缺了就变成构建期 "Module not found"（库能发出去但下游装不上）。
 * esbuild 没有任何保住这类注解的开关（实测 `legalComments: 'inline'` 与
 * `keepNames` 都不保留），所以只能不压。姊妹包 react-okr-tree 的 ES 产物同样是未压缩的，
 * 两仓就此对齐。体积由 size-limit 的 ESM 预算守着，注释由 verify:dist 守着。
 * 顺带一条好处：不压缩之后 `dist/vue3-okr-tree.es.js.map` 与产物行号对齐，不再需要删除。
 */
import { copyFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dts = resolve(root, 'dist/index.d.ts')
const dcts = resolve(root, 'dist/index.d.cts')

if (!existsSync(dts)) {
  console.error('[post-build] 缺少 dist/index.d.ts，请先执行 vite build')
  process.exit(1)
}
copyFileSync(dts, dcts)
console.log('[post-build] 已生成 dist/index.d.cts')
