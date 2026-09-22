# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## 1.14.0（2026-09-22）

对外只多一个导出（`BUILT_IN_THEMES`），其余全是发布前收口的测试与门禁断言。本版本同时是**第一个由 CI 通过 OIDC Trusted Publishing 真实发包**的版本。

### 新增

- **导出 `BUILT_IN_THEMES`**：内置主题名清单（`default / feishu / dark / auto / minimal / colorful`）。此前它只用于 `theme` prop 的校验告警、未从包入口导出，而姊妹包 react-okr-tree 已导出——本次补齐两端导出面对齐。需要枚举主题名的场景（主题选择器、设置面板）不再得硬编码字符串数组。

### 工程化

- `verify:dist` 补 3 条 `.cjs` 断言（对应验收表缺口 Q9 / G5）：本包是 `"type": "module"`，Node 会把 `.umd.js` 按 ESM 解析，`require()` 只能走 `.cjs` 这份产物，而这条路径此前全靠人工验证、构建端把 exports 条件写坏要到发包后才被发现。现在用 `createRequire` 真实加载产物，断言组件导出指向同一实现、`BUILT_IN_THEMES` 为 6 项、`createTypedOkrTree` / `TreeStore` 可取。
- **`shared/api.ts` 的 Methods 表补 `getNodeKey` 与 `store / root` 两行**，README 随之重新生成。`getNodeKey` 早在 `defineExpose` 里，但表上漏记，导致 README、文档站 API 页与 playground 三处同时查不到这个方法——react 侧审计的 §6.3 一度指出过，本包未修。
- 新增 `tests/api-surface.spec.ts`：API 表与 `defineExpose` 的双向防漂移（表→实例、实例→表、行数与成员数一致），与 react 侧 `tests/api-surface.spec.tsx` 同构。上面的漏记正是这条用例存在的理由。
- 新增 `tests/model/framework-boundary.spec.ts`：模型层无 Vue 2 残留写法（`new Vue(` / `eventBus` / `$on` `$emit` `$set` `$children` `$refs` / `Vue.prototype`），且从 `vue` 只引入响应式 API（收口 Q7）。与 react 侧同名文件命名一致但内容不同——react 断的是「模型层不引用框架」，本包的 `node.ts` 刻意用了 `shallowReactive`，照搬会写成假测试。
- 过渡相关补三组断言（收口 Q6 / Q8）：`transition-robustness.spec.ts` 用 `it.each` 逐个断六种内置 `animateName` 的 `okr-anim-<name>` 接线（此前只钉 `okr-fade-in` 一种），并新增「点击 +/- 收起时子容器切 `is-hidden` 而非卸载、再点恢复」的用例；`verify:dist` 的 CSS 侧由「只钉一组」改为六种逐个断 `enter-active` / `leave-active`。
- `theme.spec.ts` 补 `[vue3-okr-tree]` 警告前缀断言（此前只断文案，前缀本身零覆盖）。
- `vite.config.ts` 的 `test.include` 加 `tests/*.spec.ts`，使根级 `api-surface` 用例被收集。
- 门禁数字：单测 226 → **242**（21 → 23 个文件），覆盖率 90.85 / 81.81 / 88.94 / 93.56，`verify:dist` 实跑 34 条 `ok`。
- 新增 `docs/acceptance.md` 验收证据表，结构与 react-okr-tree 的同名文档对齐：§7 五条验收项与 Q1–Q9 逐条给到 `文件:行 + 用例名`，并记入与 react 侧的 props / 导出面双向差集实测结果。
- `docs/requirements.md` 与 `docs/development-plan.md` 的 Demo 用例数由 20 更正为 **24**（`playground/components/demos/` 实际文件数）。

## 1.13.0

### 新增

- **`unstyled` prop（2.x #13）**：去掉节点卡片的外观（背景 / 边框 / 圆角 / 阴影，含 `:hover` 态），只保留布局与连接线，供 Tailwind 或自有设计系统接管——此前唯一的退路是覆写全部 `--okr-node-*` 变量，而主题类会重新填回这些值。内边距、字号与文字色刻意不动：改 `padding` 会移动节点盒并牵动连接线的伪元素几何，需要调整请继续用 `--okr-node-*` 变量或 `label-class-name`。
  - 实现上是一个 `okr-unstyled` 容器类 + 一小段中和规则；选择器需要 5 个类才能压过方向专属规则（`.org-chart-container .vertical .org-chart-node-label .org-chart-node-label-inner` 同为特异度且位于其后，同特异度时后者胜）。Visual 套件补了一条计算样式断言同时校验「阴影被清掉」与「节点盒尺寸不变」——写第一版时正因漏了 `.org-chart-node` 一层而被该断言当场抓到。
  - 样式 gzip 3.83 → 3.88 kB（预算 4 kB，余量约 3%）。

### 变更

- **`html-to-image` 以可选 peerDependency 声明**（`^1.11.0` + `peerDependenciesMeta.optional`）：`exportImage` 的这项外部依赖此前只写在文档和运行时报错里，包管理器侧没有任何声明可循；仍不进 `dependencies`，用不到导出能力的消费者不会被拖进来。
- **视觉门禁端口可覆盖**（`OKR_VISUAL_PORT`，默认仍是 4173）：Windows 的 TCP 排除端口区间（`netsh int ipv4 show excludedportrange protocol=tcp`）会把 4173 整段保留，`vite preview` 直接 EACCES，此前在这类机器上无法本地复现视觉门禁。

## 1.12.0

### 新增

- **查询辅助方法（2.x #13）**：`getVisibleNodes()` 返回当前真正可见的节点实例——自身通过 `filter` 且各级祖先均已展开到它；折叠的子树仍挂载在 DOM 中（靠 `is-hidden` 收起），因此结果不等于 DOM 里的节点数，OKR 左子树按 `leftExpanded` 计入。`getNodePath(key | data | node)` 返回从顶层节点到目标节点的链路（含目标自身，不含虚拟根），未命中返回空数组；OKR 左树节点的链路留在左树内（顶层为根节点的左侧镜像），不跨接到右树根。两者均不依赖 `node-key` 之外的新配置。测试 +6。
- **`@media print` 打印样式（2.x #13）**：打印时隐藏展开按钮与画布工具栏（纸上点不动的交互件），并去掉节点卡片与画布的 `box-shadow`（部分打印引擎会把阴影渲染成灰块且费墨）。折叠的子树按屏幕原样输出，需要整树打印请先调 `expandAll`。Visual 套件补一条 `emulateMedia({ media: 'print' })` 的计算样式断言（不新增截图基线）——这是唯一能覆盖该规则的门禁，其余检查都只看屏幕媒体。

### 文档

- **node-key 缺失策略文档化（2.x #13）**：README 新增「需要注意的行为」一节——此前 `append` 等回写类方法的只读数据警告就指向该节名，但章节并不存在。现说明：未配 `node-key` 时组件只在源数据对象上写入不可枚举的 `$treeNodeId` 作为 `v-for` key，**节点注册表是空的**，所以 `getNode(data 对象)` 返回 `null`、`getExpandedKeys` / `getCheckedKeys` 返回空数组、受控与按 key 的方法均不生效，只有传 Node 实例以及 `getVisibleNodes` / `expandAll` / `filter` 这类不依赖注册表的接口可用；深拷贝源数据会丢掉该标记、被当作不同节点。同时补写冻结 / 只读源数据下回写类方法的行为。

### 修复

- 视觉回归门禁的半像素误报（`39d8b08`）与 CI Linux 基线缺失（`be50ee0`）：demo 导航 `.demo-nav` 显式取整行高，`tests/visual/snap.ts` 在截图尺寸不符时补出可定位真因的提示，并补齐 20 张 `*-chromium-linux.png` 基线使 Visual job 首次转绿。仅测试与 CI 侧，无运行时影响。

## 1.11.0

### 新增

- **SVG 连接线模式（2.x #11）**：`connector: 'css' | 'svg'`（默认 css）+ `connector-shape: 'curve' | 'orthogonal' | 'straight'`（仅 svg 模式生效，默认 curve）。要点——
  - **布局零改动**：svg 模式只中和连线伪元素的边框（保留其占位盒，垂直模式 is-leaf 的间隔伪元素不受影响），线条改由 OkrTree 内的覆盖层 `<svg>` 按可见父子边绘制；展开按钮的 +/− 符号同为伪元素边框，已明确排除在中和范围外；
  - **路径形状**：curve 三次贝塞尔（控制点随主轴延伸，最长 40px）、orthogonal 中点直角折线、straight 两点直线；线色/线宽继续走 `--okr-line-color` / `--okr-line-width`，全部主题与自定义变量零配置适配；
  - **锚点随模式镜像**：vertical 出底入顶；horizontal 右树出右入左、OKR 左树出左入右；根节点到 OKR 左树顶层节点绘制镜像连线，收起时与 CSS 模式同形的残枝线（垂直向下 20 / 水平侧向 10 / OKR 根左侧 20）；
  - **无残影重绘**：onUpdated + ResizeObserver + animate 过渡期 rAF 连续重绘三重触发，展开/收起动画期间路径持续贴合布局；测量批量读取一次成形，≤500 节点与 CSS 模式同量级；
  - 运行时切换 `connector` / `connector-shape` 即时生效；非法值输出开发期警告并回退。
- **ESM 产物压缩（构建修复）**：Vite lib 多格式构建中 `es` 输出不经过压缩（cjs/umd 正常，es 带完整缩进换行，gzip 体积高出约 40%），`post-build` 补一次 `transformWithEsbuild` 压缩——ESM gzip 从 24.2 kB 降至 16.2 kB，三种格式首次同量级；压缩后与构建期 sourcemap 错位，`es.js.map` 随之移除（cjs/umd 的 map 不受影响）。size-limit 的 ESM 预算回到 19 kB。
- 测试 +12（模式切换、三形状、残枝、filter 重算、OKR 左树镜像），全量 219 通过；Demo / 文档站新增「SVG 连接线」交互用例（模式与形状实时切换）。

## 1.10.0

### 新增

- **拖拽调整层级（2.x #10）**：`draggable` / `allow-drag(node)` / `allow-drop(draggingNode, dropNode, type)` 三 prop + `node-drag-start / enter / leave / over / end / drop` 六事件 + `moveNode(data, target, type)` 方法。要点——
  - 放置分区对齐 el-tree 的 25%/50%/25%，并按布局方向换轴：horizontal（同级上下排列）按 Y 轴 prev 上 / inner 中 / next 下；vertical（同级左右排列）按 X 轴 prev 左 / inner 中 / next 右。指示线画在节点卡片上（prev/next 指示线、inner 虚线描边），颜色用 `--okr-drop-color`（默认取 `--okr-current-bg`）定制；
  - `moveNode` 同步修改源数据 children（与 append / remove 语义一致，冻结数据下跳过写入并警告）；跨节点移动后修正整棵子树的 `level` 并重注册节点注册表；inner 放置目标自动展开（懒加载目标视为已加载）；
  - 硬性规则：不可拖放到自身或自己的子树内（`contains` 校验，`allow-drop` 不能越过）；disabled 节点不可拖；
  - OKR 模式跨左右树拖动默认禁止，`allow-drop` 明确返回 true 放开——放开后整棵子树的 `isLeftChild` 标记与 nodesMap / leftNodesMap 注册表随之迁移；
  - 事件签名：`node-drag-start(node, event)`、`node-drag-enter/leave/over(draggingNode, dropNode, event)`、`node-drag-end(draggingNode, dropNode | null, dropType | null, event)`、`node-drop(draggingNode, dropNode, dropType, event)`；未完成放置时 `node-drop` 不触发、`node-drag-end` 的后两参为 null。
- 测试 +11（三种放置与源数据同步、防自嵌套、allow 钩子、moveNode 层级修正、OKR 默认禁止与放开后的注册表迁移），全量 207 通过；Demo / 文档站新增「拖拽」交互用例。

## 1.9.0

### 新增

- **复选框选择模式（2.x #14）**：`show-checkbox` / `check-strictly` / `default-checked-keys` 三 prop + `check` / `check-change` 两事件 + `getCheckedKeys` / `getCheckedNodes` / `setCheckedKeys` / `getHalfCheckedKeys` / `getHalfCheckedNodes` / `isChecked` 六方法。交互与 el-tree 习惯一致——
  - 勾选父节点向下联动全部后代（**含 disabled 节点**，disabled 仅阻止直接点击）、祖先按子树重算全选/半选；「全部子节点选中 ⇒ 父选中」，唯一子链选中会让父节点直接全选；
  - `check-strictly` 关闭联动，勾选只作用于自身；`default-checked-keys` 创建期生效（需 node-key），运行时变更先清空再应用，data 重建后不恢复；
  - `check` 只在点击复选框时触发（携带全量勾选信息）；`check-change` 在每个状态变化的节点各触发一次（联动、批量 setCheckedKeys、增删子节点级联均覆盖）；
  - 键盘：Space 切换勾选、Enter 选中（`show-checkbox` 开启时）；treeitem 输出 `aria-checked`（half → `mixed`）；
  - OKR 模式：左右两树勾选**独立维护**（点击只作用于所在树），`setCheckedKeys` / `getCheckedKeys` 等按 key 对左右同时生效 / 合并去重（与 `setCurrentNodeKey` 的既有语义一致）；
  - 样式复用既有 `--okr-*` 变量（边框 `--okr-line-color`、填充 `--okr-current-bg` 等），六套主题与自定义主题零配置适配；勾选状态在增删子节点、懒加载、`updateChildren` 增量重建后自动重算祖先。
- Demo / 文档站新增「复选框」交互用例（check-strictly 切换、事件日志、方法演示）；API 表（`shared/api.ts`）补 Attributes 3 行、Events 2 行、Methods 6 行。

## 1.8.0

### 新增

- **`accordion` 手风琴模式**：用户展开某节点时自动收起同级兄弟，交互入口含 +/- 按钮、点击节点内容（需 `expand-on-click-node`）与键盘方向键。语义与 el-tree 对齐——只作用于**交互展开**，`expandNode` 等程序化方法与受控 `expanded-keys` 不经互斥（受控列表始终是唯一事实来源，传多个同级 key 全部生效）。
- **`expand-on-click-node`**：点击节点内容切换该节点展开 / 收起（默认 false 保持原版）。叶子节点点击只选中不切换；选中态与 `node-click` 照常触发。与 el-tree 一致：先切换展开、再触发 node-click。OKR 模式根节点点击内容只切换右侧子树，左侧仍由左侧按钮控制。
- **SSR 兼容坐实**：新增 `tests/ssr` 冒烟测试（Node 环境无 DOM，`vue/server-renderer`），覆盖三种模式、OKR 左树、受控 props、`#default` / `#empty` 插槽与 OkrTreeGroup / OkrTreeViewport 包裹；确认 setup 与渲染阶段不访问 `window` / `document`，浏览器专属能力均在挂载后且带 `typeof` 守卫。
- **peer 范围实测收紧：`vue >= 3.3.0`**（此前声明 `>=3.0.0`）。`defineSlots` 是 3.3 引入的编译宏，3.0–3.2 的 SFC 编译器无法构建使用本库的项目。CI 新增 `peer-matrix` job：用 pnpm overrides 在 vue 3.3 / 3.4 / 3.5 三档跑全量单测（183 用例，实测三档全部通过）。矩阵腿需成对钉 `@vue/test-utils`——test-utils ≥2.4 依赖 vue 3.5 的 `app.onUnmount`，vue <3.5 的腿配 `~2.3.2`，该组合下「缺 leftData 抛错」用例改为同时接受同步抛错与 `handleError` 打印两种 harness 行为。
- Demo / 文档站新增「手风琴」「点击节点内容展开」两个交互用例；API 表（`shared/api.ts` 单一来源）补两行。

## 1.7.0

### 新增

- **`prefers-reduced-motion` 支持**：系统开启「减弱动态效果」时，展开/收起过渡与 `scrollToNode` 的平滑滚动自动关闭。不止是 CSS 媒体查询掐掉过渡——组件同时把 `animate` 视为关闭（撤掉撑容器高度的延迟），否则收起后会留下一段空白，做不到状态直切。
- **`aria-setsize` / `aria-posinset`**：`role="treeitem"` 补齐在兄弟组内的序号与总数，按**可见**节点计数，被 `filter` 隐藏的项不再被读屏播报。
- **未知 `theme` 值的开发期警告**：`theme` 允许任意自定义名字（用于挂用户自己的 `.okr-theme-{name}`），因此不收紧类型，只在名字不在内置六套清单时提示，避免拼错主题名时毫无视觉变化却找不到原因。内置清单收敛为 `BUILT_IN_THEMES`，`TreeTheme` 类型由它派生。
- **品牌 Logo 与站点图标**：定稿 Logo，接入 README / 文档站（favicon、apple-touch-icon、`og:image` / `twitter:image`）与 Playground。
- **文档站部署目标改为 Cloudflare Pages/Workers**：删除原 GitHub Pages workflow（1.5.0 条目里写的「push main 后自动部署到 GitHub Pages」是当时的事实，此后被本条取代），`docs:build:full` 合并 Playground 为 `/playground/` 子路径，域名定为 `vue3-okr-tree.baiwumm.com` 并落地到 README 与 `package.json` 的 `homepage`。
- **`snapshot-bootstrap.yml`**：手动触发，在真实 runner 上生成 Linux 视觉基线（`*-chromium-linux.png`）并以 artifact 上传，供下载提交。

### 修复

- **`show-node-num` 过滤后计数错误**：数字此前直接取 `childNodes.length`，把被 `filter` 隐藏的节点也算进去，与展开后实际看到的子节点数不符；右侧按钮与 OKR 左树按钮一并改为只计可见子节点。
- **main 上 CI 与视觉回归两条 workflow 长期红灯**：CI 的 Node 20 矩阵项在 `setup-node` 步骤崩溃（pnpm 11 依赖 `node:sqlite`，要求 Node ≥ 22.13）；视觉回归因仓库只有 win32 基线、Linux 缺失基线必判失败。矩阵改为 22 / 24 并加 `fail-fast: false`，视觉回归 runner 固定 `ubuntu-24.04`（`ubuntu-latest` 将于 2026-10-19 迁移 Ubuntu 26，届时系统字体变化会使基线集体失配）。

### 变更

- **`TreeNode.expand()` 去掉 `callback` 形参**：该回调是同步立即调用的，等价于调用方自己的下一行。签名为 `expand(expandParent?: boolean)`。`TreeNode` 虽有导出，但 README 与 API 表未收录该方法，常规用法不受影响。
- 清理无调用方的死代码：`util.objectAssign`、`TreeNode.hasLeftChild()`。

## 1.6.0

### 新增

- **冻结 / 只读源数据兼容**：传入 `Object.freeze` 数据（或外部 store 的 readonly 数据）不再抛 TypeError——内部 id 标记自动降级为 WeakMap 兜底（`v-for` key 与按 data 查找不受影响）；渲染、展开/收起、选中、过滤等只读操作完全正常。需要回写源数据的操作（`append` / `insertBefore` / `insertAfter` / `remove` / `updateKeyChildren` / 懒加载 resolve）在冻结数据上自动跳过写入并输出开发期警告，不再静默失败（README 已标注该语义）。
- **运行时 props 同步策略**：运行时改 prop 要么生效、要么有警告，不存在静默失效——
  - 即时生效：`filterNodeMethod` / `labelClassName` / `animate*`（1.2.0 起）、`showCollapsable`、`defaultExpandAll`（影响后续新建节点）、`props` 字段映射（`label` 动态读取即时生效；`children` 字段变更触发增量重建并恢复受控态）；
  - 创建期快照 + 开发期警告：`nodeKey` / `direction` / `onlyBothTree` 运行时变更提示「请为组件绑定 `:key` 重建实例」（README 已标注）。
- **OKR 左树受控态恢复**：`leftData` 变更重建左树后，按 `expanded-keys` / `current-key` 恢复左树展开与选中状态（此前 `data` 重建只恢复右树）。

## 1.5.0

### 新增

- **VitePress 文档站**（`docs-site/`）：按「指南 / 主题 / API / 迁移 / 更新日志」组织，20+ 用例直接复用 Playground 组件源码可交互；`pnpm docs:dev` / `docs:build`，push main 后自动部署到 GitHub Pages（Playground 同步发布到 `/playground/` 子路径）。API 表单一来源化：`shared/api.ts` 同时驱动 Playground 表格、文档站与 README（`pnpm gen:readme` 生成）。
- **性能基线**（详见 `docs/perf.md`）：2000 节点基准脚本（`pnpm bench`，jsdom）与浏览器实测（Playwright，首渲染 ≈ 137ms，达标 < 300ms）；`updateChildren` 逐层脏检查——原地变更只重建受影响路径，未受影响节点实例保持复用；**`deep-watch: false`** prop（创建期生效）关闭深度侦听、只响应 `data` 引用变化。
- **工程化**：vitest 覆盖率阈值（statements/lines/functions ≥ 80%）；size-limit 体积预算（es 19kB / style 3.6kB / umd 19.5kB gzip，超限 CI 失败）；publint + attw 包体检（`pnpm verify:package`，双 🌟 零错误）；Renovate 自动依赖更新；CJS 类型修复（新增 `dist/index.d.cts`，require 条件不再 "Masquerading as ESM"）。
- **发布流程**：`release.yml`——推送 `v*` tag 自动校验版本、跑全部门禁、`npm publish --provenance` 并创建 GitHub Release；`publishConfig.access: public`。
- **Playwright 视觉回归**（`tests/visual/`，独立 `visual.yml` workflow，失败上传 diff）：三模式、OKR 对齐（含 OkrTreeGroup 实况 Demo）、六套主题、动画落定态、懒加载、画布缩放共 14 个快照用例。

### 修复

- CJS require 的类型解析：`exports["."].require` 指向 `index.d.cts`（此前与 ESM 共用 `index.d.ts`，被 attw 判为类型格式不符）。

### 变更

- Playground 样式拆分：`style-base.css`（全局 reset，仅 Playground）与 `style.css`（类作用域，文档站复用）。
- 开发依赖新增：vitepress、@playwright/test、@vitest/coverage-v8、size-limit、@size-limit/file、publint、@arethetypeswrong/cli、html-to-image（Demo 导出用例用；库本体保持零运行时依赖）。

## 1.4.0

### 新增

- **懒加载子节点**：`lazy` + `load(node, resolve, reject)` props。初始 data 中没有 `children`（或为空数组）的节点视为未加载，首次展开时调用 `load`；resolve 后子节点同步写入源数据 `children`（与 `append` 语义一致）并展开，之后不重复请求；`reject` / 抛错时回到折叠态、可重试。未加载节点：`isLeaf` 由 `props.isLeaf` 字段（或函数）决定，默认视为有子节点；展开按钮出现 `is-loading` 加载中态（`#expand-btn` 作用域新增 `loading`）；`show-node-num` 不显示数字；`expandAll` / `expandNode` / `scrollToNode` / `default-expanded-keys` / `v-model:expanded-keys` 触发时先加载、完成后再展开；OKR 左树节点经 `node.isLeftChild` 区分；`filter` 不触发未加载节点的请求。
- **`<OkrTreeViewport>` 画布组件**：包裹树即可缩放平移——滚轮以指针为中心缩放、按住拖拽平移（3px 阈值不影响节点点击）、双击复位、触控双指捏合。props：`min-zoom` / `max-zoom` / `zoom-step` / `v-model:zoom` / `v-model:offset` / `wheel-behavior`（`ctrl-zoom`（默认，按住 Ctrl/⌘ 才缩放不劫持页面滚动）/ `zoom` / `scroll`）/ `toolbar`。方法：`zoomIn` / `zoomOut` / `reset` / `fitToScreen(padding)` / `centerNode(key)`（先展开祖先再居中）/ `exportImage({ type: 'png' | 'svg', scale, background, toPng?, toSvg? })`（基于 html-to-image 按需动态 import，未安装时给出明确错误；可直接传入渲染函数）。工具栏插槽 `#toolbar="{ zoom, zoomIn, zoomOut, reset, fit }"` 与默认工具栏；可与 `OkrTreeGroup` 组合。
- **`getNodeEl(data)` 方法**（OkrTree）：按 Node / key / data 获取节点 DOM 元素。
- 开发期警告：`lazy` 缺 `load`、传 `load` 未开 `lazy`。
- Demo 新增「懒加载」「画布缩放」两个用例；插件注册 `<okr-tree-viewport>`。

### 依赖

- devDependencies 新增 `html-to-image`（仅供 Demo 导出用例使用；库本体保持零依赖，运行时按需动态 import）。

## 1.3.0

### 新增

- **`<OkrTreeGroup>`**：包裹多棵 OKR 树，测量组内左子树容器的最大自然宽度并统一，使各树根节点水平坐标完全一致；自动响应成员挂载/更新/尺寸变化，`align` prop 与 `refresh()` 方法。替代原版"业务层手动测量 DOM"方案。
- **键盘可访问性**：`role="tree" / "treeitem" / "group"`、`aria-level` / `aria-expanded` / `aria-selected` / `aria-disabled`、漫游 tabindex；`↑↓` 移动、`→` 展开/进入、`←` 收起/返回父节点、`Enter`/`Space` 选中、`Home`/`End`；OKR 左树方向键镜像；焦点环变量 `--okr-focus-color` / `--okr-focus-width`。
- **`node-component` prop**：以 `{ node, data }` 为 props 渲染任意组件。
- **`createTypedOkrTree<T>()`**：类型收窄 `data` / `leftData` 与插槽作用域中的 `data`。
- 插件方式注册时同时注册 `<okr-tree-group>`。

### 变更

- 节点内容渲染优先级调整为 `#default` 插槽 > `node-component` > `render-content`（此前 `render-content` 高于插槽，与文档不一致）。
- 左子树容器补齐与右子树一致的 `is-hidden` / 动画状态类。

## 1.2.0

### 新增

- **受控状态**：`v-model:expanded-keys`（`expanded-keys` prop + `update:expandedKeys` 事件）与 `v-model:current-key`（`current-key` prop + `update:currentKey` 事件），需 `node-key`。未传时保持原版非受控行为。
- **方法**：`expandAll()`、`collapseAll()`、`expandNode(data, expandParent = true)`、`collapseNode(data)`、`scrollToNode(data, options?)`（先展开祖先再 `scrollIntoView`）。
- **插槽**：`#expand-btn="{ node, data, expanded, side }"`（替代 `node-btn-content`，`show-node-num` 优先）、`#empty`（`data` 为空时渲染）。
- **开发期警告**（仅非 production，UMD/CDN 下不输出）：重复 `node-key`；`onlyBothTree` 但 `direction` 非 `horizontal`；传 `leftData` 未开 `onlyBothTree`；受控 prop / `default-expanded-keys` 缺 `node-key`。
- GitHub Actions CI（lint / typecheck / test / build / verify-dist / pack）。

### 内部

- `TreeStore` 新增 `forEachNode` / `expandAll` / `collapseAll` / `expandNode` / `collapseNode` / `getExpandedKeys` / `setExpandedKeys`。
- 节点根元素登记到树上下文，供 `scrollToNode` 定位。

## 1.1.0

### 新增

- **CSS 变量主题化**：全部外观取值通过 `var(--okr-*, 默认值)` 暴露（连接线 / 节点卡片 / 按钮 / 选中态 / 禁用态 共 23 个变量），默认值内联在使用点，主题类可放在根容器或任意祖先。
- **`theme` prop** 与内置主题 `default` / `feishu` / `dark` / `auto`（跟随 `prefers-color-scheme`）/ `minimal` / `colorful`（按 `data-level` 层级着色）；支持自定义主题名。
- 节点根元素新增 `data-level` 属性。
- Demo 站顶部全局主题切换器。

### 兼容性说明

- 节点背景 / 文字色 / 边框 / 圆角以 `:where()` 零优先级声明，主题选中态只设变量，用户通过 `current-lable-class-name` 传入的单类样式仍可覆盖；`default` 主题外观与 1.0.0 完全一致。

## 1.0.0

- 基于 Vue 3 完整复刻 [vue-okr-tree](https://github.com/qq449245884/vue-okr-tree) v1.0.17：全部 props / events / methods 对齐，三种布局（垂直 / 水平 / OKR 左右双向），纯 CSS 连接线。
- 相对原版的修复（详见 `docs/requirements.md` 第 6 节）：多根数据过滤、OKR 左右树同 key 覆盖、`data` 原地变更增量更新、`animate` / `animate-duration` 真实生效、内建 `align-root` 根对齐、`props.disabled` 真实禁用、开放 `#default` 插槽、移除全局 `* {}` 样式污染。
- 产物：ESM / CJS / UMD + `style.css` + 单文件 `index.d.ts`。
