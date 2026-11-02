/**
 * 钉住 EdgeOne 的框架识别前提。
 *
 * EdgeOne 构建机会按根 package.json 的 (dev)Dependencies 重新识别框架（控制台选的框架预设
 * 不参与这一步），命中 nuxt / next 时跳过「把输出目录搬进上传暂存区」那步、改等框架自己的
 * 原生暂存——自定义构建命令不会触发它，于是部署产物列表为空，而构建仍显示成功。这个回归只在
 * 生产环境暴露，本地和构建日志都看不出来，所以放在 CI 里拦。
 *
 * 文档站工具链的依赖请加到 docs-site/package.json（workspace 成员 vue3-okr-tree-docs）。
 * 用法：pnpm verify:edgeone
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = readFileSync(resolve(root, 'package.json'), 'utf8')

// 正则与 edgeone CLI 的框架识别规则保持一致（matchPackage 展开后的形态）
const detected = ['nuxt', 'nuxt3', 'nuxt-edge', 'next'].filter((name) =>
  new RegExp('"(dev)?(d|D)ependencies":\\s*{[^}]*"' + name + '":\\s*"(.+?)"[^}]*}').test(pkg)
)

if (detected.length > 0) {
  console.error(
    `[verify:edgeone] 根 package.json 的依赖里出现了 ${detected.join(' / ')}，` +
      'EdgeOne 构建机会跳过输出目录搬运、部署产物为空。文档站工具链依赖请加到 docs-site/package.json。'
  )
  process.exit(1)
}
console.log('[verify:edgeone] 根 package.json 不含 nuxt / next，EdgeOne 可正常采集输出目录')
