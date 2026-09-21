# 发布操作手册（release-guide）

> vue3-okr-tree 首发与后续版本的完整操作步骤。写给维护者本人照着执行。
> 当前状态（2026-09-19）：**1.13.0** 已在 `origin/main`（`cd2b7e5`）就绪，CI 7 项全绿；1.6.0–1.13.0 从未发布过，
> 首个上线版本即 **1.13.0**（发包前请以 `node -p "require('./package.json').version"` 复核，不要照抄本文任何版本号），
> **npm 从未发布过此包**；npm 账号 `baiwumm` 因使用恢复码登录被临时冻结 72 小时，
> **2026-09-21 14:22（北京时间，UTC 06:22）自动解封**——冻结期间只读（不能发包 / 建 token / 改设置），解封前先做不依赖 npm 的步骤。

---

## 步骤总览

| #   | 步骤                                          | 依赖 npm 解封？                                    |
| --- | --------------------------------------------- | -------------------------------------------------- |
| 1   | 推送仓库到 GitHub                             | ❌ 现在就能做                                      |
| 2   | Cloudflare 绑定 + 部署文档站 + 配置域名       | ❌ 现在就能做                                      |
| 3   | 手动首发 npm 包（版本号见 `package.json`）    | ✅ 需解封                                          |
| 4   | 包设置登记 Trusted Publisher（免 token 发布） | ✅ 需解封                                          |
| 5   | npm 包页面关联 GitHub 仓库                    | ✅ 需解封                                          |
| 6   | 确认 CI workflow 通过                         | ❌（push 后自动跑）                                |
| 7   | 发布后验证                                    | ✅（安装包需要登录态？不需要，安装公开包无需登录） |

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

## 3. 手动首发 npm 包（解封后）

```bash
# 仓库根目录（确认 git 状态干净、与远端一致）
node -p "require('./package.json').version"   # 核对要发的版本号（当前 1.13.0）
pnpm build              # 生成 dist（含 index.d.cts 后处理）
pnpm verify:package     # publint + attw 体检，应输出 No problems found
npm login               # 若本地登录态还在可跳过
npm publish             # 会提示输入 2FA 验证码；access: public 已在 package.json 配好
```

验证：https://www.npmjs.com/package/vue3-okr-tree 出现该版本号；随便找个目录 `npm i vue3-okr-tree` 能装上。

> 注意：手动发的首版不带 provenance 标志（只有 CI 发布能生成），从下一版本起走自动发布即有。

## 4. 包设置登记 Trusted Publisher（免 token 发布）

npm 已宣布 **2027-01 起 granular token 不能再直接发包**，自动发布统一走 Trusted Publishing（OIDC）：GitHub Actions 出短时 OIDC 凭证，npm 核对包设置里登记的仓库与 workflow 后放行——全程不需要任何 token，也没有 GitHub Secrets 可配。

npmjs.com → 包页面 → Settings → **Trusted Publisher**，两个包各登记一次：

| 字段                | vue3-okr-tree                            | react-okr-tree           |
| ------------------- | ---------------------------------------- | ------------------------ |
| Repository          | `baiwumm/vue3-okr-tree`                  | `baiwumm/react-okr-tree` |
| Workflow filename   | `release.yml`                            | `release.yml`            |
| Environment（可选） | 留空（workflow 未用 GitHub environment） | 留空                     |

工作流里已带 `permissions.id-token: write` 与 `--provenance`，发布步自动走 OIDC。此前如已创建过 `NPM_TOKEN` secret / granular token，可直接删除并 revoke。

> 已知限制：OIDC **不能发包的首版**——两包 1.13.0 均已手动首发，此限制对后续版本无感。CI 的 npm 需 ≥ 11.5.1，release.yml 内已有显式升级步。

## 5. npm 包页面关联仓库

npmjs.com 包页面 → Settings：确认 Repository 链接指向 `github:baiwumm/vue3-okr-tree`（来自 package.json，一般自动带出）。

## 6. 发布后验证

```bash
# 任意临时目录
mkdir smoke && cd smoke && npm init -y
npm i vue3-okr-tree
node -e "const l=require('vue3-okr-tree'); console.log(typeof l.VueOkrTree)"   # object
```

再加一条 ESM 检查：`node --input-type=module -e "import('vue3-okr-tree').then(m=>console.log(typeof m.VueOkrTree))"`。页面确认 npm 徽章、README 渲染、版本号与 `package.json` 一致。

## 7. 后续版本发布（全自动流程）

1. 改代码 → 更新 `package.json` 的 `version` + `CHANGELOG.md` → 提交（版本规则：新功能 +1 minor，修复 +1 patch）；
2. `git tag vx.y.z && git push origin vx.y.z`；
3. release.yml 自动执行：校验 tag 与版本一致 → lint/typecheck/test → build + verify:dist + publint/attw + size-limit → `npm publish --provenance` → 创建 GitHub Release；
4. 任何一步失败都不会发包，去 Actions 看日志定位。

### 常见问题

| 现象                              | 原因 / 处理                                                                                           |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| publish 步骤报 `EPUBLISHCONFLICT` | 该版本号已发过（npm 不允许重复版本号）——把版本号提新再 tag                                            |
| publish 步骤 401/403              | Trusted Publisher 未登记，或仓库 / workflow 文件名与实际触发的不一致；npm < 11.5.1 也会在 OIDC 处失败 |
| tag 校验失败                      | git tag 与 package.json version 不一致，改对后再 tag                                                  |

---

## 状态记录

- [x] 域名确定：vue3-okr-tree.baiwumm.com（README / package.json homepage 已写入）
- [x] 推送仓库（`main` 已推到 origin，含 1.7.0 全部提交；本地不再领先远端）
- [x] Cloudflare 部署 + 域名绑定（`https://vue3-okr-tree.baiwumm.com/` 与 `/playground/`、`/api/`、`/theme/`、`/guide/*` 均 200；Workers Builds 在 `cb38701` success）
- [x] CI 红灯根因修复（2026-09-18）：`ci.yml` 矩阵 Node 20 → 22/24（pnpm 11 需 `node:sqlite`，Node ≥ 22.5）、加 `fail-fast: false`；`visual.yml` runner 固定 `ubuntu-24.04`（`ubuntu-latest` 2026-10-19 迁移 Ubuntu 26 会使基线集体失配）；新增 `snapshot-bootstrap.yml`
- [x] Linux 视觉基线提交（`be50ee0`，Snapshot Bootstrap 生成后入库），Visual Regression 已转绿；win32 侧现可本地复现：预览端口被 Windows 的 TCP 排除区间占住时用 `OKR_VISUAL_PORT=4500 pnpm test:visual`
- [x] npm 手动首发 **1.13.0**（2026-09-21 完成，npm `latest` 已指向 1.13.0；react-okr-tree 同日同号首发）
- [ ] Trusted Publisher 登记（npmjs 两个包的 Settings 各配一次，见第四节）
- [ ] ⚠️ 手动发过的 `v1.13.0` **不要再打 tag 推 origin**：`release.yml` 的 publish 步骤没有「版本已存在则跳过」的守卫，会 EPUBLISHCONFLICT。自动链路留给下一个版本号（1.13.1 / 1.14.0）验证，1.13.0 的 GitHub Release 手写一条
- [ ] 发布后验证（第三节末 + 第六节：ESM / require / CDN 三路径；另留意 `pnpm add` 是否会因 `auto-install-peers` 自动装上可选 peer `html-to-image`）
