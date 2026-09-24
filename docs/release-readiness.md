# 发包就绪报告（release-readiness）

> ⚠️ **本文是历史快照的终态归档**：门禁数字为 1.7.0–1.13.0 时点（2026-09-18 → 09-21），所列事项已全部收口——npm 首发为 1.13.0（2026-09-21），1.14.0 起由 CI 经 Trusted Publishing（OIDC）全自动发包，全程无 token / Secrets（截至 2026-09-24 最新为 1.14.1）。
> 门禁现状看 `docs/acceptance.md`，发布操作看 `docs/release-guide.md`。本文只保留下方两节：`acceptance.md` 委托引用的数字快照，与两处长期有效的更正。早年的「npm 账号冻结 72 小时」卡点已随发布完成翻篇，时间线与手动步骤不再保留。

## 当前状态（2026-09-19 快照，2026-09-21 复跑对账，已终态）

- 版本 **1.13.0**，`origin/main` = `cd2b7e5`，CI 7 项全绿。~~尚未打过任何 tag~~ → **2026-09-21 已打 `v1.13.0` 并推 origin**，`release.yml` 首次真实运行即 success（run `35579119550`：publish 步被「registry 已有该版本则跳过」守卫标为 `skipped`，只补建 GitHub Release）。
- 门禁实测：单测 **226** 通过 / 覆盖率 stmts 90.69%；`size` ESM 16.75/19 kB、样式 **3.84/4 kB（余量仅 4%）**、
  UMD 16.62/19.5 kB；`verify:dist` / `verify:package`（publint + attw）全绿；Visual **17** 项全绿；
  24 个 Demo 用例浏览器交互 0 控制台报错；`npm pack` 12 文件 / 231.3 kB。
  > 2026-09-21 复跑对账：`pnpm test` 226 passed（21 个 spec 文件）、覆盖率 90.69 / 81.59 / 88.94 / 93.43（阈值 80/75/80/80）、`size` 三项达标、attw 四格 🟢、`ci.yml` / `visual.yml` / `release.yml` 最近一次均 success。
  > 同日补 `BUILT_IN_THEMES` 导出后 `size` 微涨为 ESM 16.77、样式 3.84、UMD 16.64 kB（gzip），`verify:dist` 由 22 条增至 25 条（新增 3 条 `.cjs` 解析断言）——上表那两个 0.02 kB 的旧差值即来自这次增补。
- ~~发布前唯一待办：`npm publish` 与线上三路径验证，阻塞在 npm 账号解封。~~
  → **2026-09-21 两件都已完成**：手动首发 1.13.0（registry 时间 `06:29:10Z`，react-okr-tree 同日同号）；线上三路径实测通过——`import()` 与 `require()` 均可用（17 个导出，含 `VueOkrTree` / `OkrTree`），unpkg 上 `dist/vue3-okr-tree.es.js` 与 `dist/style.css` 均 200；`pnpm add vue3-okr-tree` 只自动装必选 peer `vue`，可选 peer `html-to-image` 不装。

## 对正文数字的两处更正（长期有效的事实，不随版本过期）

1. 上述快照的 `Visual ✅ 全绿` 在 2026-09-18 只在 **win32 本地**成立：仓库缺 `*-chromium-linux.png`，而 Visual job
   跑在 ubuntu 上，缺失基线即判失败，该 job 自建立起连续 9 次全红。2026-09-19 补齐 Linux 基线后首次转绿。
2. 同期修掉一处误报源：`.demo-nav` 以 13px 继承 `line-height:1.5` 得 19.5px 行高，加用例后累计高度落在 .5px 上，
   其下卡片整体偏移半像素，而 Playwright 元素截图向外取整会多 1 行，曾使 14 张 win32 基线集体报「尺寸不符」
   （渲染并无变化，非组件回归）。详见 roadmap 1.5.0 #5 的更正注记。
