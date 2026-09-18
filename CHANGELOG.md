# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## 1.7.0

### 新增

- **`prefers-reduced-motion` 支持**：系统开启「减弱动态效果」时，展开/收起过渡与 `scrollToNode` 的平滑滚动自动关闭。不止是 CSS 媒体查询掐掉过渡——组件同时把 `animate` 视为关闭（撤掉撑容器高度的延迟），否则收起后会留下一段空白，做不到状态直切。
- **`aria-setsize` / `aria-posinset`**：`role="treeitem"` 补齐在兄弟组内的序号与总数，按**可见**节点计数，被 `filter` 隐藏的项不再被读屏播报。
- **未知 `theme` 值的开发期警告**：`theme` 允许任意自定义名字（用于挂用户自己的 `.okr-theme-{name}`），因此不收紧类型，只在名字不在内置六套清单时提示，避免拼错主题名时毫无视觉变化却找不到原因。内置清单收敛为 `BUILT_IN_THEMES`，`TreeTheme` 类型由它派生。
- **品牌 Logo 与站点图标**：定稿 Logo，接入 README / 文档站（favicon、apple-touch-icon、`og:image` / `twitter:image`）与 Playground。
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
