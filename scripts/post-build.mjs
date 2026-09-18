/**
 * 构建后处理：
 * 1. 为 CJS require 条件生成 dist/index.d.cts。
 *    package.json 声明 "type": "module"，单一 index.d.ts 会被 TS 视为 ESM 声明，
 *    导致 @arethetypeswrong/cli 报 "Masquerading as ESM"（CJS require 解析到 ESM 类型）。
 *    声明内容为纯 `export declare` 语法，.d.cts 与 .d.ts 通用，直接复制即可。
 * 2. 压缩 ESM 产物。Vite lib 多格式构建中 es 输出不经过 esbuild 压缩
 *    （cjs/umd 正常压缩，es 带完整缩进与换行，gzip 体积高出约 40%），
 *    用构建链内置的 esbuild 补一次压缩，使三种格式体积同量级。
 */
import { copyFileSync, existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { transformWithEsbuild } from 'vite'
import { gzipSync } from 'node:zlib'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dts = resolve(root, 'dist/index.d.ts')
const dcts = resolve(root, 'dist/index.d.cts')

if (!existsSync(dts)) {
  console.error('[post-build] 缺少 dist/index.d.ts，请先执行 vite build')
  process.exit(1)
}
copyFileSync(dts, dcts)
console.log('[post-build] 已生成 dist/index.d.cts')

const esFile = resolve(root, 'dist/vue3-okr-tree.es.js')
if (existsSync(esFile)) {
  const before = statSync(esFile).size
  const result = await transformWithEsbuild(readFileSync(esFile, 'utf8'), esFile, {
    minify: true,
    target: 'es2018',
    sourcemap: false,
  })
  writeFileSync(esFile, result.code)
  // 压缩后与构建期 sourcemap 错位（esbuild transform 无法串联既有 map），删除过期 map
  const esMap = `${esFile}.map`
  if (existsSync(esMap)) rmSync(esMap)
  const after = statSync(esFile).size
  const gzip = gzipSync(result.code).length
  const kb = (n) => `${(n / 1024).toFixed(2)} kB`
  console.log(
    `[post-build] 已压缩 dist/vue3-okr-tree.es.js：${kb(before)} → ${kb(after)}（gzip ${kb(gzip)}），已移除错位的 es.js.map`
  )
}
