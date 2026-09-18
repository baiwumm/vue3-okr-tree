/**
 * 构建后处理：为 CJS require 条件生成 dist/index.d.cts。
 * package.json 声明 "type": "module"，单一 index.d.ts 会被 TS 视为 ESM 声明，
 * 导致 @arethetypeswrong/cli 报 "Masquerading as ESM"（CJS require 解析到 ESM 类型）。
 * 声明内容为纯 `export declare` 语法，.d.cts 与 .d.ts 通用，直接复制即可。
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
