# 发布操作手册（release-guide）

> vue3-okr-tree 首发与后续版本的完整操作步骤。写给维护者本人照着执行。
> 当前状态（2026-09-18）：1.6.0 已在本地 main 就绪，**npm 从未发布过此包**；
> npm 账号 `baiwumm` 因使用恢复码登录被临时冻结 72 小时，**2026-09-21 14:22（北京时间，UTC 06:22）自动解封**——冻结期间只读（不能发包 / 建 token / 改设置），解封前先做不依赖 npm 的步骤。

---

## 步骤总览

| #   | 步骤                                      | 依赖 npm 解封？                                    |
| --- | ----------------------------------------- | -------------------------------------------------- |
| 1   | 推送仓库到 GitHub                         | ❌ 现在就能做                                      |
| 2   | Cloudflare 绑定 + 部署文档站 + 配置域名   | ❌ 现在就能做                                      |
| 3   | 手动首发 npm 包 1.6.0                     | ✅ 需解封                                          |
| 4   | 创建 Granular Token → 配置 GitHub Secrets | ✅ 需解封                                          |
| 5   | npm 包页面关联 GitHub 仓库                | ✅ 需解封                                          |
| 6   | 确认 CI workflow 通过                     | ❌（push 后自动跑）                                |
| 7   | 发布后验证                                | ✅（安装包需要登录态？不需要，安装公开包无需登录） |

---

## 1. 推送仓库

```bash
git push origin main        # 首次推送全部本地提交
```

推送后 GitHub Actions 会自动跑两条 workflow：**CI**（lint/typecheck/test/build/verify-dist/包体检/size-limit）与 **Visual Regression**（视觉快照 + 浏览器性能）。都应绿灯；红灯先修再继续。

## 2. Cloudflare 文档站（域名：vue3-okr-tree.baiwumm.com）

按 Cloudflare「Workers 构建」向导（你已建到一半的项目 `vue3-okr-tree`）：

| 配置项           | 值                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| 构建命令         | `npm i -g pnpm@11 && pnpm install --frozen-lockfile && pnpm docs:build:full`                   |
| 部署命令         | `npx wrangler deploy`                                                                          |
| 非生产分支也构建 | 建议取消勾选                                                                                   |
| 变量和机密       | `NODE_VERSION=22`（若构建日志显示 Node 版本已 ≥ 20.19 可不加；仓库根目录已有 `.node-version`） |

配置保存并触发部署，确认 `*.workers.dev` 地址能打开文档站与 `/playground/`。

**绑定自定义域名**：该 Worker 的 设置 → 域与路由 → 添加自定义域 `vue3-okr-tree.baiwumm.com`（要求 `baiwumm.com` 的 DNS 托管在同一个 Cloudflare 账号下，CF 会自动加 CNAME 记录）。生效后验证：

- https://vue3-okr-tree.baiwumm.com/ → 文档站首页
- https://vue3-okr-tree.baiwumm.com/playground/ → Playground
- 随便点一篇文档、切一次主题，控制台无报错

> 仓库里 `wrangler.jsonc` 已配置静态资产与 404 处理；README 中的文档站链接已写死该域名。

## 3. 手动首发 npm 包 1.6.0（解封后）

```bash
# 仓库根目录（确认 git 状态干净、与远端一致）
pnpm build              # 生成 dist（含 index.d.cts 后处理）
pnpm verify:package     # publint + attw 体检，应输出 No problems found
npm login               # 若本地登录态还在可跳过
npm publish             # 会提示输入 2FA 验证码；access: public 已在 package.json 配好
```

验证：https://www.npmjs.com/package/vue3-okr-tree 出现 **1.6.0**；随便找个目录 `npm i vue3-okr-tree` 能装上。

> 注意：手动发的 1.6.0 不带 provenance 标志（只有 CI 发布能生成），从下一版本起走自动发布即有。

## 4. 创建 Token → 配置 GitHub Secrets

npmjs.com → 头像 → Access Tokens → Generate New Token → **Granular Access Token**：

| 字段                                   | 值                                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| Token name                             | `github-actions-vue3-okr-tree`                                                            |
| Bypass two-factor authentication (2FA) | ✅ 勾选（CI 无法交互式 2FA）                                                              |
| Allowed IP ranges                      | 留空                                                                                      |
| Packages and scopes → Permissions      | **Read and write (publish and stage)**；此时包已存在，**只勾选 `vue3-okr-tree` 这一个包** |
| Organizations                          | No access                                                                                 |
| Expiration Date                        | No expiration 或最长可选（泄露可随时撤销）                                                |

生成后立即复制（只显示一次），到 GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret：**Name 填 `NPM_TOKEN`**，Value 粘贴。

## 5. npm 包页面关联仓库

npmjs.com 包页面 → Settings：确认 Repository 链接指向 `github:baiwumm/vue3-okr-tree`（来自 package.json，一般自动带出）；有条件时把 **Trusted Publisher** 配置为仓库 `baiwumm/vue3-okr-tree` + workflow 文件 `release.yml`——这是 npm 的新方向，配置后未来可完全摆脱 token（release.yml 已带 `id-token: write` 与 `--provenance`，天然兼容）。

## 6. 发布后验证

```bash
# 任意临时目录
mkdir smoke && cd smoke && npm init -y
npm i vue3-okr-tree
node -e "const l=require('vue3-okr-tree'); console.log(typeof l.VueOkrTree)"   # object
```

再加一条 ESM 检查：`node --input-type=module -e "import('vue3-okr-tree').then(m=>console.log(typeof m.VueOkrTree))"`。页面确认 npm 徽章、README 渲染、1.6.0 版本号。

## 7. 后续版本发布（全自动流程）

1. 改代码 → 更新 `package.json` 的 `version` + `CHANGELOG.md` → 提交（版本规则：新功能 +1 minor，修复 +1 patch）；
2. `git tag vx.y.z && git push origin vx.y.z`；
3. release.yml 自动执行：校验 tag 与版本一致 → lint/typecheck/test → build + verify:dist + publint/attw + size-limit → `npm publish --provenance` → 创建 GitHub Release；
4. 任何一步失败都不会发包，去 Actions 看日志定位。

### 常见问题

| 现象                              | 原因 / 处理                                                |
| --------------------------------- | ---------------------------------------------------------- |
| publish 步骤报 `EPUBLISHCONFLICT` | 该版本号已发过（npm 不允许重复版本号）——把版本号提新再 tag |
| publish 步骤 401/403              | NPM_TOKEN 失效 / 没勾 Bypass 2FA / 权限没选 Read and write |
| tag 校验失败                      | git tag 与 package.json version 不一致，改对后再 tag       |
| Token 过期导致 CI 失败            | 撤销旧 token、生成新的、更新 GitHub Secrets                |

---

## 状态记录

- [x] 域名确定：vue3-okr-tree.baiwumm.com（README / package.json homepage 已写入）
- [x] 推送仓库（`main` 与 `origin/main` 已同步至 `cb38701`）
- [x] Cloudflare 部署 + 域名绑定（`https://vue3-okr-tree.baiwumm.com/` 与 `/playground/`、`/api/`、`/theme/`、`/guide/*` 均 200；Workers Builds 在 `cb38701` success）
- [x] CI 红灯根因修复（2026-09-18）：`ci.yml` 矩阵 Node 20 → 22/24（pnpm 11 需 `node:sqlite`，Node ≥ 22.5）、加 `fail-fast: false`；`visual.yml` runner 固定 `ubuntu-24.04`（`ubuntu-latest` 2026-10-19 迁移 Ubuntu 26 会使基线集体失配）；新增 `snapshot-bootstrap.yml`
- [ ] Linux 视觉基线提交：Actions 手动跑一次 **Snapshot Bootstrap** → 下载 `linux-snapshots` artifact → 仓库根目录 `tar -xzf linux-snapshots.tgz` → 提交 `*-chromium-linux.png`，Visual Regression 即转绿
- [ ] npm 首发手动 1.6.0（等 2026-09-21 解封）
- [ ] NPM_TOKEN 配置
- [ ] 发布后验证
