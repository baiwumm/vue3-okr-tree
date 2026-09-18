# vue3-okr-tree

[![npm version](https://img.shields.io/npm/v/vue3-okr-tree.svg)](https://www.npmjs.com/package/vue3-okr-tree)
[![npm downloads](https://img.shields.io/npm/dm/vue3-okr-tree.svg)](https://www.npmjs.com/package/vue3-okr-tree)
[![CI](https://github.com/baiwumm/vue3-okr-tree/actions/workflows/ci.yml/badge.svg)](https://github.com/baiwumm/vue3-okr-tree/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/baiwumm/vue3-okr-tree/graph/badge.svg)](https://codecov.io/gh/baiwumm/vue3-okr-tree)
[![license](https://img.shields.io/npm/l/vue3-okr-tree.svg)](./LICENSE)

📚 **[在线文档站（开发中）](https://baiwumm.github.io/vue3-okr-tree/)** · [Playground 演示](https://baiwumm.github.io/vue3-okr-tree/playground/) · [更新日志](./CHANGELOG.md)

基于 Vue 3 的组织架构树 / OKR 树组件，是 [vue-okr-tree](https://github.com/qq449245884/vue-okr-tree)（Vue 2）的 Vue 3 完整复刻版。特色是支持类似飞书 OKR 的**根节点左右双向展开**布局，全部连接线由纯 CSS 绘制。

- 对外 API（props / events / methods）与 `vue-okr-tree` 对齐，可平滑迁移
- `<script setup>` + TypeScript，提供完整 `.d.ts`
- 产物：ESM / CJS / UMD + `style.css`
- 内建 `align-root` 根对齐，OKR 模式下展开/收起不再位移，无需手动测量 DOM
- 全部外观取值通过 `--okr-*` CSS 变量暴露，内置 `default / feishu / dark / auto / minimal / colorful` 六套主题（`theme` prop），也可自定义
- 受控状态 `v-model:expanded-keys` / `v-model:current-key`，`expandAll` / `collapseAll` / `expandNode` / `collapseNode` / `scrollToNode` 方法，`#expand-btn` / `#empty` 插槽
- `lazy` + `load` 懒加载子节点（大数据量只加载展开路径）、`<OkrTreeViewport>` 画布缩放平移与 PNG/SVG 导出，`<OkrTreeGroup>` 跨实例根对齐、WAI-ARIA 键盘导航、`node-component` prop、`createTypedOkrTree<T>()` 类型化辅助
- 修复了原版的多根过滤、左右树同 key 覆盖、`animate` / `animate-duration` 无效等问题（见下文「与 vue-okr-tree 的差异」）

## 安装

```bash
pnpm add vue3-okr-tree
# 或
npm i vue3-okr-tree
```

Peer 依赖：`vue >= 3.0.0`。

## 快速开始

```vue
<template>
  <vue-okr-tree :data="data" direction="horizontal" show-collapsable default-expand-all />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'
import 'vue3-okr-tree/dist/style.css'

const data = ref([
  {
    label: 'xxx科技有限公司',
    children: [
      { label: '产品研发部', children: [{ label: '研发-前端' }, { label: '研发-后端' }] },
      { label: '销售部', children: [{ label: '销售一部' }] },
      { label: '财务部' },
    ],
  },
])
</script>
```

全局注册（可选）：

```ts
import { createApp } from 'vue'
import VueOkrTreePlugin from 'vue3-okr-tree'
import 'vue3-okr-tree/dist/style.css'

createApp(App).use(VueOkrTreePlugin) // 注册 <vue-okr-tree> 与 <okr-tree>
```

CDN（UMD，全局变量 `VueOkrTree`）：

```html
<link rel="stylesheet" href="https://unpkg.com/vue3-okr-tree/dist/style.css" />
<script src="https://unpkg.com/vue"></script>
<script src="https://unpkg.com/vue3-okr-tree"></script>
<script>
  const { VueOkrTree } = window.VueOkrTree
</script>
```

## OKR 模式（根节点左右双向展开）

```vue
<vue-okr-tree
  :data="data"
  :left-data="leftData"
  only-both-tree
  direction="horizontal"
  show-collapsable
  node-key="id"
  default-expand-all
/>
```

- `onlyBothTree` 仅在 `direction="horizontal"` 时有效，且必须提供 `leftData`，否则抛出 `[Tree] leftData is required in onlyBothTree`。
- `leftData[0].children` 会挂到右树第一个根节点的左侧；左右两棵树允许存在相同的 `id`。
- `align-root`（默认 `true`）让根节点在容器内居中，展开/收起任意一侧根节点都不会位移；多棵树并排时根节点天然对齐。设为 `false` 恢复原版按内容宽度排布的行为。

## 自定义节点内容

`render-content` 与 `node-btn-content` 的签名都是 `(h, node)`：`h` 是 Vue 的渲染函数（由组件传入），`node` 是**内部 Node 实例**（源数据在 `node.data`，文本在 `node.label`，另有 `isCurrent` / `expanded` / `leftExpanded` / `isLeftChild` / `level` / `childNodes` 等）。这与 element-ui 的 `(h, { data })` 不同，与 vue-okr-tree 保持一致。

```ts
function renderContent(h, node) {
  return h('div', { class: ['diy', node.isCurrent && 'is-current', node.isLeftChild && 'left'] }, [
    h('div', node.data.label),
    h('small', node.data.content),
  ])
}
```

也可以传一个组件（`node-component`，Vue 3 版新增），它会以 `{ node, data }` 为 props 渲染：

```vue
<vue-okr-tree :data="data" :node-component="DeptCard" />
```

或使用作用域插槽（Vue 3 版新增，原版插槽实际不可用）。三者优先级：`#default` 插槽 > `node-component` > `render-content`。

```vue
<vue-okr-tree :data="data">
  <template #default="{ node, data }">
    <b>{{ data.label }}</b>
    <small v-if="node.isCurrent">（已选中）</small>
  </template>
</vue-okr-tree>
```

## 通过 ref 调用方法

```vue
<template>
  <input v-model="keyword" />
  <vue-okr-tree ref="tree" :data="data" node-key="id" :filter-node-method="filterNode" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { VueOkrTree, type VueOkrTreeInstance } from 'vue3-okr-tree'

const tree = ref<VueOkrTreeInstance | null>(null)
const keyword = ref('')
watch(keyword, (v) => tree.value?.filter(v))

// 空值也会被调用：需返回 true 才能恢复全部节点
const filterNode = (value: string, data: any) => (!value ? true : data.label.includes(value))

tree.value?.append({ id: 10, label: '销售三部' }, 6)
tree.value?.setCurrentKey(7)
</script>
```

## 受控状态（v-model）

`expanded-keys` / `current-key` 传入后即为受控模式（需 `node-key`）：列表内节点展开、其余收起；用户点击 +/- 或调用展开/收起方法都会触发 `update:expandedKeys` / `update:currentKey` 回写。不传时保持原版的非受控行为。

```vue
<template>
  <button @click="tree?.expandAll()">全部展开</button>
  <button @click="tree?.collapseAll()">全部收起</button>
  <button @click="tree?.scrollToNode(8)">滚动到 id=8</button>

  <vue-okr-tree
    ref="tree"
    v-model:expanded-keys="expandedKeys"
    v-model:current-key="currentKey"
    :data="data"
    node-key="id"
    show-collapsable
  >
    <template #expand-btn="{ expanded, side }">
      <span class="org-chart-node-btn-text">{{ expanded ? '−' : '＋' }}</span>
    </template>
    <template #empty>暂无数据</template>
  </vue-okr-tree>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VueOkrTree, type TreeKey, type VueOkrTreeInstance } from 'vue3-okr-tree'

const tree = ref<VueOkrTreeInstance | null>(null)
const expandedKeys = ref<TreeKey[]>([1]) // 只展开 id 为 1 的节点
const currentKey = ref<TreeKey | null>(null) // null 表示无选中
</script>
```

## 懒加载子节点

数据量大时（如几千节点的组织架构），初始只给顶层节点，子级在首次展开时通过 `load` 函数异步获取：

```vue
<template>
  <vue-okr-tree :data="data" node-key="id" show-collapsable lazy :load="loadNode" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VueOkrTree, type TreeNodeData } from 'vue3-okr-tree'

const data = ref<TreeNodeData[]>([{ id: 1, label: '总部' }])

function loadNode(
  node: TreeNodeData & { level: number },
  resolve: (children: TreeNodeData[]) => void,
  reject?: () => void
) {
  // node 是内部 Node 实例：node.data 为源数据，node.isLeftChild 区分 OKR 左树节点
  fetchChildren(node.data.id)
    .then(resolve)
    .catch(() => reject?.())
}
</script>
```

行为约定：

- **未加载节点**：初始 `data` 中没有 `children` 字段（或为空数组）的节点视为未加载；`load` resolve 后子节点会同步写入源数据的 `children`（与 `append` 语义一致），并标记为已加载，之后不再重复请求。
- **展开驱动**：点击 +/- 按钮、`expandAll` / `expandNode` / `scrollToNode`、`default-expanded-keys`、`v-model:expanded-keys` 触发未加载节点时，都会先调用 `load`，完成后再展开。
- **失败与重试**：`reject()` 或 `load` 抛错时节点回到折叠态（按钮上的 `is-loading` 状态清除），下次展开会重新请求。
- **叶子节点**：用 `props: { isLeaf: 'leaf' }` 指定叶子字段（支持函数），标记为叶子的未加载节点不显示展开按钮、不触发请求；未指定时未加载节点默认视为有子节点。
- **加载中状态**：按钮带 `is-loading` 类（内置旋转指示），`#expand-btn` 插槽作用域新增 `loading: boolean`；`show-node-num` 在未加载时不显示数字。
- **过滤**：`filter` 不会触发未加载节点的 `load`（未加载子树内容未知）。

## 画布组件：OkrTreeViewport

大树（几十个部门、数百节点的组织架构图）在固定视口里放不下时，用 `<OkrTreeViewport>` 包裹树即可获得缩放与平移能力——它只做外层变换，不侵入树本体，也不改变树的任何 API：

```vue
<template>
  <okr-tree-viewport ref="vp" toolbar :min-zoom="0.2" :max-zoom="4">
    <vue-okr-tree :data="orgData" node-key="id" direction="horizontal" show-collapsable />
    <template #toolbar="{ zoom, zoomIn, zoomOut, reset, fit }">
      <button @click="zoomOut()">−</button>
      <span>{{ Math.round(zoom * 100) }}%</span>
      <button @click="zoomIn()">＋</button>
      <button @click="reset()">重置</button>
      <button @click="fit()">适应窗口</button>
    </template>
  </okr-tree-viewport>
</template>
```

| prop                    | 说明                                                                                                        | 默认值      |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- | ----------- |
| `min-zoom` / `max-zoom` | 缩放范围                                                                                                    | `0.2` / `4` |
| `zoom-step`             | 每次 zoomIn / zoomOut / 滚轮一格的缩放系数（乘除）                                                          | `1.2`       |
| `zoom`                  | 受控缩放（`v-model:zoom`），未传时内部维护                                                                  | —           |
| `offset`                | 受控平移偏移 `{ x, y }`（`v-model:offset`），未传时内部维护                                                 | —           |
| `wheel-behavior`        | 滚轮行为：`ctrl-zoom`（默认，按住 Ctrl/⌘ 才缩放，不劫持页面滚动）/ `zoom`（始终缩放）/ `scroll`（从不缩放） | `ctrl-zoom` |
| `toolbar`               | 是否显示默认工具栏；传入 `#toolbar` 插槽时无需开启                                                          | `false`     |

交互：滚轮缩放以指针为中心；按住拖拽平移（位移超过 3px 才算平移，不影响节点点击）；双击复位；触控双指捏合缩放。

| 方法（通过 ref 调用）    | 说明                                                              |
| ------------------------ | ----------------------------------------------------------------- |
| `zoomIn()` / `zoomOut()` | 以视口中心为锚放大 / 缩小（受 min/max 钳制）                      |
| `reset()`                | 复位到缩放 1、偏移 0（双击画布同样触发）                          |
| `fitToScreen(padding?)`  | 适应窗口：内容完整可见并居中，默认四周留 20px                     |
| `centerNode(key)`        | 先展开目标节点的祖先，再把视口中心对准该节点（key / data / Node） |
| `exportImage(options?)`  | 导出画布内容为 PNG / SVG 并触发下载，返回 dataURL                 |

`exportImage` 基于 [html-to-image](https://github.com/bubkoo/html-to-image)：默认按需 `import('html-to-image')`（未安装时抛出带安装指引的错误）；在打包器下动态导入裸包名不可靠时，可通过 `options.toPng / toSvg` 直接传入渲染函数（签名与 html-to-image 一致）。选项：`type`（`'png' | 'svg'`，默认 png）、`scale`（像素密度，默认 2）、`background`（背景色，如 `'#ffffff'`）。

`OkrTreeGroup` 可以放在 Viewport 内组合使用；配合树的新方法 `getNodeEl(key)` 可获取节点 DOM 元素。

## 多棵树根对齐：OkrTreeGroup

`align-root` 让每棵树的根节点在自身容器内居中。多棵 OKR 树并排对比、且宽度不足以容纳最深的一侧时，各树"各自居中"的位置会不同——这正是原版 README 里需要"结合业务层手动测量 DOM"的场景。用 `<OkrTreeGroup>` 包裹即可：它测量组内所有左子树容器的最大自然宽度并统一设置，使各树根节点水平坐标完全一致，并自动响应成员的挂载 / 更新 / 尺寸变化。

```vue
<okr-tree-group>
  <vue-okr-tree :data="a" :left-data="leftA" only-both-tree direction="horizontal" node-key="id" />
  <vue-okr-tree :data="b" :left-data="leftB" only-both-tree direction="horizontal" node-key="id" />
</okr-tree-group>
```

| 名称        | 说明                                                       |
| ----------- | ---------------------------------------------------------- |
| `align`     | prop，boolean，默认 `true`；`false` 时各树独立排布         |
| `refresh()` | 方法，手动重新测量（字体加载完成、外部样式变化等特殊场景） |

## 键盘导航与可访问性

树容器为 `role="tree"`，节点为 `role="treeitem"`，带 `aria-level` / `aria-expanded` / `aria-selected` / `aria-disabled`，子容器为 `role="group"`；采用漫游 tabindex（同一时刻只有一个节点可 Tab 进入）。

| 按键              | 行为                                           |
| ----------------- | ---------------------------------------------- |
| `Tab`             | 进入 / 离开树                                  |
| `↑` / `↓`         | 在可见节点间移动焦点（文档顺序，跳过收起子树） |
| `→`               | 展开当前节点；已展开则进入第一个子节点         |
| `←`               | 收起当前节点；已收起则回到父节点               |
| `Enter` / `Space` | 选中节点（触发 `node-click`）                  |
| `Home` / `End`    | 移到第一个 / 最后一个可见节点                  |

OKR 模式下：根节点 `←` 作用于左子树（展开或进入），左树节点的 `←` / `→` 镜像（`←` 展开/进入、`→` 收起/返回根节点）。焦点在节点内部的输入控件时不拦截按键。焦点环通过 `--okr-focus-color`（默认 `#409eff`）/ `--okr-focus-width`（默认 `2px`）定制。

## 类型化：createTypedOkrTree<T>

运行时返回的就是 `VueOkrTree`，仅做类型收窄，让 `data` / `leftData` 与插槽作用域中的 `data` 带上你的数据类型：

```ts
import { createTypedOkrTree } from 'vue3-okr-tree'

interface Dept {
  id: number
  label: string
  leader?: string
}
const DeptTree = createTypedOkrTree<Dept>()
```

```vue
<DeptTree :data="depts" node-key="id">
  <template #default="{ data }">
    {{ data.label }} — {{ data.leader }}   <!-- data: Dept，有类型提示 -->
  </template>
</DeptTree>
```

## 主题与样式定制

组件所有可定制的外观取值都通过 CSS 变量暴露，并在使用点写成 `var(--okr-*, 默认值)`，因此：

- 不传 `theme` 时外观与 vue-okr-tree 完全一致；
- 变量可以写在组件根容器（`theme` prop 会加 `okr-theme-{name}` 类）、任意祖先元素、`:root`，甚至内联 `style="--okr-line-color: red"`；
- 选中态只在主题中提供内置样式，且优先级刻意放低，你通过 `current-lable-class-name` 传入的类始终可以覆盖它。

### 内置主题

```vue
<vue-okr-tree :data="data" theme="feishu" />
```

| 主题       | 定位                                                                   |
| ---------- | ---------------------------------------------------------------------- |
| `default`  | 与 vue-okr-tree 一致：灰线、白卡、直角、轻阴影（不加任何类）           |
| `feishu`   | 飞书 OKR 观感：圆角 8px、浅灰线、主色 `#3370ff` 选中态                 |
| `dark`     | 暗色页面：深底、浅灰线、亮色选中态                                     |
| `auto`     | 跟随系统：浅色下同 `default`，`prefers-color-scheme: dark` 时同 `dark` |
| `minimal`  | 演示 / 打印：无阴影、细边框、小圆角，选中态细蓝边                      |
| `colorful` | 按层级着色（节点带 `data-level` 属性），适合组织架构展示               |

### 自定义主题 / 覆盖变量

```css
/* 方式一：自定义主题名，配合 theme="brand" */
.okr-theme-brand {
  --okr-line-color: #409eff;
  --okr-node-radius: 8px;
  --okr-current-bg: #409eff;
  --okr-current-color: #fff;
}
.okr-theme-brand :where(.org-chart-node-label-inner.is-current) {
  --okr-node-bg: var(--okr-current-bg);
  --okr-node-color: var(--okr-current-color);
}

/* 方式二：在任意祖先上直接覆盖若干变量（可叠加在内置主题之上） */
.my-page {
  --okr-gap-level: 32px;
  --okr-node-font-size: 14px;
}
```

### 变量一览

| 变量                      | 说明                              | 默认值                          |
| ------------------------- | --------------------------------- | ------------------------------- |
| `--okr-line-color`        | 连接线颜色                        | `#ccc`                          |
| `--okr-line-width`        | 连接线宽度                        | `1px`                           |
| `--okr-line-radius`       | 兄弟连线拐角圆角                  | `5px`                           |
| `--okr-gap-level`         | 层级间距 / 连接线长度             | `20px`                          |
| `--okr-gap-sibling`       | 兄弟节点水平间距                  | `5px`                           |
| `--okr-gap-node-y`        | 水平模式下节点纵向间距            | `10px`                          |
| `--okr-node-bg`           | 节点背景                          | `transparent`                   |
| `--okr-node-color`        | 节点文字颜色                      | `inherit`                       |
| `--okr-node-border`       | 节点边框                          | `none`                          |
| `--okr-node-radius`       | 节点圆角                          | `0`                             |
| `--okr-node-padding`      | 节点内边距                        | `10px`                          |
| `--okr-node-font-size`    | 节点字号                          | `16px`                          |
| `--okr-node-shadow`       | 节点阴影                          | `0 1px 10px rgba(31,35,41,.08)` |
| `--okr-node-shadow-hover` | 节点 hover 阴影                   | `0 1px 14px rgba(31,35,41,.12)` |
| `--okr-btn-size`          | 展开按钮直径                      | `20px`                          |
| `--okr-btn-bg`            | 展开按钮背景                      | `#fff`                          |
| `--okr-btn-shadow`        | 展开按钮阴影                      | `0 0 2px rgba(0,0,0,.15)`       |
| `--okr-btn-sign-color`    | 按钮内 +/- 颜色                   | 取 `--okr-line-color`           |
| `--okr-btn-text-color`    | 按钮内子节点数字颜色              | `#909090`                       |
| `--okr-current-bg`        | 选中背景（主题内生效）            | `#3370ff`                       |
| `--okr-current-color`     | 选中文字（主题内生效）            | `#fff`                          |
| `--okr-disabled-opacity`  | 禁用节点透明度                    | `0.6`                           |
| `--okr-anim-duration`     | 展开/收起过渡时长（由 prop 写入） | `200ms`                         |

<!-- API-DOC-BEGIN（本段由 pnpm gen:readme 从 shared/api.ts 生成，勿手改） -->

## API

### Attributes

与 vue-okr-tree 完全对齐；`align-root` 起为 Vue 3 版新增。

| 参数                     | 说明                                                                                                                                                                                                | 类型                                                                                                                              | 默认值             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| data                     | 展示数据（数组，支持多根）                                                                                                                                                                          | array                                                                                                                             | — (必填)           |
| direction                | 树的展开方向                                                                                                                                                                                        | string（可选值：horizontal / vertical）                                                                                           | vertical           |
| onlyBothTree             | 飞书 OKR 模式：子树在根节点左右两边展开，该模式只有在 `direction` 为 horizontal 时有效，且必须提供 leftData 数据                                                                                    | boolean                                                                                                                           | false              |
| leftData                 | 展示左子树的数据，仅在 onlyBothTree 模式启用                                                                                                                                                        | array                                                                                                                             | —                  |
| label-width              | 节点的宽度，默认为自动宽度。number 类型单位 px；string 类型直接作为节点的 style.width                                                                                                               | string / number                                                                                                                   | auto               |
| label-height             | 节点的高度，默认为自动高度。number 类型单位 px；string 类型直接作为节点的 style.height                                                                                                              | string / number                                                                                                                   | auto               |
| label-class-name         | 节点 className 的回调方法，也可以使用字符串为所有节点设置固定 className。函数参数为内部 Node 实例（源数据在 `node.data`）                                                                           | Function(node) / string                                                                                                           | —                  |
| current-lable-class-name | 当前选中节点的样式（保留原拼写）                                                                                                                                                                    | Function(node) / string                                                                                                           | —                  |
| show-collapsable         | 节点是否可被展开（显示 +/- 圆形按钮）。为 false 时组件强制全部展开                                                                                                                                  | boolean                                                                                                                           | false              |
| show-node-num            | 折叠时在圆形按钮内显示子节点数                                                                                                                                                                      | boolean                                                                                                                           | false              |
| default-expand-all       | 默认展开全部，仅在 show-collapsable 为 true 时有意义                                                                                                                                                | boolean                                                                                                                           | false              |
| render-content           | 树节点内容区的渲染 Function。`h` 由组件从 vue 导入后传入；`node` 为内部 Node 实例（源数据在 `node.data`，文本在 `node.label`），与 element-ui 的 `(h, { data })` 不同                               | Function(h, node)                                                                                                                 | —                  |
| node-btn-content         | 展开按钮内容渲染函数，参数约定同上                                                                                                                                                                  | Function(h, node)                                                                                                                 | —                  |
| node-component           | **Vue 3 版新增。**节点内容组件，以 `{ node, data }` 为 props 渲染。优先级：`#default` 插槽 > node-component > render-content                                                                        | Component                                                                                                                         | —                  |
| props                    | 配置选项，具体看下表                                                                                                                                                                                | object                                                                                                                            | —                  |
| node-key                 | 每个树节点用来作为唯一标识的属性，整棵树应该是唯一的                                                                                                                                                | string                                                                                                                            | —                  |
| default-expanded-keys    | 默认展开的节点的 key 数组（必须设置 node-key）。OKR 模式下对左右两棵树同时生效                                                                                                                      | array                                                                                                                             | —                  |
| current-node-key         | 初始选中节点的 key（需 node-key）                                                                                                                                                                   | string / number                                                                                                                   | —                  |
| filter-node-method       | 对树节点进行筛选时执行的方法，返回 true 表示节点可以显示，返回 false 隐藏。调用 `filter('')` 时同样会执行，需对空值返回 true 以恢复全部显示                                                         | Function(value, data, node)                                                                                                       | —                  |
| animate                  | 是否开启节点展开的过渡动画                                                                                                                                                                          | boolean                                                                                                                           | false              |
| animate-name             | 过渡动画名称                                                                                                                                                                                        | string（可选值：okr-fade-in-linear / okr-fade-in / okr-zoom-in-center / okr-zoom-in-top / okr-zoom-in-bottom / okr-zoom-in-left） | okr-zoom-in-center |
| animate-duration         | 过渡动画时长（ms）。原版声明但未生效，Vue 3 版已修复                                                                                                                                                | number                                                                                                                            | 200                |
| align-root               | **Vue 3 版新增。**OKR 模式下自动按左右子树对齐根节点（纯 CSS），展开/收起不改变根节点位置；设为 false 恢复原始行为                                                                                  | boolean                                                                                                                           | true               |
| theme                    | **Vue 3 版新增。**内置主题：default / feishu / dark / auto / minimal / colorful，或自定义名字（自行编写 `.okr-theme-{name}` 变量）。全部外观取值可通过 `--okr-*` CSS 变量覆盖                       | string（可选值：default / feishu / dark / auto / minimal / colorful）                                                             | default            |
| expanded-keys            | **Vue 3 版新增。**受控展开态（支持 `v-model:expanded-keys`，需 node-key）：传入后列表内节点展开、其余收起；用户点击 +/- 或调用展开/收起方法后触发 `update:expandedKeys`。未传时为非受控（原版行为） | array                                                                                                                             | —                  |
| current-key              | **Vue 3 版新增。**受控选中态（支持 `v-model:current-key`，需 node-key）：`null` 表示无选中；点击节点或调用 setCurrentKey / setCurrentNode 后触发 `update:currentKey`                                | string / number / null                                                                                                            | —                  |
| lazy                     | **Vue 3 版新增（1.4.0）。**懒加载子节点：初始 data 中没有 children（或为空数组）的节点视为未加载，首次展开时调用 `load`                                                                             | boolean                                                                                                                           | false              |
| load                     | **Vue 3 版新增（1.4.0）。**懒加载取数函数。`resolve(children)` 后子节点同步写入源数据 children 并展开；`reject()` 或抛错时节点回到折叠态、可重试。`node.isLeftChild` 可区分 OKR 左树节点            | Function(node, resolve, reject?)                                                                                                  | —                  |
| deep-watch               | **Vue 3 版新增（1.5.0，创建期生效）。**data 深度侦听开关：默认 true（原地变更触发增量更新）；false 只响应 data 引用变化，超大数据量且不依赖原地变更时降低 watch 开销                                | boolean                                                                                                                           | true               |

### Props（props 属性的字段映射配置）

通过 `props` 属性传入的字段映射配置。

| 参数     | 说明                                                                                                               | 类型                          | 默认值   |
| -------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------- | -------- |
| label    | 指定节点文本为节点对象的某个属性值，或由函数返回                                                                   | string / function(data, node) | label    |
| children | 指定子树为节点对象的某个属性值                                                                                     | string                        | children |
| disabled | 指定禁用字段（Vue 3 版实现真实禁用：禁用节点带 `is-disabled` 类，点击不选中、不触发 node-click）                   | string / function(data, node) | disabled |
| isLeaf   | 指定叶子字段（Vue 3 版新增）：lazy 模式下未加载节点的 isLeaf 取该字段，标记为叶子的节点不显示展开按钮、不触发 load | string / function(data, node) | —        |

### Events

`node` 均为内部 Node 实例，`nodeComponent` 为递归节点组件实例。

| 事件名称            | 说明                                                                                   | 回调参数                           |
| ------------------- | -------------------------------------------------------------------------------------- | ---------------------------------- |
| node-click          | 节点被点击时的回调（同时设置当前选中态）                                               | (data, node, nodeComponent)        |
| node-expand         | 节点被展开时触发的事件                                                                 | (data, node, nodeComponent)        |
| node-collapse       | 节点被关闭时触发的事件                                                                 | (data, node, nodeComponent)        |
| node-contextmenu    | 当某一节点被鼠标右键点击时会触发该事件。仅当外部绑定了该事件时才阻止浏览器默认右键菜单 | (event, data, node, nodeComponent) |
| update:expandedKeys | **Vue 3 版新增。**受控展开态变化时触发（仅传入 expanded-keys 时）                      | (keys: TreeKey[])                  |
| update:currentKey   | **Vue 3 版新增。**受控选中态变化时触发（仅传入 current-key 时）                        | (key: TreeKey \| null)             |

### Methods（通过 ref 调用）

通过组件 `ref` 调用。增删类方法会同步修改传入的源数据（与 vue-okr-tree 一致）。

| 方法名            | 说明                                                                                                                                                              | 参数                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| filter            | 对树节点进行筛选操作；onlyBothTree 模式下同时过滤左右子树。未设置 filter-node-method 时抛错                                                                       | (value) 在 filter-node-method 中作为第一个参数                                                   |
| updateKeyChildren | 通过 key 设置节点的子元素，使用此方法必须设置 node-key 属性（缺失抛错）                                                                                           | (key, data) 1. 节点的 key 2. 子节点数据                                                          |
| getNode           | 根据 data / key / Node 实例获取内部 Node。OKR 模式下右树优先，右树不存在时回退到左树                                                                              | (data) 要获得 node 的 key、data 对象或 Node 实例                                                 |
| setCurrentNode    | 通过 node 设置某个节点的当前选中状态，必须设置 node-key（缺失抛错）                                                                                               | (node) 待被选节点的 Node 实例                                                                    |
| setCurrentKey     | 通过 key 设置某个节点的当前选中状态，必须设置 node-key（缺失抛错）                                                                                                | (key) 待被选节点的 key，若为 null 则取消当前高亮                                                 |
| getCurrentKey     | 获取当前被选中节点的 key，若没有节点被选中则返回 null。必须设置 node-key（缺失抛错）                                                                              | —                                                                                                |
| getCurrentNode    | 获取当前被选中节点的 data，若没有节点被选中则返回 null                                                                                                            | —                                                                                                |
| remove            | 删除 Tree 中的一个节点，使用此方法必须设置 node-key（未设置时静默无效）。会同步删除源数据中的对应项                                                               | (data) 要删除的节点的 data、key 或 Node 实例                                                     |
| append            | 为 Tree 中的一个节点追加一个子节点。会同步写入源数据的 children                                                                                                   | (data, parentNode) 1. 要追加的子节点的 data 2. 父节点的 data、key 或 Node 实例（省略则追加为根） |
| insertBefore      | 为 Tree 的一个节点的前面增加一个节点。会同步写入源数据                                                                                                            | (data, refNode) 1. 要增加的节点的 data 2. 参考节点的 data、key 或 Node 实例                      |
| insertAfter       | 为 Tree 的一个节点的后面增加一个节点。会同步写入源数据                                                                                                            | (data, refNode) 1. 要增加的节点的 data 2. 参考节点的 data、key 或 Node 实例                      |
| expandAll         | **Vue 3 版新增。**展开全部节点（OKR 模式含左右两树）；lazy 模式下未加载节点先触发加载、完成后再展开                                                               | —                                                                                                |
| collapseAll       | **Vue 3 版新增。**收起全部节点                                                                                                                                    | —                                                                                                |
| expandNode        | **Vue 3 版新增。**展开指定节点，默认连同祖先一起展开；OKR 根节点会同时展开左右两侧；lazy 下先加载再展开。返回 Node 或 null                                        | (data, expandParent = true) data 为 key、data 对象或 Node 实例                                   |
| collapseNode      | **Vue 3 版新增。**收起指定节点；OKR 根节点会同时收起左右两侧                                                                                                      | (data)                                                                                           |
| scrollToNode      | **Vue 3 版新增。**滚动到指定节点：默认先展开其全部祖先使其可见，再 `scrollIntoView`（居中、平滑）。返回 Promise<boolean>；lazy 下等待路径上的节点加载完成后再滚动 | (data, options?) options 为 ScrollIntoViewOptions，另含 `expand`（默认 true）                    |
| getNodeEl         | **Vue 3 版新增（1.4.0）。**按 Node / key / data 获取节点对应的 DOM 元素（OkrTreeViewport 的 centerNode 也基于它定位）                                             | (data)                                                                                           |

### Slots

Vue 3 版新增的插槽。`#default` 与 `render-content`、`#expand-btn` 与 `node-btn-content` 二者任选其一，插槽优先。

| 插槽名     | 说明                                                         | 作用域参数                                                                                                               |
| ---------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| default    | 节点内容                                                     | `{ node, data }`，node 为内部 Node 实例                                                                                  |
| expand-btn | 展开按钮内容；`show-node-num` 开启时折叠态的数字优先于该插槽 | `{ node, data, expanded, side, loading }`，side 为 `right`（常规/右子树）或 `left`（OKR 左子树），loading 为懒加载进行中 |
| empty      | `data` 为空数组时在容器内渲染                                | —                                                                                                                        |

### OkrTreeGroup 与键盘导航

Vue 3 版新增。`OkrTreeGroup` 包裹多棵 OKR 模式的树，使组内根节点水平坐标一致（原版需在业务层手动测量 DOM）；需成员树开启 `align-root`（默认）。键盘导航为所有树内置。

| 名称                | 类型               | 说明                                                                                                                                                                                                                                                                                 |
| ------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| align（prop）       | boolean，默认 true | 是否对齐；为 false 时各树独立排布                                                                                                                                                                                                                                                    |
| default（slot）     | —                  | 放置若干 `<vue-okr-tree only-both-tree>`                                                                                                                                                                                                                                             |
| refresh()（method） | —                  | 手动重新测量（字体加载完成、外部样式变化等场景；组件已自动响应成员挂载/更新与尺寸变化）                                                                                                                                                                                              |
| 键盘导航            | —                  | Tab 进入，↑/↓ 在可见节点间移动，→ 展开或进入子节点，← 收起或回到父节点，Enter/Space 选中，Home/End 首尾；OKR 根节点 ← 进入左子树，左树节点镜像。节点带 `role=treeitem` / `aria-expanded` / `aria-selected` / `aria-level`，焦点环可用 `--okr-focus-color` / `--okr-focus-width` 定制 |

<!-- API-DOC-END -->

## 与 vue-okr-tree 的差异（迁移说明）

API 名称与语义完全对齐，直接把 `import { VueOkrTree } from 'vue-okr-tree'` 换成 `vue3-okr-tree` 并引入 `dist/style.css` 即可。以下为有意差异（均为缺陷修复或原版从未生效的能力）：

| 项目                           | vue-okr-tree（Vue 2）                                          | vue3-okr-tree                                                                           |
| ------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `render-content` 的 `h`        | Vue 2 的 `createElement`                                       | Vue 3 的 `h`（属性写法按 Vue 3：`{ class, style, onClick }`）                           |
| `filter` 范围                  | 只过滤第一个根节点的子树，第一层节点自身永不隐藏               | 全树过滤，父节点有可见后代时保持可见（element-ui 语义）                                 |
| OKR 左右树同 key               | 共用注册表，互相覆盖                                           | 左右分表，`getNode` 右树优先；`default-expanded-keys` / `current-node-key` 两树同时生效 |
| `animate` / `animate-duration` | 点击 +/- 实际无过渡；`animate-duration` 从未生效               | 展开/收起有真实过渡，三个动画 prop 均生效                                               |
| 根对齐                         | 需在业务层手动测量 DOM                                         | 内建 `align-root`（可关闭）                                                             |
| 插槽                           | 内部有插槽代码但外部无法使用                                   | 开放 `#default="{ node, data }"`                                                        |
| `props.disabled`               | 声明未使用                                                     | 实现真实禁用                                                                            |
| 全局样式                       | `* { margin:0; padding:0 }` 污染宿主页面                       | 样式全部限定在 `.org-chart-container` 内                                                |
| 死代码                         | `selectedKey` / `orkstyle` / `props.leftChildren` 等声明未使用 | 不移植                                                                                  |

## 开发

后续优化计划见 [docs/roadmap.md](./docs/roadmap.md)（可勾选清单），需求与决策见 [docs/requirements.md](./docs/requirements.md)。

```bash
pnpm install
pnpm dev              # Demo 站（引用源码）
pnpm test             # Vitest：模型层单测 + 组件冒烟测试
pnpm typecheck        # vue-tsc
pnpm lint             # ESLint
pnpm build            # 库构建 → dist/
pnpm verify:dist      # 用 dist 产物做挂载冒烟
pnpm build:playground # Demo 站构建（PLAYGROUND_USE_DIST=1 时引用 dist 产物）
```

## License

MIT
