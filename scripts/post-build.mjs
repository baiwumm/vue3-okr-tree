/**
 * 构建后处理：为 CJS require 条件生成 dist/index.d.cts。
 *    package.json 声明 "type": "module"，单一 index.d.ts 会被 TS 视为 ESM 声明，
 *    导致 @arethetypeswrong/cli 报 "Masquerading as ESM"（CJS require 解析到 ESM 类型）。
 *    声明内容为纯 `export declare` 语法，.d.cts 与 .d.ts 通用，直接复制即可。
 *
 * 这里**曾经还有一步**「用 esbuild 把 ESM 产物补压缩一次」（因为 Vite lib 多格式构建里
 * es 输出不随 cjs/umd 一起压缩）。已删除，原因：那道压缩会把
 * `src/lib/okr-tree/viewport.ts` 的三条 `@vite-ignore` / `webpackIgnore` / `turbopackIgnore`
 * 一并删掉，而这三条注释必须活到**发布出去的产物**里——消费者用 Next 16 的 Turbopack 时
 * 只认 `webpackIgnore` / `turbopackIgnore`，缺了就变成构建期 "Module not found"
 * （库能发出去但下游装不上）。
 * 删掉它不等于放弃压缩：`vite.config.ts` 改用 Terser + `format.comments` 白名单，三种产物
 * 都保住注解，ESM gzip 反而比原 esbuild 版更小（16.77 → 16.12 kB）。esbuild 侧试过四档都
 * 保不住——单开 minifyWhitespace、`legalComments: 'inline'`、把注释写成 legal 形态、全量压缩，
 * 注解全部被丢，所以换压缩器是唯一解。姊妹包 react-okr-tree 同批做了同形改动。
 * 体积由 size-limit 守，注释由 verify:dist 守。顺带一条好处：不再事后改产物，
 * `dist/vue3-okr-tree.es.js.map` 与产物行号保持对齐，不用再删。
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
