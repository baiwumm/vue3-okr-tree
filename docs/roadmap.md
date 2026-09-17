# vue3-okr-tree 优化路线图

> 接续 `docs/requirements.md` / `docs/development-plan.md`。1.0.0 完成原版复刻后，按"低成本高价值 → 已确认缺口 → 大功能"排序推进。
> **用法**：完成一项就把 `- [ ]` 改成 `- [x]`，并在末尾「完成记录」里补一行版本号与 commit。每项附验收标准，便于自测。
>
> 工作量：S ≈ 半天内，M ≈ 1 天，L ≈ 2–3 天。

## 进度总览

| 版本  | 主题                                                      | 状态            |
| ----- | --------------------------------------------------------- | --------------- |
| 1.0.0 | Vue 3 完整复刻 + 6 项原版缺陷修复                         | ✅ 已发布到仓库 |
| 1.1.0 | CSS 变量主题化 + 六套内置主题                             | ✅              |
| 1.2.0 | 受控状态、扩展方法、插槽、开发期警告、CI                  | ✅              |
| 1.3.0 | OkrTreeGroup 根对齐、键盘可访问性、node-component、类型化 | ✅              |
| 1.4.0 | 懒加载 + 画布组件                                         | ⬜ 待开始       |
| 1.5.0 | 文档站 + 发布流程                                         | ⬜ 待开始       |
| 2.x   | 拖拽、SVG 连接线、更多布局                                | ⬜ 视需求       |

---

## 1.4.0 — 大数据量与画布

### 1. 懒加载子节点（M）

- [ ] 新增 prop `lazy: boolean` 与 `load: (node: TreeNode, resolve: (children: TreeNodeData[]) => void, reject?: () => void) => void`
- [ ] `TreeNode` 增加 `loaded` / `loading` 状态；`lazy` 下未加载节点的 `isLeaf` 由 `props.isLeaf` 字段（或 `data[props.isLeaf]`）决定，默认视为有子节点
- [ ] 首次展开未加载节点时调用 `load`，`resolve` 后通过 `insertChild` 写入（同步修改源数据 `children`，与现有增删语义一致），再展开
- [ ] 展开按钮加载中态：`is-loading` 类 + `#expand-btn` 作用域新增 `loading`；`show-node-num` 在未加载时不显示数字
- [ ] `expandAll` / `expandNode` / `scrollToNode` / `default-expanded-keys` / `v-model:expanded-keys` 对未加载节点的行为：触发加载并在完成后展开
- [ ] OKR 左树的懒加载（`load` 回调收到的 `node.isLeftChild` 可区分）
- [ ] 测试：加载一次不重复、reject 恢复折叠态、并发点击只触发一次 `load`
- [ ] Demo：新增用例（模拟 800ms 异步接口）；README / API 表补 `lazy` / `load` / `props.isLeaf`
- **验收**：几千节点的组织架构只加载展开路径；`load` 抛错或 `reject` 时节点回到折叠态且可重试。

### 2. `<OkrTreeViewport>` 画布组件（L）

- [ ] 独立包裹组件，不侵入树本体：`<okr-tree-viewport><vue-okr-tree …/></okr-tree-viewport>`
- [ ] 滚轮缩放（以指针为中心）、按住拖拽平移、双击复位；触控 pinch 缩放
- [ ] props：`min-zoom` / `max-zoom` / `zoom-step` / `v-model:zoom` / `v-model:offset`、`wheel-behavior`（`zoom` | `scroll`，默认需按 Ctrl 才缩放以免劫持页面滚动）
- [ ] 方法：`zoomIn()` / `zoomOut()` / `reset()` / `fitToScreen(padding?)` / `centerNode(key)`（配合树的 `scrollToNode` 语义）
- [ ] 工具栏插槽 `#toolbar="{ zoom, zoomIn, zoomOut, reset, fit }"` 与默认工具栏
- [ ] 导出：`exportImage({ type: 'png' | 'svg', scale, background })`，基于 `html-to-image`（作为 `optionalDependencies` 或动态 import，未安装时给出明确错误）
- [ ] 与 `OkrTreeGroup` 组合使用可行（Group 在 Viewport 内）
- [ ] 测试：缩放边界、`fitToScreen` 计算、导出函数在缺依赖时的错误信息
- [ ] Demo：新增用例（工具栏 + 导出按钮）；README 新章节
- **验收**：大图在 1280 宽度下可缩放浏览与导出清晰 PNG；`wheel-behavior: scroll` 时页面滚动不被劫持。

---

## 1.5.0 — 文档站与发布

### 3. VitePress 文档站 + GitHub Pages（M）

- [ ] `docs-site/`（或迁移 `playground/`）：VitePress，页面按「指南 / 主题 / API / 迁移 / 更新日志」组织，Demo 用例以组件形式嵌入
- [ ] 保留现有 playground 作为开发调试入口（`pnpm dev`），文档站单独 `pnpm docs:dev` / `pnpm docs:build`
- [ ] GitHub Actions：`main` 推送后构建并部署到 `gh-pages`
- [ ] README 顶部加文档站链接与徽章（npm 版本、CI 状态）
- **验收**：仓库 Pages 地址可访问，20+ 用例可交互，API 表与 README 单一来源（避免三处维护）。

### 4. 发布流程（S）

- [ ] 引入 `changesets`（或简化为 `release` workflow：打 tag → 构建 → `npm publish --provenance`）
- [ ] `package.json` 核对：`repository` / `homepage` / `bugs` / `author` / `keywords`；`publishConfig.access: public`
- [ ] 首次 `npm publish`（此前仅做过 `--dry-run`）
- [ ] 发布后用一个空 Vite 项目 `pnpm add vue3-okr-tree` 验证：ESM import、`require`、CDN `<script>` 三条路径
- **验收**：npm 页面可见 1.x，安装后类型提示与样式正常。

### 5. 视觉回归测试（M）

- [ ] Playwright（真实浏览器，绕开自动化窗格 rAF 节流问题）对 Demo 关键用例截图比对：三模式、OKR 对齐、六套主题、动画落定态
- [ ] CI 中作为独立 job，失败时上传 diff 图
- **验收**：改 CSS 变量/连接线时 CI 能抓到像素级回归。

### 6. 性能基线（S）

- [ ] 用 2000 节点数据做 benchmark（首渲染、展开/收起、`filter`、原地 `push`）；记录到 `docs/perf.md`
- [ ] 评估 `data` deep watch 成本，提供 `deep-watch: false` 开关（只响应引用变化，回到原版行为）
- [ ] `computeLabelClass` 等每节点 computed 的开销核对
- **验收**：2000 节点首渲染 < 300ms（开发机），提供可复现脚本。

---

## 2.x — 大功能（视需求排期）

### 7. 拖拽调整层级（L）

- [ ] `draggable` prop；HTML5 DnD，节点可拖到目标节点的「前 / 后 / 内」
- [ ] `allow-drag(node)` / `allow-drop(dragNode, dropNode, type)` 规则钩子
- [ ] 事件：`node-drag-start` / `node-drag-enter` / `node-drag-leave` / `node-drag-over` / `node-drag-end` / `node-drop`
- [ ] 放置指示线样式（走 `--okr-*` 变量）；OKR 模式跨左右树拖动的规则（默认禁止，`allow-drop` 可放开）
- [ ] store 增加 `moveNode(node, target, type)`，同步修改源数据
- **验收**：拖拽后 `data` 与视图一致，`v-model:expanded-keys` 正确回写。

### 8. SVG 连接线模式（L）

- [ ] `connector: 'css' | 'svg'`，默认 `css`（现状）
- [ ] `svg` 模式：测量节点位置，用一个覆盖层 `<svg>` 绘制路径；支持 `curve` / `orthogonal` / `straight`
- [ ] 线宽/颜色继续走 `--okr-line-*` 变量；随展开/收起、尺寸变化重绘（ResizeObserver）
- **验收**：曲线模式下拖动/展开无残影，性能与 CSS 模式同量级（≤ 500 节点）。

### 9. 更多布局（M–L）

- [ ] `direction: 'vertical-reverse'`（自下而上）、`'horizontal-reverse'`（从右向左，RTL 页面）
- [ ] 垂直方向的上下双向 OKR（`only-both-tree` + `vertical`）：需要 `topData` 或复用 `leftData` 语义并改模板结构
- **验收**：四个方向连接线与按钮位置正确，主题变量通用。

### 10. 其他小项（S，随手可做）

- [ ] `expand-on-click-node`：点击节点内容也切换展开（默认 false，保持原版）
- [ ] `accordion`：同级只允许一个展开
- [ ] `unstyled` prop：只输出布局与连接线，不带卡片外观，供 Tailwind / 自有设计系统接管
- [ ] `getVisibleNodes()` / `getNodePath(key)` 辅助方法
- [ ] `node-key` 缺失时的默认 key 策略文档化（`$treeNodeId`）
- [ ] SSR/Nuxt 冒烟（当前 setup 不访问 window，理论兼容；补一个 `renderToString` 测试）

---

## 完成记录

| 日期       | 版本  | 内容                                                                                                        | Commit    |
| ---------- | ----- | ----------------------------------------------------------------------------------------------------------- | --------- |
| 2026-09-17 | 1.0.0 | 原版复刻、Q1–Q9 修复、Demo 20 用例、dist 三格式 + d.ts                                                      | `803ce65` |
| 2026-09-17 | 1.1.0 | CSS 变量化（23 个变量）、`theme` prop、六套主题、Demo 主题切换器                                            | `ea1df51` |
| 2026-09-17 | 1.2.0 | `v-model:expanded-keys/current-key`、expandAll 等 5 方法、`#expand-btn`/`#empty`、开发期警告、CI、CHANGELOG | `4874895` |
| 2026-09-17 | 1.3.0 | `OkrTreeGroup`、WAI-ARIA 键盘导航、`node-component`、`createTypedOkrTree<T>`                                | `115cd54` |
|            |       |                                                                                                             |           |

## 已决定不做

- **Tailwind CSS 进入组件库本体**：连接线是伪元素像素几何，工具类无法表达；Preflight 会重新引入全局样式污染；主题诉求已由 CSS 变量满足。文档站可用 Tailwind。
- **`selectedKey` / `orkstyle` / `props.leftChildren` 等原版死代码**：见 `requirements.md` 2.1。
