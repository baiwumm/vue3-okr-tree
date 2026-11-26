# 依赖安全基线（overrides 判据与取舍）

本文件是 `pnpm-workspace.yaml` 里 `overrides` 段的判据来源：为什么钉这几个包、钉到哪个版本、
哪些风险被有意留着。**活文档**——上游发了新补丁、或某条 override 可以撤掉时，改这里。

## 背景

本仓的依赖有两层：

- **库本体**（`src/`、`tests/`）的依赖极少，运行时 `dependencies` 为空，`peerDependencies` 只有
  `vue` 与可选的 `html-to-image`。
- **文档站**（`docs-site/`，Docus + Nuxt）是一条很深的构建期依赖链，`pnpm-lock.yaml` 里 1500+
  个包大部分来自它。

安全告警几乎全部落在第二条链上：Nuxt 生态的传递依赖（`node-forge`、`undici`、`seroval`、
`@nuxt/nitro-server` 等）与根侧构建工具（`vite`、`vitest`、`api-extractor`、`js-beautify`）。

~~本仓没有开 Dependabot 告警（用 Renovate 走 PR 流程），所以漏洞不会自己冒头；`pnpm audit`
是唯一能主动看到的口径。~~
→ 2026-11-26：已开启 GitHub 的 Dependabot 漏洞告警（`vulnerability-alerts`）。Renovate 继续管
版本升级的 PR，Dependabot 只报「已知漏洞」这一类，两条线职责不同、并存不冲突；`pnpm audit`
仍是本地最直接的口径。

## 判据

1. **先在范围内升**：`pnpm update -r --depth ~~Infinity~~ 99` 把整棵树刷到各自声明范围的最新。
   这一步能修掉大部分（undici、nuxt、vite、@intlify/vue-i18n 等），不需要任何 override。
   （`--depth Infinity` 不是合法参数，pnpm 会直接报参数错误；用足够大的数字代替。）
2. **范围外的用 override**：上游声明的范围本身还停在有漏洞的版本上时，只有 override 能修。
   取「已修复的最低可用版本」，不取最新——最小改动面。
3. **必须能在本仓门禁里验过**：门禁跑不过的 override 不留。
4. **构建期依赖优先于运行时依赖**：本仓没有服务端，文档站的依赖不进任何运行时产物，
   但仍按「已修复就用」的底线处理。

## 当前 overrides

| 包                     | 版本   | 谁在用                                                         | 命中的告警                       | 为什么必须 override                                                                       |
| ---------------------- | ------ | -------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------- |
| `node-forge`           | 1.4.4  | `listhen` → `nitropack`                                        | 21 条（TLS / 证书 / 签名 / DoS） | `listhen` 声明 `^1.4.0`，在范围内但 `pnpm update` 没把深层传递依赖刷到最新，override 钉住 |
| `launch-editor`        | 2.14.2 | `@nuxt/devtools`                                               | 3 条（命令注入 / Windows 绕过）  | 同上；`@nuxt/devtools` 声明 `^2.9.1`，范围内                                              |
| `shell-quote`          | 1.12.0 | `launch-editor`                                                | 1 条 critical（`quote()` 注入）  | 同上；`launch-editor` 声明 `^1.8.1`，范围内                                               |
| `serialize-javascript` | 7.1.4  | `@rollup/plugin-terser` → `nitropack`                          | 1 条（序列化函数体 XSS）         | 范围内                                                                                    |
| `glob`                 | 14.0.6 | `js-beautify`（`@vue/test-utils`）、docus 链                   | 1 条（AbortSignal 取消绕过）     | `js-beautify` 声明 `^13.0.6`，修复版本在 14.x，**范围外**                                 |
| `minimatch`            | 11.0.9 | `@microsoft/api-extractor`、`vite-plugin-dts`、`@nuxt/content` | 1 条（globparts 放大 DoS）       | api-extractor 把版本钉死为 `10.2.3`，**范围外**                                           |
| `simple-git`           | 4.1.0  | `@nuxt/devtools`                                               | 3 条 critical/high（命令执行）   | `@nuxt/devtools` 声明 `^3.27.0`，修复版本在 4.x，**范围外**；只影响开发服务器，不进产物   |
| `zod`                  | 4.6.7  | `@nuxt/content`、docus                                         | 1 条 high（大集合校验内存耗尽）  | `@nuxt/content` 声明 `^3.25.76`，v3 线没有修复版本，**范围外**                            |

已靠范围内升级修掉、**不需要** override 的：`undici`（8.10.2 → 8.13.1）、`nuxt` /
`@nuxt/nitro-server`（4.5.2 → 4.7.0）、`vite`（7.3.6 → 7.3.8）、`@intlify/*` 与 `vue-i18n`
（11.4.12 → 11.4.23）、`seroval`、`hono`、`@hono/node-server`、`fast-uri`、`qs`、`ip-address`、
`body-parser`、`source-map-js`、`sharp`、`zod`（docus 侧 4.6.5 → 4.6.7）。

## 有意留着的风险

- **`@nuxt/devtools` 整条链**（`simple-git`、`launch-editor`、`shell-quote`）：只进开发服务器，
  不进产物也不进部署流水线。override 钉住是因为「已修复就用」，不是因为它在生产路径上。
- **`pnpm peers check` 报的 `unctx` 那两条**：`unctx@3.0.1` 有多个 peer 组合实例，其中一个仍绑在
  旧的 `oxc-parser@0.139.0` / `unplugin@2.3.11` 上。这是 Nuxt 依赖链自身的解析结果，与本仓
  override 无关（改动前就在），不是本仓能单独消掉的。

## 复现口径

```bash
# 审计（本机 registry 是 npmmirror，没有 audit 端点，必须显式指 npm 官方源）
pnpm audit --registry=https://registry.npmjs.org

# 门禁
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test
pnpm build && pnpm verify:dist && pnpm verify:peer-types && pnpm verify:package && pnpm size
pnpm docs:build:full && pnpm verify:seo && pnpm verify:edgeone
```

## GitHub 侧的安全开关

2026-11-26 逐个打开仓库设置里的开关（Security and quality → Overview）：

| 开关                            | 状态                                   | 作用                                        |
| ------------------------------- | -------------------------------------- | ------------------------------------------- |
| Security policy                 | 已开（`SECURITY.md`）                  | 公开漏洞报告的入口与响应约定                |
| Security advisories             | 已开                                   | 仓库自身的 advisory 可见                    |
| Private vulnerability reporting | 已开                                   | 外部用户可私下提交漏洞，不必公开开 issue    |
| Dependabot alerts               | 已开                                   | 依赖出现已知漏洞时告警（只报，不自动开 PR） |
| Code scanning alerts            | 已开（`.github/workflows/codeql.yml`） | CodeQL 对 JS/TS 源码做静态分析              |
| Secret scanning alerts          | 已开                                   | 推送时扫描密钥；push protection 也已开      |

两个刻意的取舍：

- **Dependabot 只开告警、不开 security updates（自动修复 PR）**：仓库的版本升级由 Renovate 走 PR
  流程，两套自动开 PR 会互相打架。告警只读不写，不冲突。
- **CodeQL 用 `build-mode: none`**：本仓是纯 TS/JS 库，没有需要追踪的编译产物，JS/TS 的 CodeQL
  按 AST 分析源码即可，少一层构建就少一处构建期噪声。

```bash
# 看当前状态
gh api repos/baiwumm/vue3-okr-tree --jq '.security_and_analysis'
gh api repos/baiwumm/vue3-okr-tree/private-vulnerability-reporting

# 看告警结果
gh api repos/baiwumm/vue3-okr-tree/dependabot/alerts --jq '.[] | {number,severity:.security_advisory.severity,package:.dependency.package.name,state}'
gh api repos/baiwumm/vue3-okr-tree/code-scanning/alerts --jq '.[] | {number,rule:.rule.id,severity:.rule.security_severity_level,state}'
```

### 首次扫描结果（2026-11-26）

- **Dependabot 告警：0 条。** 与 `pnpm audit` 归零互相印证——漏洞告警不是被压掉了，是真的没有。
- **CodeQL：2 条告警，都在构建脚本里，已修。**

| 告警                                       | 位置                         | 结论                                                                                                                                 |
| ------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `js/incomplete-sanitization`               | `scripts/gen-readme-api.mjs` | 真问题：转义 markdown 表格的 `\|` 时没先转义反斜杠，原文带 `\` 的单元格会被吃掉反斜杠、渲染出多余竖线。改为先转义 `\` 再转义 `\|`。  |
| `js/incomplete-url-substring-sanitization` | `scripts/verify-seo.mjs`     | 真问题：canonical 用 `startsWith(SITE)` 前缀比对，能放过 `https://vue3-okr-tree.baiwumm.com.evil.com/`。改为解析 URL 比对 `origin`。 |

两条都是「脚本本身写得不够严」，不是运行时漏洞——但既然断言脚本的职责就是拦静默回归，
判据松就是缺陷，所以照 CodeQL 的意见改，而不是加抑制注释。

## 复查节奏

`pnpm audit` 的口径随上游发布变化。升级依赖时顺手跑一次；只要审计结果非零而 overrides 没覆盖
到，就按上面的判据加一条 override，并在这里登记。
