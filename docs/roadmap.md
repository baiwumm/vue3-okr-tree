# vue3-okr-tree 优化路线图

> 接续 `docs/requirements.md` / `docs/development-plan.md`。1.0.0 完成原版复刻后，按"低成本高价值 → 已确认缺口 → 大功能"排序推进。
> **用法**：完成一项就把 `- [ ]` 改成 `- [x]`，并在末尾「完成记录」里补一行版本号与 commit。每项附验收标准，便于自测。
>
> 工作量：S ≈ 半天内，M ≈ 1 天，L ≈ 2–3 天。

## 进度总览

| 版本  | 主题                                                                             | 状态            |
| ----- | -------------------------------------------------------------------------------- | --------------- |
| 1.0.0 | Vue 3 完整复刻 + 6 项原版缺陷修复                                                | ✅ 已发布到仓库 |
| 1.1.0 | CSS 变量主题化 + 六套内置主题                                                    | ✅              |
| 1.2.0 | 受控状态、扩展方法、插槽、开发期警告、CI                                         | ✅              |
| 1.3.0 | OkrTreeGroup 根对齐、键盘可访问性、node-component、类型化                        | ✅              |
| 1.4.0 | 懒加载 + 画布组件                                                                | ✅              |
| 1.5.0 | 文档站 + 发布流程                                                                | ✅ 发布待维护者 |
| 1.6.0 | 健壮性与运行时行为补齐                                                           | ✅              |
| 1.7.0 | 2.x #13 低风险档 + Logo 接入 + CI/视觉回归转绿修复                               | ✅ 发布待维护者 |
| 1.8.0 | 2.x #13 交互档（accordion / expand-on-click-node）+ SSR 冒烟 + peer 收紧 vue≥3.3 | ✅ 发布待维护者 |
| 2.x   | 拖拽、SVG 连接线、复选框、虚拟滚动、更多布局                                     | ⬜ 视需求       |

---

## 1.4.0 — 大数据量与画布

### 1. 懒加载子节点（M）

- [x] 新增 prop `lazy: boolean` 与 `load: (node: TreeNode, resolve: (children: TreeNodeData[]) => void, reject?: () => void) => void`
- [x] `TreeNode` 增加 `loaded` / `loading` 状态；`lazy` 下未加载节点的 `isLeaf` 由 `props.isLeaf` 字段（或 `data[props.isLeaf]`）决定，默认视为有子节点
- [x] 首次展开未加载节点时调用 `load`，`resolve` 后通过 `insertChild` 写入（同步修改源数据 `children`，与现有增删语义一致），再展开
- [x] 展开按钮加载中态：`is-loading` 类 + `#expand-btn` 作用域新增 `loading`；`show-node-num` 在未加载时不显示数字
- [x] `expandAll` / `expandNode` / `scrollToNode` / `default-expanded-keys` / `v-model:expanded-keys` 对未加载节点的行为：触发加载并在完成后展开
- [x] OKR 左树的懒加载（`load` 回调收到的 `node.isLeftChild` 可区分）
- [x] 测试：加载一次不重复、reject 恢复折叠态、并发点击只触发一次 `load`
- [x] Demo：新增用例（模拟 800ms 异步接口）；README / API 表补 `lazy` / `load` / `props.isLeaf`
- **验收**：几千节点的组织架构只加载展开路径；`load` 抛错或 `reject` 时节点回到折叠态且可重试。

### 2. `<OkrTreeViewport>` 画布组件（L）

- [x] 独立包裹组件，不侵入树本体：`<okr-tree-viewport><vue-okr-tree …/></okr-tree-viewport>`
- [x] 滚轮缩放（以指针为中心）、按住拖拽平移、双击复位；触控 pinch 缩放
- [x] props：`min-zoom` / `max-zoom` / `zoom-step` / `v-model:zoom` / `v-model:offset`、`wheel-behavior`（`zoom` | `scroll`，默认需按 Ctrl 才缩放以免劫持页面滚动）
- [x] 方法：`zoomIn()` / `zoomOut()` / `reset()` / `fitToScreen(padding?)` / `centerNode(key)`（配合树的 `scrollToNode` 语义）
- [x] 工具栏插槽 `#toolbar="{ zoom, zoomIn, zoomOut, reset, fit }"` 与默认工具栏
- [x] 导出：`exportImage({ type: 'png' | 'svg', scale, background })`，基于 `html-to-image`（作为 `optionalDependencies` 或动态 import，未安装时给出明确错误）
- [x] 与 `OkrTreeGroup` 组合使用可行（Group 在 Viewport 内）
- [x] 测试：缩放边界、`fitToScreen` 计算、导出函数在缺依赖时的错误信息
- [x] Demo：新增用例（工具栏 + 导出按钮）；README 新章节
- **验收**：大图在 1280 宽度下可缩放浏览与导出清晰 PNG；`wheel-behavior: scroll` 时页面滚动不被劫持。

---

## 1.5.0 — 文档站与发布

### 3. VitePress 文档站 + GitHub Pages（M）

- [x] `docs-site/`（或迁移 `playground/`）：VitePress，页面按「指南 / 主题 / API / 迁移 / 更新日志」组织，Demo 用例以组件形式嵌入
- [x] 保留现有 playground 作为开发调试入口（`pnpm dev`），文档站单独 `pnpm docs:dev` / `pnpm docs:build`
- [x] GitHub Actions：`main` 推送后构建并部署到 `gh-pages`
- [x] README 顶部加文档站链接与徽章（npm 版本、CI 状态）
- **验收**：仓库 Pages 地址可访问，20+ 用例可交互，API 表与 README 单一来源（避免三处维护）。

### 4. 发布流程（S）

- [x] 引入 `changesets`（或简化为 `release` workflow：打 tag → 构建 → `npm publish --provenance`）
- [x] `package.json` 核对：`repository` / `homepage` / `bugs` / `author` / `keywords`；`publishConfig.access: public`
- [ ] 首次 `npm publish`（此前仅做过 `--dry-run`）
- [ ] 发布后用一个空 Vite 项目 `pnpm add vue3-okr-tree` 验证：ESM import、`require`、CDN `<script>` 三条路径
- **验收**：npm 页面可见 1.x，安装后类型提示与样式正常。
  > ⏸ 2026-09-18 中断进度：release workflow（tag → 校验 → `npm publish --provenance` → GitHub Release）与 package.json（repository/homepage/bugs/keywords/publishConfig.access）已就绪；发布前四条路径已用 `npm pack` tarball 在空 Vite 项目中本地验证（见 docs/release-readiness.md）｜剩余：维护者配置 NPM_TOKEN 后 push tag 由用户手动执行真实发布，及发布后 npm 线上验证（含 CDN 路径）。

### 5. 视觉回归测试（M）

- [x] Playwright（真实浏览器，绕开自动化窗格 rAF 节流问题）对 Demo 关键用例截图比对：三模式、OKR 对齐、六套主题、动画落定态
- [x] CI 中作为独立 job，失败时上传 diff 图
- **验收**：改 CSS 变量/连接线时 CI 能抓到像素级回归。

### 6. 性能基线（S）

- [x] 用 2000 节点数据做 benchmark（首渲染、展开/收起、`filter`、原地 `push`）；记录到 `docs/perf.md`
- [x] 评估 `data` deep watch 成本，提供 `deep-watch: false` 开关（只响应引用变化，回到原版行为）
- [x] `computeLabelClass` 等每节点 computed 的开销核对
- [x] `updateChildren` 增量重建目前按 key diff 全树递归，大数据量原地变更时引入脏标记、只重建受影响路径
- **验收**：2000 节点首渲染 < 300ms（开发机），提供可复现脚本。

### 7. 工程化补齐（S）

- [x] 测试覆盖率：`@vitest/coverage-v8`，CI 输出覆盖率并设初始阈值（如 statements 80%），README 加 badge
- [x] dist 体积预算：`size-limit`（按当前 gzip 体积 +10% 设阈值），超限 CI 失败，防止无意膨胀
- [x] 包发布体检：`publint` + `@arethetypeswrong/cli` 并入 `verify:dist` 或 CI，校验 exports 与类型解析
- [x] 依赖自动更新：Renovate（或 Dependabot）配置，minor/patch 分组自动合并
- **验收**：CI 在 lint/test/build 之外额外输出覆盖率与体积检查，publint/attw 零错误。

---

## 1.6.0 — 健壮性与运行时行为补齐

### 8. 边界数据兼容（M）

- [x] 冻结/只读源数据（`Object.freeze`、外部 store 的 readonly 数据）：`markNodeData` 的 `Object.defineProperty` 与 `getChildren(true)` 的 `data[children] = …` 回写在冻结对象上会抛 TypeError → 降级为内部 id 走 WeakMap 兜底 + 开发期警告
- [x] 「不回写源数据」语义文档化：append / remove / insertBefore 等会同步修改用户 `children` 数组，只读数据下不可用，需在 README 标注并在开发期给出明确报错提示
- [x] 测试：`Object.freeze` 的 data 可正常渲染与展开收起（不可增删），不抛异常
- **验收**：传入冻结数据不抛错、可渲染可展开；调用需要回写源数据的方法时收到开发期警告而非静默失败。

### 9. 运行时 props 同步策略（S）

- [x] 现状盘点：`filterNodeMethod` / `labelClassName` / `animate*` 已 watch 同步；`showCollapsable` / `props`（字段映射）/ `onlyBothTree` / `direction` / `nodeKey` / `defaultExpandAll` 仍是创建期快照，运行时变更静默失效
- [x] 低成本补同步：`showCollapsable`（只影响按钮显隐）等可直接 watch 的 prop
- [x] 不支持同步的 prop（`nodeKey` / `direction` / `onlyBothTree`）：运行时变更输出开发期警告「需换 :key 重建实例」，README 标注
- [x] OKR 左树受控态：`leftData` 变更重建左树后按 `expanded-keys` / `current-key` 恢复左树状态（当前 `watch(data)` 只恢复右树）
- [x] 测试：以上同步与警告行为各一条
- **验收**：运行时改 prop 要么生效、要么有警告，不存在静默失效。

---

## 2.x — 大功能（视需求排期）

### 10. 拖拽调整层级（L）

- [ ] `draggable` prop；HTML5 DnD，节点可拖到目标节点的「前 / 后 / 内」
- [ ] `allow-drag(node)` / `allow-drop(dragNode, dropNode, type)` 规则钩子
- [ ] 事件：`node-drag-start` / `node-drag-enter` / `node-drag-leave` / `node-drag-over` / `node-drag-end` / `node-drop`
- [ ] 放置指示线样式（走 `--okr-*` 变量）；OKR 模式跨左右树拖动的规则（默认禁止，`allow-drop` 可放开）
- [ ] store 增加 `moveNode(node, target, type)`，同步修改源数据
- **验收**：拖拽后 `data` 与视图一致，`v-model:expanded-keys` 正确回写。

### 11. SVG 连接线模式（L）

- [ ] `connector: 'css' | 'svg'`，默认 `css`（现状）
- [ ] `svg` 模式：测量节点位置，用一个覆盖层 `<svg>` 绘制路径；支持 `curve` / `orthogonal` / `straight`
- [ ] 线宽/颜色继续走 `--okr-line-*` 变量；随展开/收起、尺寸变化重绘（ResizeObserver）
- **验收**：曲线模式下拖动/展开无残影，性能与 CSS 模式同量级（≤ 500 节点）。

### 12. 更多布局（M–L）

- [ ] `direction: 'vertical-reverse'`（自下而上）、`'horizontal-reverse'`（从右向左，RTL 页面）
- [ ] 垂直方向的上下双向 OKR（`only-both-tree` + `vertical`）：需要 `topData` 或复用 `leftData` 语义并改模板结构
- **验收**：四个方向连接线与按钮位置正确，主题变量通用。

### 13. 其他小项（S，随手可做）

- [x] `expand-on-click-node`：点击节点内容也切换展开（默认 false，保持原版；语义对齐 el-tree：先切换展开再触发 node-click，叶子不切换）
- [x] `accordion`：同级只允许一个展开（对齐 el-tree：只作用于交互展开，程序化方法与受控 expanded-keys 不受互斥限制）
- [ ] `unstyled` prop：只输出布局与连接线，不带卡片外观，供 Tailwind / 自有设计系统接管
- [ ] `getVisibleNodes()` / `getNodePath(key)` 辅助方法
- [ ] `node-key` 缺失时的默认 key 策略文档化（`$treeNodeId`）
- [x] SSR/Nuxt 冒烟（当前 setup 不访问 window，理论兼容；补一个 `renderToString` 测试）
- [x] `prefers-reduced-motion: reduce` 时禁用展开/收起过渡动画（`transition.css` 加媒体查询，动画关、状态直切）
- [x] `aria-setsize` / `aria-posinset` 补全 treeitem 语义
- [x] 过滤后 `show-node-num` 的计数应只统计可见子节点（当前 `node.childNodes.length` 包含被过滤隐藏的节点，左右按钮同）
- [x] 死代码清理：`util.objectAssign`、`TreeNode.hasLeftChild()` 无调用方；`TreeNode.expand(callback)` 的回调为同步即时调用，评估移除参数
- [ ] `@media print` 打印样式（隐藏展开按钮与滚动阴影）或在文档站给出导出图片的替代方案
- [x] 未知 `theme` 值的开发期警告（不在内置六套列表时，提示需自行编写 `.okr-theme-{name}` 变量）

### 14. 复选框选择模式（M–L）

- [ ] `show-checkbox` / `check-strictly`（父子不联动）/ `default-checked-keys`；节点前渲染复选框，父子联动半选态
- [ ] 方法：`getCheckedKeys` / `setCheckedKeys` / `getHalfCheckedKeys` / `isChecked`
- [ ] 事件：`check`（点击本身）/ `check-change`（状态变化）
- [ ] 样式走 `--okr-*` 变量与六套主题；OKR 模式左右两树同 key 节点的选中语义文档化
- [ ] 测试：联动/不联动、半选传播、受控用法；Demo 新增用例
- **验收**：交互与 el-tree 习惯一致，受控/非受控均可用。

### 15. 虚拟滚动（L）

- [ ] 与 `<OkrTreeViewport>` 互补：不缩放，仅对展开后的可见 treeitem 做窗口化渲染（单节点上千直属子节点的平铺场景）
- [ ] 技术预研先行：CSS 伪元素连接线依赖兄弟节点 DOM 相邻，虚拟化后需验证绝对布局 / spacer 行高两种方案哪个能保持连接线与 Group 对齐不破
- [ ] 与展开动画、`scrollToNode`、键盘漫游 tabindex、`filter` 的兼容性逐项验证
- [ ] prop：`virtual: boolean`（或独立包裹组件，预研后定）
- **验收**：10000 平铺子节点首帧 < 300ms，滚动流畅，连接线无错位、键盘导航不跳焦。

### 16. 开发体验（S）

- [ ] Vue Devtools 插件（dev only）：面板查看节点注册表、展开/选中状态
- [ ] 双语 README（README.en 与中文主文档互链，API 表以一份为准）
- [x] peerDependencies 实测：`defineSlots` 等编译宏需要 vue ≥ 3.3，当前声明 `>=3.0.0` 偏宽 → CI 用 pnpm overrides 在 vue@3.3 / 3.4 / 3.5 矩阵跑单测，按结果收紧 peer 范围（已收紧为 `>=3.3.0`；注意 vue <3.5 矩阵腿需配 `@vue/test-utils` ~2.3，≥2.4 依赖 vue 3.5 的 `app.onUnmount`）
- **验收**：Vue Devtools 可见树状态；英文用户可读文档；peer 范围与实测一致。

---

## 完成记录

| 日期       | 版本  | 内容                                                                                                                                                           | Commit              |
| ---------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 2026-09-17 | 1.0.0 | 原版复刻、Q1–Q9 修复、Demo 20 用例、dist 三格式 + d.ts                                                                                                         | `803ce65`           |
| 2026-09-17 | 1.1.0 | CSS 变量化（23 个变量）、`theme` prop、六套主题、Demo 主题切换器                                                                                               | `ea1df51`           |
| 2026-09-17 | 1.2.0 | `v-model:expanded-keys/current-key`、expandAll 等 5 方法、`#expand-btn`/`#empty`、开发期警告、CI、CHANGELOG                                                    | `4874895`           |
| 2026-09-17 | 1.3.0 | `OkrTreeGroup`、WAI-ARIA 键盘导航、`node-component`、`createTypedOkrTree<T>`                                                                                   | `115cd54`           |
| 2026-09-18 | 1.4.0 | `lazy`/`load` 懒加载、`OkrTreeViewport` 画布（缩放/平移/导出）、`getNodeEl` 方法、Demo +2                                                                      | `498e9cc` `3ea31cd` |
| 2026-09-18 | 1.7.0 | #13 低风险档（reduced-motion 直切、`aria-setsize`/`aria-posinset`、`show-node-num` 只计可见、未知 `theme` 警告、死代码清理）、Logo 接入、CI 与视觉回归红灯修复 | `6830337` `698aec4` |

## 已决定不做

- **Tailwind CSS 进入组件库本体**：连接线是伪元素像素几何，工具类无法表达；Preflight 会重新引入全局样式污染；主题诉求已由 CSS 变量满足。文档站可用 Tailwind。
- **`selectedKey` / `orkstyle` / `props.leftChildren` 等原版死代码**：见 `requirements.md` 2.1。
