# 发布操作手册（release-guide）

> vue3-okr-tree 后续版本的发布操作步骤。写给维护者本人照着执行。
> 当前状态（2026-09-24）：两个包（vue3-okr-tree / react-okr-tree）最新版均为 1.14.1，发布链路已全自动——推 `v*` tag 即可，无需登录 npm，也没有任何 token / GitHub Secrets。
> 版本规则：新功能 +1 minor，修复 +1 patch。发包前请以
> `node -p "require('./package.json').version"` 复核版本号，不要照抄本文任何版本号。

---

## 发布机制

推送 `v*` tag 触发 `.github/workflows/release.yml`，依次执行：校验 tag 与 `package.json` 版本一致 → lint / typecheck / test → build + verify:dist + publint/attw + size-limit → 查 registry 该版本是否已存在（已存在则跳过发布）→ `npm publish --provenance` → 从 CHANGELOG 取本版本段创建 GitHub Release（取不到该段则退回自动生成）。全部门禁正常约 3 分钟。

npm 侧身份走 **Trusted Publishing（OIDC）**：GitHub Actions 出短时 OIDC 凭证，npm 核对包设置里登记的仓库与 workflow 后放行——全程无 token，也没有 GitHub Secrets 可配、可泄露。npm 已宣布 2027-01 起 granular token 不能再直接发包，现行链路不受影响。

已就绪的一次性配置（无需再动）：

| 项                | 状态                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------- |
| Trusted Publisher | 两个包均已登记：GitHub Actions / `release.yml` / Environment 留空 / Allow npm publish |
| workflow 权限     | `contents: write`（建 GitHub Release）+ `id-token: write`（provenance）               |
| CI 内 npm 版本    | release.yml 有显式升级步（Trusted Publishing 要求 npm ≥ 11.5.1）                      |
| 版本锁步          | 本仓库是版本决策点；react-okr-tree 同号跟随，两个仓库各自打各自的 tag                 |

Trusted Publisher 连接的三个注意点（只有重建连接时才用得上）：

- **必须勾 `Allow npm publish`**。不勾时这条连接只允许 `npm stage publish`（暂存发布），而发布步跑的是直接 `npm publish --provenance`——会在门禁全绿之后被 npm 拒掉，白等三分钟。建成后可在连接卡片的 Permissions 一行确认同时有 `npm publish` 与 `npm stage publish`。
- **Environment 必须留空**。`publish` job 没有声明 `environment:`，OIDC token 里就不带这个 claim；一旦在 npm 侧填了名字，两边对不上会被判身份不匹配。
- 已建成的连接**必填字段不可改**（Provider / repo / workflow 文件名 / Environment）。以后若重命名 `release.yml`、把发布步挪进别的文件或复用工作流、或给 job 加上 `environment:`，都得删掉旧连接重建。

## 日常发布流程

1. 改代码 → 更新 `package.json` 的 `version` 与 `CHANGELOG.md` → 提交；
2. `git push origin main`，确认两条 workflow 绿灯：**CI**（lint/typecheck/test/build/verify-dist/包体检/size-limit）与 **Visual Regression**（视觉快照 + 浏览器性能）；
3. `git tag vx.y.z && git push origin vx.y.z`；
4. release.yml 全自动执行（见「发布机制」），任何一步失败都不会发包，去 Actions 看日志定位；
5. 按下一节做发布后验证；
6. react-okr-tree 仓库以同号版本重复 1–3。

文档站不需要手动操作：push 到 main 后 Cloudflare Workers Builds 自动构建部署。

> 别用 `gh release create vx.y.z` 手动补建 Release：本地没有这个 tag 时它会自己创建并推送 tag、再触发一次 workflow，等于两边各来一遍（1.13.0 补建 GitHub Release 时踩过这条路径）。

## 发布后验证

安装冒烟（任意临时目录）：

```bash
mkdir smoke && cd smoke && npm init -y
npm i vue3-okr-tree
node -e "const l=require('vue3-okr-tree'); console.log(typeof l.VueOkrTree)"   # object
node --input-type=module -e "import('vue3-okr-tree').then(m=>console.log(typeof m.VueOkrTree))"   # object
```

页面确认 npm 徽章、README 渲染、版本号与 `package.json` 一致。

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

> `npm publish --dry-run` 不换 OIDC token（dry-run 直接跳过发布请求），**验不出发布链路**，别拿它当预检。

## 常见问题

| 现象                                                | 原因 / 处理                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| publish 步骤被跳过                                  | 守卫用 `npm view <name>@<version>` 查到 registry 上已有该版本号（通常是重复推同一个 tag）。属预期，`gh release create` 仍会继续把 GitHub Release 建出来                                                                                                                                                                                                                   |
| publish 步骤报 `EPUBLISHCONFLICT`                   | 守卫没兜住——通常是 `npm view` 那次请求被 registry 抖动判成「未发布」，于是仍尝试发布。把版本号提新再 tag                                                                                                                                                                                                                                                                  |
| publish 步骤 401/403                                | Trusted Publisher 未登记，或仓库 / workflow 文件名与实际触发的不一致；npm < 11.5.1 也会在 OIDC 处失败                                                                                                                                                                                                                                                                     |
| tag 校验失败                                        | git tag 与 package.json version 不一致，改对后再 tag                                                                                                                                                                                                                                                                                                                      |
| run 已 success、`npm i <pkg>@<ver>` 却报 `notarget` | 两层不同的延迟别混成一件：① registry 传播（实测约 1 分钟内 `dist-tags.latest` 才翻，attestations 端点也短暂 404）；② **本地 npm 缓存里那份 packument**——传播都过去了本地仍可能拿旧清单，于是回一句「该版本不存在」。区分办法是绕开缓存直读：`curl -s https://registry.npmjs.org/<pkg>` 看 `versions.<ver>` 与 `dist-tags`；直连有、本地无 ⇒ 加 `--prefer-online` 重装即可 |
