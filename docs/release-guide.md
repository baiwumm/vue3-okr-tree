# 发布操作手册（release-guide）

> vue3-okr-tree 首发与后续版本的完整操作步骤。写给维护者本人照着执行。
> 当前状态（2026-09-22）：**1.13.0 已上线**（2026-09-21 手动首发，registry 时间 `06:29:10Z`；1.6.0–1.13.0 从未单独发布，首个线上版本即 1.13.0）。
> 自动发布链路已借 `v1.13.0` tag 演练过一次（run `35579119550`：守卫检测到版本已存在 → publish 步 `skipped` → 只补建 GitHub Release），
> 但 **OIDC 换 token + `npm publish` 这一步还没真实执行过**——它要到下一个版本才第一次被验证。发包前请以
> `node -p "require('./package.json').version"` 复核版本号，不要照抄本文任何版本号。

---

## 步骤总览

| #   | 步骤                                          | 依赖 npm 解封？                                    |
| --- | --------------------------------------------- | -------------------------------------------------- |
| 1   | 推送仓库到 GitHub                             | ❌ 现在就能做                                      |
| 2   | Cloudflare 绑定 + 部署文档站 + 配置域名       | ❌ 现在就能做                                      |
| 3   | 手动首发 npm 包（版本号见 `package.json`）    | ✅ 需解封 → 已完成（1.13.0，2026-09-21）           |
| 4   | 包设置登记 Trusted Publisher（免 token 发布） | ✅ 需解封 → 已完成（两包，2026-09-21）             |
| 5   | npm 包页面关联 GitHub 仓库                    | ✅ 需解封 → 已完成                                 |
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
node -p "require('./package.json').version"   # 核对版本号（本节只适用于首发那一次，后续版本由 CI 发布，见第七节）
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
| Publisher           | GitHub Actions                           | GitHub Actions           |
| Organization/user   | `baiwumm`                                | `baiwumm`                |
| Repository          | `baiwumm/vue3-okr-tree`                  | `baiwumm/react-okr-tree` |
| Workflow filename   | `release.yml`                            | `release.yml`            |
| Environment（可选） | 留空（workflow 未用 GitHub environment） | 留空                     |
| Allowed actions     | **勾选 `Allow npm publish`**             | 同左                     |

三个容易踩的点：

- **必须勾 `Allow npm publish`**。不勾时这条连接只允许 `npm stage publish`（暂存发布），而发布步跑的是直接 `npm publish --provenance`——会在门禁全绿之后被 npm 拒掉，白等三分钟。建成后可在连接卡片的 Permissions 一行确认同时有 `npm publish` 与 `npm stage publish`。
- **Environment 必须留空**。`publish` job 没有声明 `environment:`，OIDC token 里就不带这个 claim；一旦在 npm 侧填了名字，两边对不上会被判身份不匹配。
- 已建成的连接**必填字段不可改**（Provider / repo / workflow 文件名 / Environment）。以后若重命名 `release.yml`、把发布步挪进别的文件或复用工作流、或给 job 加上 `environment:`，都得删掉旧连接重建。

> 提交时被跳到 2FA 页面并提示 `Please configure 2FA to edit this package`，先硬刷新重试一次，别急着动账号设置——账号侧 2FA 往往已经是开的，那条横幅可能只是上一次失败请求的残留（2026-09-21 实际踩过）。

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
3. release.yml 自动执行：校验 tag 与版本一致 → lint/typecheck/test → build + verify:dist + publint/attw + size-limit → 查 registry 该版本是否已存在（已存在则跳过发布，见「常见问题」）→ `npm publish --provenance` → 创建 GitHub Release；
4. 任何一步失败都不会发包，去 Actions 看日志定位。

### 怎么确认这次发布真的走了 OIDC

```bash
gh run list --workflow=release.yml --limit 3                              # 有 run 且 success
gh run view <RUN_ID> --log | grep -iE "Signed provenance|transparency log|\+ vue3-okr-tree@"
npm view vue3-okr-tree@<ver> version                                      # 版本号确实上了 registry
gh release view v<ver>                                                    # GitHub Release 也建了
curl -s "https://registry.npmjs.org/-/npm/v1/attestations/vue3-okr-tree@<ver>" | head -c 200
```

三条由强到弱的硬证据：

1. **publish 步日志**里出现 `npm notice publish Signed provenance statement with source and build information from GitHub Actions` 与 `Provenance statement published to transparency log: https://search.sigstore.dev/?logIndex=…`，末尾跟着 `+ vue3-okr-tree@<ver>`。
2. **attestations 端点**返回 `{"attestations":[{"predicateType":"https://github.com/npm/attestation/tree/main/specs/publish/v0.1", …`。
3. 临时目录 `npm i vue3-okr-tree@<ver> && npm audit signatures`——`invalid` 与 `missing` 都应为空数组。

> ⚠️ **不要用完整 packument 里的 `attestations` 字段判断**：provenance 不在 packument 的 version 条目里，`curl https://registry.npmjs.org/<pkg>/latest` 永远查不到它，对已带签名证明的版本也一样返回空——这条判据是假的，用它会把成功当失败。
>
> ⚠️ registry 有传播延迟（实测约 1 分钟内 `dist-tags.latest` 才更新，attestations 端点也会短暂 404）。run 刚结束就查不到不等于发布失败，先看日志里的 `+ <pkg>@<ver>`。

> **2026-09-22 首次实测通过**：两包 1.14.0 均由 CI 经 OIDC 真实发布，三条证据全部命中；`gh secret list` 为空，证明没有 token 参与。

> `npm publish --dry-run` 不换 OIDC token（dry-run 直接跳过发布请求），**验不出发布链路**，别拿它当预检。

### 常见问题

| 现象                              | 原因 / 处理                                                                                                                                                     |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| publish 步骤被跳过                | 守卫用 `npm view <name>@<version>` 查到 registry 上已有该版本号（手动首发过、或重复推同一个 tag）。属预期，`gh release create` 仍会继续把 GitHub Release 建出来 |
| publish 步骤报 `EPUBLISHCONFLICT` | 守卫没兜住——通常是 `npm view` 那次请求被 registry 抖动判成「未发布」，于是仍尝试发布。把版本号提新再 tag                                                        |
| publish 步骤 401/403              | Trusted Publisher 未登记，或仓库 / workflow 文件名与实际触发的不一致；npm < 11.5.1 也会在 OIDC 处失败                                                           |
| tag 校验失败                      | git tag 与 package.json version 不一致，改对后再 tag                                                                                                            |

---

## 状态记录

- [x] 域名确定：vue3-okr-tree.baiwumm.com（README / package.json homepage 已写入）
- [x] 推送仓库（`main` 已推到 origin，含 1.7.0 全部提交；本地不再领先远端）
- [x] Cloudflare 部署 + 域名绑定（`https://vue3-okr-tree.baiwumm.com/` 与 `/playground/`、`/api/`、`/theme/`、`/guide/*` 均 200；Workers Builds 在 `cb38701` success）
- [x] CI 红灯根因修复（2026-09-18）：`ci.yml` 矩阵 Node 20 → 22/24（pnpm 11 需 `node:sqlite`，Node ≥ 22.5）、加 `fail-fast: false`；`visual.yml` runner 固定 `ubuntu-24.04`（`ubuntu-latest` 2026-10-19 迁移 Ubuntu 26 会使基线集体失配）；新增 `snapshot-bootstrap.yml`
- [x] Linux 视觉基线提交（`be50ee0`，Snapshot Bootstrap 生成后入库），Visual Regression 已转绿；win32 侧现可本地复现：预览端口被 Windows 的 TCP 排除区间占住时用 `OKR_VISUAL_PORT=4500 pnpm test:visual`
- [x] npm 手动首发 **1.13.0**（2026-09-21 完成，npm `latest` 已指向 1.13.0；react-okr-tree 同日同号首发）
- [x] Trusted Publisher 登记（2026-09-21 两个包各配一次，见第四节）：GitHub Actions + `release.yml` + Environment 留空，Permissions 已含 `npm publish` 与 `npm stage publish`
- [x] 发布后验证（2026-09-21 实测）：`import()` 与 `require()` 均通过（`VueOkrTree` / `OkrTree` 等导出齐全）；unpkg 上 `dist/vue3-okr-tree.es.js` 与 `dist/style.css` 均 200。`pnpm add vue3-okr-tree` **只自动装必选 peer `vue`，可选 peer `html-to-image` 不装**（`auto-install-peers` 默认跳过 `optional: true`），导出图片能力需用户自行安装
- [x] 推 `v1.13.0` tag 让 workflow 建 GitHub Release（2026-09-21 实测通过）。原先「手动发过的版本不要再打 tag」的禁令已随守卫解除：`git tag v1.13.0 <含守卫的提交> && git push origin v1.13.0` → run `35579119550` 全绿，守卫命中把 publish 步标成 `skipped`，`gh release create` 照常建出 v1.13.0；registry 侧版本号与 `attestations: none` 均未变动。react-okr-tree 同改动同结果（run `35579145408`）。注意别改用 `gh release create v1.13.0` 手动建——tag 不存在时它会自己创建并推送 tag、再触发一次 workflow，等于两边各来一遍
- [x] **OIDC 端到端验证（2026-09-22 完成）**：两包 **1.14.0** 均由 CI 经 Trusted Publishing 真实发包。vue3 run `35708582755`（publish 步 success → `+ vue3-okr-tree@1.14.0`，provenance 入 sigstore `logIndex=2908846083`）；react-okr-tree run `35711304130`（`+ react-okr-tree@1.14.0`，`logIndex=2908890080`）。两端 `gh secret list` 均为空，证明确实没有 token 参与。判据见第七节
