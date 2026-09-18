# 发包就绪报告（release-readiness）

> 更新：2026-09-18 ｜ 当前版本：1.6.0（本地，未发布）｜ 状态：**代码侧已达到可发包标准，待门禁终验与维护者手动发布**

## 一、进度总览

| 版本  | 主题                       | 状态                                             |
| ----- | -------------------------- | ------------------------------------------------ |
| 1.4.0 | 懒加载 + 画布组件          | ✅ 全部完成（`498e9cc` `3ea31cd` `a4809ea`）     |
| 1.5.0 | 文档站 + 发布流程 + 工程化 | ✅ 全部完成，真实 npm publish 留给维护者（见三） |
| 1.6.0 | 健壮性与运行时行为补齐     | ✅ 全部完成（`9c595a8` `67de728`）               |
| 2.x   | 大功能（#10–#16）          | ⬜ 未开始（按指示不属于发包门槛）                |

### 已完成条目清单

- **1.4.0**：#1 懒加载（lazy/load、loaded/loading、is-loading 按钮态、展开方法与受控态懒加载感知、OKR 左树、测试 18 条、Demo + README + API 表）；#2 OkrTreeViewport（滚轮/拖拽/pinch/双击、v-model:zoom/offset、wheel-behavior、fitToScreen/centerNode/zoomIn/zoomOut/reset、#toolbar 插槽与默认工具栏、exportImage、与 Group 组合、测试 19 条）。
- **1.5.0**：#3 VitePress 文档站（指南/主题/API/迁移/更新日志，20 个 Demo 组件复用，API 单一来源 `shared/api.ts` 同驱 Playground/文档站/README，Pages 部署 workflow，Playground 随发 `/playground/` 子路径）；#4 发布流程（release.yml：tag→校验→门禁→`npm publish --provenance`→GitHub Release；package.json publishConfig 等核对）；#5 Playwright 视觉回归（14 快照用例 + 独立 visual.yml + 失败上传 diff）；#6 性能基线（jsdom bench + 浏览器实测 2000 节点首渲染 ≈137ms < 300ms 达标、逐层脏检查、deep-watch 开关、docs/perf.md）；#7 工程化（coverage 阈值 80%、size-limit 预算、publint+attw 双零错误、Renovate、index.d.cts 修复）。
- **1.6.0**：#8 冻结/只读数据兼容（WeakMap 兜底、回写降级 + 开发期警告、README 标注、测试 5 条）；#9 运行时 props 同步策略（showCollapsable/defaultExpandAll/props 映射即时同步、nodeKey/direction/onlyBothTree 警告、leftData 重建后恢复左树受控态、测试 4 条）。

### 未完成（2.x，明确不在本次范围）

- #10 拖拽、#11 SVG 连接线、#12 更多布局、#14 复选框、#15 虚拟滚动（M/L 大项，roadmap 定义「视需求排期」）
- #13 其他小项（12 条）、#16 开发体验（Devtools 插件、双语 README、peer 矩阵实测）—— S 项，未开始

## 二、发包门禁逐项状态

| 门禁项               | 状态      | 说明                                                                                                                |
| -------------------- | --------- | ------------------------------------------------------------------------------------------------------------------- |
| lint                 | ✅ 通过   | ESLint 0 错误                                                                                                       |
| typecheck            | ✅ 通过   | vue-tsc --noEmit 0 错误                                                                                             |
| test                 | ✅ 通过   | **161 tests**（14 spec 文件）全绿                                                                                   |
| build                | ✅ 通过   | ESM/CJS/UMD + style.css + index.d.ts + index.d.cts                                                                  |
| verify:dist          | ✅ 通过   | dist 产物 jsdom 挂载冒烟（含 d.cts 一致性检查）                                                                     |
| test:coverage        | ✅ 通过   | statements ≈90%，阈值 statements/functions/lines ≥80%、branches ≥75%                                                |
| verify:package       | ✅ 通过   | publint「No problems found」+ attw 全绿（排除两个 CSS 子路径）                                                      |
| size（size-limit）   | ✅ 通过   | es 17.1/19 kB、style 3.16/3.6 kB、umd 17.23/19.5 kB gzip                                                            |
| test:visual          | ✅ 通过   | 14 快照用例 + 浏览器性能用例（本机连续两轮全绿）                                                                    |
| docs:build           | ✅ 通过   | VitePress 构建成功                                                                                                  |
| npm pack 产物核对    | ⬜ 未验证 | 待：pack 产物仅含 dist + README/LICENSE/CHANGELOG，无内部目录泄漏                                                   |
| tarball 四路径冒烟   | ⬜ 未验证 | 待：临时 Vite 项目装 tarball，验 ESM / CJS / style.css / vue-tsc 四条路径                                           |
| 浏览器 Demo 截图终验 | ⬜ 未验证 | 待：preview 页面对三方向/OKR/主题/懒加载/画布截图确认交互与无控制台报错（视觉回归已覆盖大部分，缺控制台报错检查项） |
| npm 线上验证         | ⬜ 不可行 | 真实发布由维护者执行后验证（npm 页面、CDN 路径）                                                                    |

> 注：本报告中的 ✅ 均为本地实跑结果；正式发布前建议完整重跑一轮「二」中全部 ✅ 项。

## 三、距离可发包还差什么

1. **门禁终验三项**（见上表 ⬜）：`npm pack` 产物核对、tarball 四路径冒烟、浏览器 Demo 截图终验（含控制台无报错断言）。
2. **维护者手动步骤**（无法代办）：
   - Cloudflare：按 [docs-site/README.md](../docs-site/README.md) 把仓库绑定到 Pages/Workers（构建命令与输出目录见该文档）；
   - GitHub 仓库 Secrets 添加 `NPM_TOKEN`（npm Automation token）；
   - 提供最终文档站域名后，替换 README 中两处 `<!--DOCS-URL-->` 占位（搜索 `TODO(deploy)`）；
   - 推送代码后确认 CI / visual 两条 workflow 通过；
   - `git tag v1.6.0 && git push origin v1.6.0` 触发 release.yml 完成真实 `npm publish --provenance`；
   - 发布后空 Vite 项目 `pnpm add vue3-okr-tree` 线上验证 ESM / CJS / CDN 三路径。

> ⚠️ 2026-09-18 卡点：文档站最终域名未定（改部署到 Cloudflare）。README 顶部与「开发」一节的文档站链接暂以 `<!--DOCS-URL-->` 占位，域名确定后全局替换；不影响发包门禁。

## 四、结论

1.0.0–1.6.0 六个版本区块的全部代码条目已完成并逐条提交（中文 conventional commits，每条目可追溯）；六套门禁脚本本地全绿。**完成「二」中三项终验并配置 NPM_TOKEN / Pages 后，下一步即可 `npm publish`**（由维护者手动执行）。
