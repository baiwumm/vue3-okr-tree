/**
 * 文档站完整构建（腾讯云 EdgeOne 部署用）：
 * 1. 构建库本体 dist（Playground 的 PLAYGROUND_USE_DIST=1 模式依赖 dist 产物）
 * 2. 以 dist 产物模式构建 Playground
 * 3. 构建 Docus 文档站（nuxt generate）
 * 4. 将 Playground 产物合并进文档站输出的 /playground/ 子路径
 * 5. 将 `.output/public` 复制到仓库根目录 `out/`，供 EdgeOne 采集构建产物
 * 用法：pnpm docs:build:full；EdgeOne 输出目录填 out
 * 自包含：干净环境（如 CI 构建机）无需预先手动执行 pnpm build。
 */
import { execSync } from 'node:child_process'
import { cpSync, existsSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const playgroundDist = resolve(root, 'playground/dist')
const docsDist = resolve(root, 'docs-site/.output/public')
const edgeOut = resolve(root, 'out')
const target = resolve(docsDist, 'playground')

const run = (cmd, env) =>
  execSync(cmd, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } })

console.log('[docs:build:full] 1/5 构建库本体（dist）')
run('pnpm build', {})

console.log('[docs:build:full] 2/5 构建 Playground（引用 dist 产物）')
run('pnpm build:playground', { PLAYGROUND_USE_DIST: '1' })

console.log('[docs:build:full] 3/5 构建 Docus 文档站（nuxt generate）')
run('pnpm docs:build', {})

console.log('[docs:build:full] 4/5 合并 Playground 到 /playground/')
if (!existsSync(playgroundDist)) {
  console.error('[docs:build:full] playground/dist 不存在，构建失败')
  process.exit(1)
}
rmSync(target, { force: true, recursive: true })
cpSync(playgroundDist, target, { recursive: true })

console.log('[docs:build:full] 5/5 复制到仓库根目录 out/（EdgeOne 采集用）')
if (!existsSync(docsDist)) {
  console.error('[docs:build:full] docs-site/.output/public 不存在，构建失败')
  process.exit(1)
}
rmSync(edgeOut, { force: true, recursive: true })
cpSync(docsDist, edgeOut, { recursive: true })
console.log(`[docs:build:full] 完成 → ${edgeOut}（源：${docsDist}）`)
