/**
 * 文档站完整构建（Cloudflare 部署用）：
 * 1. 构建库本体 dist（Playground 的 PLAYGROUND_USE_DIST=1 模式依赖 dist 产物）
 * 2. 以 dist 产物模式构建 Playground
 * 3. 构建 Docus 文档站（nuxt generate）
 * 4. 将 Playground 产物合并进文档站输出的 /playground/ 子路径
 * 用法：pnpm docs:build:full；输出目录 docs-site/.output/public（即 Cloudflare 的部署目录）
 * 自包含：干净环境（如 CI 构建机）无需预先手动执行 pnpm build。
 */
import { execSync } from 'node:child_process'
import { cpSync, existsSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const playgroundDist = resolve(root, 'playground/dist')
const docsDist = resolve(root, 'docs-site/.output/public')
const target = resolve(docsDist, 'playground')

const run = (cmd, env) =>
  execSync(cmd, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } })

console.log('[docs:build:full] 1/4 构建库本体（dist）')
run('pnpm build', {})

console.log('[docs:build:full] 2/4 构建 Playground（引用 dist 产物）')
run('pnpm build:playground', { PLAYGROUND_USE_DIST: '1' })

console.log('[docs:build:full] 3/4 构建 Docus 文档站（nuxt generate）')
run('pnpm docs:build', {})

console.log('[docs:build:full] 4/4 合并 Playground 到 /playground/')
if (!existsSync(playgroundDist)) {
  console.error('[docs:build:full] playground/dist 不存在，构建失败')
  process.exit(1)
}
rmSync(target, { force: true, recursive: true })
cpSync(playgroundDist, target, { recursive: true })
console.log(`[docs:build:full] 完成 → ${docsDist}`)
