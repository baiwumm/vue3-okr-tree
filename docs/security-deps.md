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

本仓没有开 Dependabot 告警（用 Renovate 走 PR 流程），所以漏洞不会自己冒头；`pnpm audit`
是唯一能主动看到的口径。

## 判据

1. **先在范围内升**：`pnpm update -r --depth Infinity` 把整棵树刷到各自声明范围的最新。
   这一步能修掉大部分（undici、nuxt、vite、@intlify/vue-i18n 等），不需要任何 override。
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

## 复查节奏

`pnpm audit` 的口径随上游发布变化。升级依赖时顺手跑一次；只要审计结果非零而 overrides 没覆盖
到，就按上面的判据加一条 override，并在这里登记。
