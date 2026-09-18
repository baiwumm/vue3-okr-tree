# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

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
