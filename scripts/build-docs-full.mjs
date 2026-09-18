/**
 * 文档站完整构建（roadmap 1.5.0 #3，Cloudflare 部署用）：
 * 1. 以 dist 产物模式构建 Playground（PLAYGROUND_USE_DIST=1）
 * 2. 构建 VitePress 文档站
 * 3. 将 Playground 产物合并进文档站输出的 /playground/ 子路径
 * 用法：pnpm docs:build:full；输出目录 docs-site/.vitepress/dist（即 Cloudflare 的部署目录）
 */
import { execSync } from 'node:child_process'
import { cpSync, existsSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const playgroundDist = resolve(root, 'playground/dist')
const docsDist = resolve(root, 'docs-site/.vitepress/dist')
const target = resolve(docsDist, 'playground')

const run = (cmd, env) =>
  execSync(cmd, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } })

console.log('[docs:build:full] 1/3 构建 Playground（引用 dist 产物）')
run('pnpm build:playground', { PLAYGROUND_USE_DIST: '1' })

console.log('[docs:build:full] 2/3 构建 VitePress 文档站')
run('pnpm docs:build', {})

console.log('[docs:build:full] 3/3 合并 Playground 到 /playground/')
if (!existsSync(playgroundDist)) {
  console.error('[docs:build:full] playground/dist 不存在，构建失败')
  process.exit(1)
}
rmSync(target, { force: true, recursive: true })
cpSync(playgroundDist, target, { recursive: true })
console.log(`[docs:build:full] 完成 → ${docsDist}`)
