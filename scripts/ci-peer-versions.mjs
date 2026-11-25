/**
 * peer-matrix 腿的版本钉子（CI 与本地共用）。
 *
 * 为什么不用 package.json 的 "pnpm" 字段：pnpm 11 起 settings 从 package.json 迁到了
 * pnpm-workspace.yaml，写在 package.json 的 pnpm.overrides 会被**静默忽略**（安装时只打一条
 * WARN），那条腿就等于在下限之外的版本上跑了一遍——「Assert resolved versions」当时只打印
 * 不断言，所以这种失效不会让 CI 变红，只能靠人看出来。这里改成写 workspace 文件，
 * 并在装完之后真正断言一次。
 *
 * 用法：
 *   node scripts/ci-peer-versions.mjs pin <vue版本> <@vue/test-utils版本>
 *   node scripts/ci-peer-versions.mjs check <vue版本>
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workspaceFile = path.join(root, 'pnpm-workspace.yaml')

const [mode, ...args] = process.argv.slice(2)

function readWorkspace() {
  return fs.readFileSync(workspaceFile, 'utf8')
}

/** 在 pnpm-workspace.yaml 的 overrides 段里塞两条 pin；段不存在就直接失败，不静默跳过。 */
function pin(vueVersion, testUtilsVersion) {
  const src = readWorkspace()
  const marker = '\noverrides:'
  const at = src.indexOf(marker)
  if (at < 0) {
    throw new Error(
      'pnpm-workspace.yaml 里没有 overrides 段，无法写入 peer 下限的 pin（pnpm 11 只读这个位置）。'
    )
  }
  const insert = `  vue: ${JSON.stringify(vueVersion)}\n  ${JSON.stringify('@vue/test-utils')}: ${JSON.stringify(testUtilsVersion)}\n`
  // 插在 overrides: 这一行之后、该块其余条目之前——插到它前面会落进上一个 YAML 块
  // （本仓上一块是 minimumReleaseAgeExclude），pnpm 会解析失败或忽略。
  const lineEnd = src.indexOf('\n', at + 1)
  fs.writeFileSync(workspaceFile, src.slice(0, lineEnd + 1) + insert + src.slice(lineEnd + 1))
  console.log(
    `[ci-peer-versions] 已写入 pin：vue ${vueVersion} · @vue/test-utils ${testUtilsVersion}`
  )
}

/** 断言实际解析到的 vue 版本就是这一腿要的版本——pin 没生效时立刻红，而不是静默跑错版本。 */
function check(vueVersion) {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(root, 'node_modules', 'vue', 'package.json'), 'utf8')
  )
  const resolved = pkg.version
  console.log(`[ci-peer-versions] 实际解析：vue ${resolved}`)
  if (resolved !== vueVersion) {
    console.error(
      `[ci-peer-versions] vue 应解析到 ${vueVersion}，实际 ${resolved}——pin 没生效，这条腿等于白跑。`
    )
    process.exit(1)
  }
}

if (mode === 'pin') {
  const [vueVersion, testUtilsVersion] = args
  if (!vueVersion || !testUtilsVersion) {
    console.error('用法：node scripts/ci-peer-versions.mjs pin <vue版本> <@vue/test-utils版本>')
    process.exit(2)
  }
  pin(vueVersion, testUtilsVersion)
} else if (mode === 'check') {
  const [vueVersion] = args
  if (!vueVersion) {
    console.error('用法：node scripts/ci-peer-versions.mjs check <vue版本>')
    process.exit(2)
  }
  check(vueVersion)
} else {
  console.error('用法：node scripts/ci-peer-versions.mjs pin|check ...')
  process.exit(2)
}
