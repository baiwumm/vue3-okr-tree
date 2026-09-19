# 发包就绪报告（release-readiness）

> ⚠️ **本文正文是 1.7.0 时点（2026-09-18）的历史快照**，下方表格里的版本号与用例数均已过期，勿据此判断门禁状态。
> 发布当天请以**重跑门禁的实测结果**为准，不要引用本文件里的任何数字。

## 当前状态（2026-09-19 快照，发布前请重跑核对）

- 版本 **1.13.0**，`origin/main` = `cd2b7e5`，CI 7 项全绿，**尚未打过任何 tag**。
- 门禁实测：单测 **226** 通过 / 覆盖率 stmts 90.69%；`size` ESM 16.75/19 kB、样式 **3.84/4 kB（余量仅 4%）**、
  UMD 16.62/19.5 kB；`verify:dist` / `verify:package`（publint + attw）全绿；Visual **17** 项全绿；
  24 个 Demo 用例浏览器交互 0 控制台报错；`npm pack` 12 文件 / 231.3 kB。
- 发布前唯一待办：`npm publish` 与线上三路径验证（见第三节），阻塞在 npm 账号解封 **2026-09-21 14:22（北京时间）**。

## 对正文表格的两处更正（长期有效的事实，不随版本过期）

1. 下表 `test:visual ✅ 通过` 在 2026-09-18 只在 **win32 本地**成立：仓库缺 `*-chromium-linux.png`，而 Visual job
   跑在 ubuntu 上，缺失基线即判失败，该 job 自建立起连续 9 次全红。2026-09-19 补齐 20 张 Linux 基线后首次转绿。
2. 同期修掉一处误报源：`.demo-nav` 以 13px 继承 `line-height:1.5` 得 19.5px 行高，加用例后累计高度落在 .5px 上，
   其下卡片整体偏移半像素，而 Playwright 元素截图向外取整会多 1 行，曾使 14 张 win32 基线集体报「尺寸不符」
   （渲染并无变化，非组件回归）。详见 roadmap #5 的更正注记。

> 更新：2026-09-18（终验完成；1.7.0 增补 #13 低风险档 + Logo 接入，同日复跑门禁同样全绿）｜ 当前版本：1.7.0（本地，未发布；1.6.0 从未上线，首发即为 1.7.0）｜ 状态：**✅ 代码侧已达到可发包标准，下一步即可 npm publish（维护者手动执行）**

## 一、进度总览

| 版本  | 主题                       | 状态                                             |
| ----- | -------------------------- | ------------------------------------------------ |
| 1.4.0 | 懒加载 + 画布组件          | ✅ 全部完成（`498e9cc` `3ea31cd` `a4809ea`）     |
| 1.5.0 | 文档站 + 发布流程 + 工程化 | ✅ 全部完成，真实 npm publish 留给维护者（见三） |
| 1.6.0 | 健壮性与运行时行为补齐     | ✅ 全部完成（`9c595a8` `67de728`）               |
| 2.x   | 大功能（#10–#16）          | ⬜ 未开始（按指示不属于发包门槛）                |

### 已完成条目清单

- **1.4.0**：#1 懒加载（lazy/load、loaded/loading、is-loading 按钮态、展开方法与受控态懒加载感知、OKR 左树、测试 18 条、Demo + README + API 表）；#2 OkrTreeViewport（滚轮/拖拽/pinch/双击、v-model:zoom/offset、wheel-behavior、fitToScreen/centerNode/zoomIn/zoomOut/reset、#toolbar 插槽与默认工具栏、exportImage、与 Group 组合、测试 19 条）。
- **1.5.0**：#3 VitePress 文档站（指南/主题/API/迁移/更新日志，20 个 Demo 组件复用，API 单一来源 `shared/api.ts` 同驱 Playground/文档站/README；**部署目标已改为 Cloudflare Pages/Workers**，见 `docs-site/README.md`）；#4 发布流程（release.yml：tag→校验→门禁→`npm publish --provenance`→GitHub Release；package.json publishConfig 等核对）；#5 Playwright 视觉回归（14 快照用例 + 独立 visual.yml + 失败上传 diff + `smoke.spec.ts` 控制台零报错守卫）；#6 性能基线（jsdom bench + 浏览器实测 2000 节点首渲染 ≈137ms < 300ms 达标、逐层脏检查、deep-watch 开关、docs/perf.md）；#7 工程化（coverage 阈值 80%、size-limit 预算、publint+attw 双零错误、Renovate、index.d.cts 修复）。
- **1.6.0**：#8 冻结/只读数据兼容（WeakMap 兜底、回写降级 + 开发期警告、README 标注、测试 5 条）；#9 运行时 props 同步策略（showCollapsable/defaultExpandAll/props 映射即时同步、nodeKey/direction/onlyBothTree 警告、leftData 重建后恢复左树受控态、测试 4 条）。

### 未完成（2.x，明确不在本次范围）

- #10 拖拽、#11 SVG 连接线、#12 更多布局、#14 复选框、#15 虚拟滚动（M/L 大项，roadmap 定义「视需求排期」）
- #13 其他小项（12 条）、#16 开发体验（Devtools 插件、双语 README、peer 矩阵实测）—— S 项，未开始

## 二、发包门禁逐项状态

| 门禁项                 | 状态      | 说明                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| lint                   | ✅ 通过   | ESLint 0 错误                                                                                                                                                                                                                                                                                                                                                                                       |
| typecheck              | ✅ 通过   | vue-tsc --noEmit 0 错误                                                                                                                                                                                                                                                                                                                                                                             |
| test                   | ✅ 通过   | **161 tests**（14 spec 文件）全绿                                                                                                                                                                                                                                                                                                                                                                   |
| build                  | ✅ 通过   | ESM/CJS/UMD + style.css + index.d.ts + index.d.cts，共 9 个产物文件                                                                                                                                                                                                                                                                                                                                 |
| verify:dist            | ✅ 通过   | dist 产物 jsdom 挂载冒烟（含 d.cts 一致性检查）                                                                                                                                                                                                                                                                                                                                                     |
| test:coverage          | ✅ 通过   | statements ≈90%，阈值 statements/functions/lines ≥80%、branches ≥75%                                                                                                                                                                                                                                                                                                                                |
| verify:package         | ✅ 通过   | publint「No problems found」+ attw 全绿（排除两个 CSS 子路径）                                                                                                                                                                                                                                                                                                                                      |
| size（size-limit）     | ✅ 通过   | es 17.8/19 kB、style 3.16/3.6 kB、umd 12.6/19.5 kB gzip                                                                                                                                                                                                                                                                                                                                             |
| test:visual            | ✅ 通过   | 14 快照用例 + 浏览器性能用例（连续两轮全绿）                                                                                                                                                                                                                                                                                                                                                        |
| docs:build             | ✅ 通过   | VitePress 构建（含 `docs:build:full` 合并 Playground）                                                                                                                                                                                                                                                                                                                                              |
| **npm pack 产物核对**  | ✅ 通过   | `npm pack --dry-run`：**13 个文件**（dist 9 + README/LICENSE/CHANGELOG/package.json），**221.8 kB**（unpacked 822.8 kB）；无 src/tests/playground/docs-site 泄漏                                                                                                                                                                                                                                    |
| **tarball 四路径冒烟** | ✅ 通过   | 临时目录空 Vite+Vue3 工程安装 `vue3-okr-tree-1.6.0.tgz`：① ESM `import { VueOkrTree }` + `vite build` 成功（树渲染 + expandAll 正常）；② CJS `require('vue3-okr-tree')` 得到 VueOkrTree/TreeStore/插件 default；③ `import 'vue3-okr-tree/dist/style.css'` 进入构建产物（23.59 kB）；④ `vue-tsc --noEmit` 0 错误（`VueOkrTreeInstance` / `TreeNodeData` / lazy/load / `#expand-btn` loading 作用域） |
| **浏览器 Demo 终验**   | ✅ 通过   | Playwright（`tests/visual/smoke.spec.ts`，已保留为常驻守卫）：垂直 / 水平 / OKR 左右树渲染正常、dark 主题切换生效、懒加载展开后子节点渲染、画布展开 + 工具栏 zoomIn 100%→120% 生效；**控制台 console.error / pageerror 全程 0 条**（连续 3 轮通过）                                                                                                                                                 |
| npm 线上验证           | ⬜ 不可行 | 真实发布由维护者执行后验证（npm 页面、CDN 路径）                                                                                                                                                                                                                                                                                                                                                    |

> 注：上表 ✅ 均为本地实跑结果（2026-09-18）。正式发布前如相隔较久，建议重跑 `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm verify:dist && pnpm verify:package && pnpm size && pnpm test:visual`。

## 三、距离可发包还差什么（维护者手动步骤）

代码侧无剩余项。**逐步操作手册见 [release-guide.md](./release-guide.md)**（含 npm 账号解封时间线）。概要：

1. 推送仓库到 GitHub，确认 CI / visual 两条 workflow 绿灯；
2. Cloudflare 绑定仓库部署文档站，绑定域名 **vue3-okr-tree.baiwumm.com**（README 与 package.json homepage 已写入该域名）；
3. **npm 账号 2026-09-21 14:22（北京时间）解封后**：本地手动首发**当时的 HEAD 版本号**（当前为 **1.13.0**；1.7.0 起未发过任何版本，npm 上首个线上版本会跳号到 1.13.0，CHANGELOG 已按版本逐条交代；`pnpm build` → `pnpm verify:package` → `npm publish`）；
4. 创建 Granular Token（只圈定 vue3-okr-tree、勾 Bypass 2FA）→ GitHub Secrets 配置 `NPM_TOKEN`；
5. 后续版本：改版本号 + CHANGELOG → `git tag vx.y.z && git push origin vx.y.z` → release.yml 自动发布（带 provenance）。

> ⚠️ 2026-09-18 记录：npm 账号因恢复码登录被冻结 72 小时（2026-09-21 06:22 UTC 解封），冻结期间只读；域名已确定为 vue3-okr-tree.baiwumm.com 并落地到 README / homepage，原占位链接已全部替换，该卡点解除。

## 四、结论

1.0.0–1.7.0 各版本区块的代码条目已完成并逐条提交；全部门禁（含 npm pack 核对、tarball 四路径冒烟、浏览器终验）本地全绿；文档站域名已定并落地、Logo 与站点图标已接入。**按 release-guide.md 走完手动步骤（push、Cloudflare、首发 1.7.0、NPM_TOKEN）后，后续版本即可由 tag 触发 release workflow 自动发布。**
