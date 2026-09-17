# vue3-okr-tree 需求分析文档

> 基于 `E:\personal-project\vue-okr-tree`（Vue 2 版本，v1.0.17）的功能分析，目标是用 Vue 3 完整复刻为 npm 包 `vue3-okr-tree`，并交付功能对齐的 Demo 演示页。
>
> **2026-09-16 评审更新**：对照原仓库源码逐项核实后，修正了与源码不符的描述（动画组数、animate-duration 等），补充了 Methods 边界行为，并新增**第 6 节「原版行为怪癖与兼容性决策」**——所有与原版行为不一致的地方以该节决策为准。

## 1. 项目概述

- **原项目**：`vue-okr-tree`，一个基于 Vue 2 的"组织架构树 / OKR 树"组件。特殊之处在于支持类似飞书 OKR 的**根节点左右双向展开**布局。
- **新项目**：`vue3-okr-tree`（包名已在 npm 确认可用），基于 Vue 3 重新实现，**对外 API 与原仓库对齐**，视觉与交互效果一致；实现层面允许采用更优方案（Composition API、Vite、TS 等）。与原版的有意差异仅限第 6 节决策清单所列（均为 bug 修复或死代码清理，不改变文档化 API 语义）。
- **交付物**：
  1. 可发布的 Vue 3 组件库（ESM + UMD + CSS + 类型声明）；
  2. 功能对齐的 Demo 文档站（覆盖原 Demo 页全部用例）。

## 2. 原仓库架构分析

```
src/lib/index.js                      # 导出 VueOkrTree
src/lib/vue-okr-tree/
  ├─ OkrTree.vue                      # 树容器（props 定义、对外方法、全局样式）
  ├─ OkrTreeNode.vue                  # 节点组件（递归渲染、左右子树、展开按钮）
  └─ model/
      ├─ tree-store.js                # TreeStore：节点注册表、filter、增删改、选中态
      ├─ node.js                      # Node 类：数据节点模型（expanded/level/childNodes…）
      ├─ util.js                      # getNodeKey / markNodeData（$treeNodeId 隐藏标记）
      ├─ merge.js                     # objectAssign 浅合并工具（node.js 依赖）
      └─ transition.css               # 展开过渡动画（6 组 okr-* + 若干未使用类）
```

核心设计（可整体平移到 Vue 3）：

- **数据模型与视图分离**：`TreeStore` / `Node` 是纯 JS 类，不依赖 Vue 响应式内部机制，这是 Vue 3 迁移成本最低、最值得保留的部分。
- **事件总线（实为死代码）**：原实现 provide/inject 了 `okrEventBus`（`new Vue()`），但 `OkrTreeNode` 注入后**从未使用**，所有事件实际都通过 `tree.$emit` 传递——Vue 3 版直接删除即可，无需替换实现。
- **节点数据标记**：通过不可枚举属性 `$treeNodeId` 在源数据上标记内部 node id，未配置 `node-key` 时作为 v-for key。
- **纯 CSS 连接线**：所有连线由 `::before / ::after` 绘制（竖向：上下连接线 + 圆角；横向：左右连接线），无 JS 计算。

### 2.1 原仓库死代码清单（决定不移植）

以下代码在原仓库中声明了但从未被使用或从未生效，Vue 3 版**有意不移植**，验收对照时不算缺失：

| 死代码                                    | 位置                          | 说明                                                                                                                                                 |
| ----------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `selectedKey` prop                        | OkrTree.vue / OkrTreeNode.vue | 声明并逐层透传，但无任何读取逻辑；原 Demo 文档也未列                                                                                                 |
| `orkstyle` prop                           | OkrTree.vue                   | 声明后在模板作为无值 attribute 透传，无对应 CSS、无读取逻辑                                                                                          |
| `props.leftChildren`                      | OkrTree.vue props 默认值      | 仅在默认值对象中声明，全库无读取（左子树数据实际只走 `leftData`）                                                                                    |
| `props.disabled`                          | OkrTree.vue props 默认值      | 声明未使用（原 README 已知问题，见 5.3 改进 4）                                                                                                      |
| `findNearestComponent`                    | model/util.js                 | element-ui 残留，无调用方                                                                                                                            |
| `updateLeftLeafState`                     | model/node.js                 | 定义后无调用方                                                                                                                                       |
| `computNodeStyle` / `computLeftNodeStyle` | OkrTreeNode.vue computed      | 定义后模板未使用                                                                                                                                     |
| `ondeClass`                               | OkrTree.vue computed          | 空实现，无引用                                                                                                                                       |
| `okrEventBus`                             | OkrTree.vue / OkrTreeNode.vue | 注入未使用（见上）                                                                                                                                   |
| `animate-duration`（原实现）              | OkrTree.vue                   | prop 声明了但未传入 TreeStore，`OkrTreeNode` 读 `store.animateDuration` 恒为 `undefined`，实际从未生效——Vue 3 版**修复接线**而非复刻（见第 6 节 Q5） |

## 3. 功能需求（对外 API，与原组件对齐）

### 3.1 Attributes（Props）

| 参数                       | 说明                                                                                                                                                                                                           | 类型            | 默认值               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | -------------------- |
| `data`                     | 展示数据（数组，支持多根）                                                                                                                                                                                     | array           | 必填                 |
| `direction`                | 树的展开方向：`vertical`（自上而下）/ `horizontal`（自左向右）                                                                                                                                                 | string          | `vertical`           |
| `onlyBothTree`             | 飞书 OKR 模式：子树在根节点左右两侧展开。仅在 `direction="horizontal"` 时有效，必须同时提供 `leftData`                                                                                                         | boolean         | `false`              |
| `leftData`                 | 左子树数据（配合 `onlyBothTree`）                                                                                                                                                                              | array           | —                    |
| `label-width`              | 节点宽度。number → px；string → 直接作为 style.width                                                                                                                                                           | string/number   | auto                 |
| `label-height`             | 节点高度。number → px；string → 直接作为 style.height                                                                                                                                                          | string/number   | auto                 |
| `label-class-name`         | 节点 className，支持 `Function(node)` 或固定字符串。**参数为内部 Node 实例**（源数据在 `node.data`）                                                                                                           | Function/String | —                    |
| `current-lable-class-name` | 当前选中节点的 className（保留原拼写，兼容对齐）。参数同上                                                                                                                                                     | Function/String | —                    |
| `show-collapsable`         | 节点是否可展开/折叠（显示 +/- 圆形按钮）。注意：为 `false` 时组件**强制全部展开**（原版行为）                                                                                                                  | boolean         | `false`              |
| `show-node-num`            | 折叠时在圆形按钮内显示子节点数量                                                                                                                                                                               | boolean         | `false`              |
| `default-expand-all`       | 默认展开全部（仅在 show-collapsable 为 true 时有意义，见上）                                                                                                                                                   | boolean         | `false`              |
| `render-content`           | 节点内容区渲染函数 `(h, node)`。**`node` 为内部 Node 模型实例**（源数据在 `node.data`、文本在 `node.label`），与 element-ui `(h, { data })` 惯例不同，保持原版语义；`h` 由组件从 vue 导入后显式传入            | Function        | —                    |
| `node-btn-content`         | 展开按钮内容渲染函数 `(h, node)`，参数约定同上                                                                                                                                                                 | Function        | —                    |
| `props`                    | 字段映射配置（见 3.2）                                                                                                                                                                                         | object          | 见下                 |
| `node-key`                 | 节点唯一标识字段名                                                                                                                                                                                             | string          | —                    |
| `default-expanded-keys`    | 默认展开节点的 key 数组（需设置 node-key）                                                                                                                                                                     | array           | —                    |
| `filter-node-method`       | 过滤方法 `(value, data, node)`，返回 false 隐藏。`filter('')` 空值时每个节点可见性仍由该函数返回值决定，需对空值返回 `true` 以恢复全部显示                                                                     | Function        | —                    |
| `animate`                  | 是否开启展开过渡动画                                                                                                                                                                                           | boolean         | `false`              |
| `animate-name`             | 动画名：`okr-fade-in-linear` / `okr-fade-in` / `okr-zoom-in-center` / `okr-zoom-in-top` / `okr-zoom-in-bottom` / `okr-zoom-in-left`。前 5 种为原 Demo 文档所列，第 6 种为 CSS 中实际存在但原文档遗漏，一并提供 | string          | `okr-zoom-in-center` |
| `animate-duration`         | 动画时长 ms。原版声明该 prop 但未接线、从未生效；Vue 3 版修复为真实生效（见第 6 节 Q5）                                                                                                                        | number          | 200                  |
| `current-node-key`         | 初始选中节点 key（原代码内部支持，需保留）                                                                                                                                                                     | string/number   | —                    |

### 3.2 props 配置项

| 参数       | 说明                                                                                      | 类型            | 默认值     |
| ---------- | ----------------------------------------------------------------------------------------- | --------------- | ---------- |
| `label`    | 节点文本字段，支持 string 或 `function(data, node)`                                       | string/Function | `label`    |
| `children` | 子节点字段                                                                                | string          | `children` |
| `disabled` | （原代码中声明但从未使用）禁用字段——Vue 3 版实现真实禁用行为后此配置才生效，见 5.3 改进 4 | string          | `disabled` |

> 原 `leftChildren` 配置为死配置（声明未读取，见 2.1），不移植；左子树数据只通过 `leftData` prop 传入。

### 3.3 Events

| 事件名             | 说明                                                | 回调参数                           |
| ------------------ | --------------------------------------------------- | ---------------------------------- |
| `node-click`       | 节点被点击（同时设置当前选中态）                    | (data, node, nodeComponent)        |
| `node-expand`      | 节点展开                                            | (data, node, nodeComponent)        |
| `node-collapse`    | 节点收起                                            | (data, node, nodeComponent)        |
| `node-contextmenu` | 节点右键（仅当外部绑定了该事件时才 preventDefault） | (event, data, node, nodeComponent) |

> `node` 均为内部 Node 模型实例，`nodeComponent` 为递归节点组件实例。

### 3.4 Methods（通过组件 ref 调用）

| 方法                           | 说明                                                                                                                                                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `filter(value)`                | 触发过滤，value 传入 filter-node-method；onlyBothTree 模式下同时过滤左子树。未设置 filter-node-method 时抛 `Error("[Tree] filterNodeMethod is required when filter")`。过滤语义按第 6 节 Q1 修复后的全树过滤实现 |
| `updateKeyChildren(key, data)` | 用新数据替换 key 节点的全部子节点。需 node-key，缺失抛 Error（原码文案语义 `[Tree] nodeKey is required in updateKeyChild`）                                                                                      |
| `getNode(data)`                | 按 Node 实例 / key / data 对象获取内部 Node。data 对象方式在未设 node-key 时依赖 `$treeNodeId` 隐藏标记                                                                                                          |
| `setCurrentNode(node)`         | 设置当前选中节点（传 Node 实例）。需 node-key，缺失抛 Error                                                                                                                                                      |
| `setCurrentKey(key)`           | 按 key 设置选中。需 node-key，缺失抛 Error；传 null 取消高亮                                                                                                                                                     |
| `getCurrentKey()`              | 获取当前选中节点 key，无选中返回 null。**需 node-key，缺失抛 Error**（原码行为，原 Demo 文档未标注，此处补全）                                                                                                   |
| `getCurrentNode()`             | 获取当前选中节点 data，无选中返回 null                                                                                                                                                                           |
| `remove(data)`                 | 删除节点（Node 实例 / key / data 对象均可）。**必须设置 node-key**：未设置时 nodesMap 为空，方法静默无效（原码行为，原 Demo 文档有标注，保留并文档化）                                                           |
| `append(data, parentNode)`     | 在 parentNode 下追加子节点。parentNode 支持 key / data 对象 / Node 实例。**会同步修改用户源数据的 children 数组**（原码行为，复刻并文档化，见第 6 节 Q3）                                                        |
| `insertBefore(data, refNode)`  | 在 refNode 前插入。参数约定与源数据副作用同上                                                                                                                                                                    |
| `insertAfter(data, refNode)`   | 在 refNode 后插入。参数约定与源数据副作用同上                                                                                                                                                                    |

### 3.5 视觉与交互需求

1. **垂直模式**：自上而下组织架构图，float 布局 + 伪元素连接线，兄弟节点间横线带 5px 圆角，父节点向下垂直引线。
2. **水平模式**：自左向右，flex 布局 + 左侧连接线，支持左右双向（onlyBothTree）。
3. **节点卡片**：白底 + `box-shadow: 0 1px 10px rgba(31,35,41,.08)`，hover 加深阴影并变 pointer。
4. **展开按钮**：20px 白色圆形 +/- 按钮，位于节点下（vertical）或右（horizontal）；OKR 模式根节点左右各一个；hover 放大 1.15；`show-node-num` 时折叠态显示子节点数。
5. **折叠态指示线**：节点折叠后仍显示一段指向子树方向的短线（`.collapsed` 伪元素）。
6. **单根/单子节点**：`one-branch` 类去除多余连接线与内边距。
7. **根对齐**：onlyBothTree 模式下展开/收起不改变根节点位置（原 2023/02/16 修复点，Vue 3 版直接内建对齐能力，见 5.3 改进）。
8. **过渡动画**：6 组 okr-* transition（见 3.1 animate-name），作用于左右子树容器的 v-if/visibility 切换。
9. **选中高亮**：`is-current` 类 + `current-lable-class-name` 自定义。

## 4. Demo 演示页需求（与原 Demo 页逐项对齐）

原 Demo（`src/components/VueOkrTreeDeom.vue`）按顺序包含以下用例，每个用例 = 可交互示例 + 高亮源码展示（BaseCard 卡片 + 代码高亮）：

| #     | 用例                  | 要点                                                                                                                        |
| ----- | --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1     | 基础用法              | 默认垂直方向，纯数据渲染                                                                                                    |
| 2     | 水平方向              | direction="horizontal"                                                                                                      |
| 3     | 节点展开              | show-collapsable，默认折叠                                                                                                  |
| 4     | 默认全部展开          | show-collapsable + default-expand-all                                                                                       |
| 5     | 通过 key 展开         | node-key + default-expanded-keys                                                                                            |
| 6     | 节点样式              | label-class-name / current-lable-class-name、label-width/height                                                             |
| 7     | 自定义节点内容        | render-content（h 函数渲染 label + content 字段，注意 node 为 Node 实例）                                                   |
| 8     | 展开按钮自定义内容    | node-btn-content                                                                                                            |
| 9     | 节点动画              | animate + animate-name 切换演示                                                                                             |
| 10    | OKR 模式              | onlyBothTree + left-data + 根对齐示例（两棵树并排对比左右子树深度不同的情况）                                               |
| 11    | OKR 模式之自定义内容  | render-content 在 OKR 模式下的应用                                                                                          |
| 12    | OKR 模式自定义内容 II | 另一 OKR 定制示例                                                                                                           |
| 13    | Filter 过滤           | 输入框 + filter-node-method + filter()。需体现**空值恢复语义**：清空输入框时 filter('')，filter-node-method 对空值返回 true |
| 14    | OKR 模式 Filter       | OKR 模式下左右子树同时过滤                                                                                                  |
| 15    | Events                | node-click / node-expand / node-collapse 事件输出                                                                           |
| 16    | OKR Events            | OKR 模式事件 + node-contextmenu                                                                                             |
| 17–20 | API 文档表格          | Attributes / Props / Events / Methods 四张表（内容以本文档 3.1–3.4 为准，补全原表格遗漏的边界说明）                         |

附加：回顶按钮、文档站排版（标题/描述/表格样式）。

## 5. Vue 3 实现约定与改进点

### 5.1 技术选型

- Vue 3.5+，`<script setup>` + Composition API。
- Vite：库模式构建（ESM + UMD + CSS），Demo 站同仓（pnpm workspace 或单仓两入口）。
- TypeScript：为组件与 TreeStore/Node 模型提供类型，发布 `.d.ts`。
- 代码高亮：Demo 用 Shiki 或 prismjs（原 Demo 用 prismjs）。

### 5.2 必须替换的 Vue 2 专属实现

| 原实现                               | Vue 3 方案                                                                                                                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `new Vue()` 事件总线                 | 实为死代码（注入未使用），直接删除；store 通过 provide/inject 传递                                                                                                               |
| `renderContent(h, node)`             | 保留 h 函数签名对齐——Vue 3 render 函数不再注入 `h`，必须由组件 `import { h } from 'vue'` 后显式传入；内部 NodeContent/NodeBtnContent 包装组件改为函数式组件或 setup 返回渲染函数 |
| `$parent.isTree` 探测树根            | 改用 provide/inject 直接注入 store（原码用 `$parent` 判断，非 `$children`）                                                                                                      |
| `$scopedSlots` 判断                  | `useSlots()` / slots 判断；同时将原版不可用的插槽真正开放（见 5.3 改进 5）                                                                                                       |
| `Object.defineProperty($treeNodeId)` | 保留（纯 JS，无 Vue 依赖），或改用 WeakMap                                                                                                                                       |
| `$emit`                              | `defineEmits`                                                                                                                                                                    |

### 5.3 主动改进（不改变对外 API；与原版的行为差异见第 6 节决策清单）

1. **根对齐内建**：新增可选 prop `align-root`（默认 `true`），onlyBothTree 模式下自动按左右子树最大宽度对齐根节点，替代原 Demo 手动 DOM 测量代码；设为 `false` 可回到手动控制。
2. **响应式数据模型**（方案锁定）：TreeStore/Node 保持纯类，**仅对状态字段**（expanded / leftExpanded / isCurrent / visible / childNodes 容器）使用 `shallowReactive` / `shallowRef` 管理；**`data` 及所有源数据对象保持原始引用**（必要时 `markRaw`），严禁将 Node 实例整体放入 deep reactive——否则 `node.data` 被深度代理，会破坏 `setData` 的引用比较、`removeChild` 的 `children.indexOf(child.data)` 等依赖原始引用的逻辑（对应第 6 节 Q3/Q4）。展开/过滤/增删改全部自动更新视图，覆盖原 1.0.13/1.0.15 修复的 bug 场景。
3. **样式作用域化**：原全局 `* { margin: 0; padding: 0 }` 会污染宿主页面，Vue 3 版必须移除并限定在组件根内。
4. **修复原仓库遗留问题**：`props.disabled` 声明了但从未使用——实现真实的禁用节点行为（可选增强，默认不影响对齐）。
5. **插槽支持真正开放**：原版 OkrTreeNode 内部存在默认插槽透传代码，但 OkrTree 未将外部插槽传入节点，实际不可用；Vue 3 版开放默认作用域插槽 `#default="{ node }"` 作为 render-content 的替代写法（新增能力，不影响对齐）。
6. **animate-duration 接线**：修复原版未生效问题（第 6 节 Q5）。
7. **CSS 变量主题化与内置主题（1.1.0 新增）**：`style.css` 全部外观取值改为 `var(--okr-*, 默认值)`（默认值内联在使用点、不声明在容器上，因此主题类可放在根容器或任意祖先）；新增 `theme` prop（在根容器加 `okr-theme-{name}` 类），内置 `default / feishu / dark / auto / minimal / colorful` 六套预设，`colorful` 依赖节点上的 `data-level` 属性按层级着色。节点背景/文字色/边框/圆角用 `:where()` 零优先级声明，主题选中态只设变量，保证用户通过 `current-lable-class-name` 传入的单类样式仍可覆盖（与原版行为一致）。`default` 不加类，外观与原版完全一致。

## 6. 原版行为怪癖与兼容性决策（复刻 vs 修复）

以下为对照源码发现的、需求/计划文档此前未覆盖的行为。每项已做出明确决策，**实现与验收均以此节为准**；所有"修复"项都是不改变文档化 API 语义的缺陷修复。

| 编号 | 原版行为 / 问题                                                                                                                                                                                                                                   | 决策                                                                                                                                                                                                                                                                                                 | 理由                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Q1   | `filterRight` 仅从 `root.childNodes[0]` 开始遍历：多根 data 时第 2 个及以后的根整棵子树不过滤；第一层节点的 `visible` 永不置 false（只隐藏后代，自身不隐藏）                                                                                      | **修复**：从全部根节点遍历，所有节点执行 filter-node-method；父节点自身不匹配但存在可见后代时保持可见（element-ui 标准语义）                                                                                                                                                                         | 多根过滤失效属明显缺陷，原 Demo 均为单根数据因此未暴露                  |
| Q2   | OKR 模式左右树共用 `nodesMap` 按 key 注册，同 key 互相覆盖（原 Demo 数据本身就有重复 id），`getNode` 返回后注册方（左树）；`default-expanded-keys` 因覆盖实际只展开左树节点                                                                       | **修复**：左右分表（右树 `nodesMap`、左树 `leftNodesMap`）。`getNode`/`setCurrentKey`/`getCurrentKey` 等面向右树，语义与非 OKR 模式一致；`default-expanded-keys`、`current-node-key` 按 key 同时作用于左右两棵树的对应节点                                                                           | 消除隐性覆盖；对外 API 签名无变化                                       |
| Q3   | `insertChild`/`removeChild` 会同步修改用户源数据的 children 数组（append/insertBefore/insertAfter/remove 均触发）                                                                                                                                 | **复刻（保留）**：作为正式行为写入 README                                                                                                                                                                                                                                                            | 原版对外可见行为，修改属破坏性变更                                      |
| Q4   | `setData` 在 data 引用未变分支调用 `this.root.updateChildren()`，但 Node 类**未定义该方法**，一旦触发即 TypeError（如用户将 data 引用改回旧数组）                                                                                                 | **修复**：真实实现 `Node.updateChildren`——按新 children 重建 childNodes，并尽量复用已有子 Node 的 expanded / leftExpanded / isCurrent 状态；配合 deep watch 支持 data 原地变更（同引用内部修改也触发更新）                                                                                           | 原版 1.0.5"异步改 data 不渲染"修复的遗留缺陷                            |
| Q5   | `animate-duration` prop 未传入 TreeStore，实际从未生效                                                                                                                                                                                            | **修复**：接线生效                                                                                                                                                                                                                                                                                   | 原版即声明了该 prop，属未完成功能                                       |
| Q6   | 过渡动画 CSS 实际含 6 组 okr-* 动画，原 Demo 文档只列 5 组                                                                                                                                                                                        | CSS 全量迁移，animate-name 文档列出全部 6 种                                                                                                                                                                                                                                                         | 补全而非裁剪                                                            |
| Q7   | 2.1 节所列死代码                                                                                                                                                                                                                                  | **不移植**                                                                                                                                                                                                                                                                                           | 无功能影响；验收对照时不算缺失                                          |
| Q8   | 原版 `<transition>` 只包裹 `v-if="childNodes.length > 0"` 的子容器，展开/收起仅切换 `visibility/height` 内联样式，**点击 +/- 时实际没有任何过渡**，`animate` 仅在子容器首次挂载/卸载（如 append 到叶子节点）时生效（开发阶段 6 浏览器核对时发现） | **修复**：保留原 DOM/宽度语义（隐藏子树仍占位，根节点不位移），在容器上追加状态类 `is-animated / okr-anim-<name> / is-hidden`，用 CSS transition 实现展开/收起过渡，`visibility` 延迟到过渡结束再切换；时长由 `--okr-anim-duration`（animate-duration）控制。原 `<transition>` 挂载/卸载过渡照常保留 | 让 `animate` / `animate-name` / `animate-duration` 三个 prop 真正可演示 |
| Q9   | 发布包 `"type": "module"` 时，`.umd.js` 会被 Node 按 ESM 解析，`require('vue3-okr-tree')` 失败（开发阶段 5 发现）                                                                                                                                 | 额外产出 `dist/vue3-okr-tree.cjs` 供 `exports.require` / `main`；`.umd.js` 保留给 CDN（unpkg/jsdelivr）                                                                                                                                                                                              | 三条引入路径（import / require / script 标签）全部可用                  |

## 7. 验收标准

1. 3.1–3.4 全部 API 行为与原组件一致（含抛错文案语义：缺 nodeKey/leftData/filterNodeMethod 时的 Error，以及 3.4 表标注的各边界行为）；与原版的有意差异仅限第 6 节决策清单（Q1–Q9）。
2. Demo 页 20 个用例全部可交互、展示效果与原 Demo 对齐；Filter 用例体现空值恢复语义（见第 4 节 #13）。
3. 构建产物：`dist/vue3-okr-tree.es.js`、`dist/vue3-okr-tree.umd.js`、`dist/vue3-okr-tree.cjs`、`dist/style.css`、类型声明 `dist/index.d.ts`；支持 `import { VueOkrTree } from 'vue3-okr-tree'` + `import 'vue3-okr-tree/dist/style.css'`，以及 `require('vue3-okr-tree')`。
4. 原仓库已知 bug 场景（异步改 data、左右子树单独更新、倒序显示）在新版全部正常。
5. 第 6 节 Q1–Q5、Q8 的修复项各有对应用例覆盖（单测或 Demo 演示），Q3 复刻项有单测验证源数据副作用与原版一致。
