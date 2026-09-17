# vue3-okr-tree

基于 Vue 3 的组织架构树 / OKR 树组件，是 [vue-okr-tree](https://github.com/qq449245884/vue-okr-tree)（Vue 2）的 Vue 3 完整复刻版。特色是支持类似飞书 OKR 的**根节点左右双向展开**布局，全部连接线由纯 CSS 绘制。

- 对外 API（props / events / methods）与 `vue-okr-tree` 对齐，可平滑迁移
- `<script setup>` + TypeScript，提供完整 `.d.ts`
- 产物：ESM / CJS / UMD + `style.css`
- 内建 `align-root` 根对齐，OKR 模式下展开/收起不再位移，无需手动测量 DOM
- 全部外观取值通过 `--okr-*` CSS 变量暴露，内置 `default / feishu / dark / auto / minimal / colorful` 六套主题（`theme` prop），也可自定义
- 受控状态 `v-model:expanded-keys` / `v-model:current-key`，`expandAll` / `collapseAll` / `expandNode` / `collapseNode` / `scrollToNode` 方法，`#expand-btn` / `#empty` 插槽
- `<OkrTreeGroup>` 跨实例根对齐、WAI-ARIA 键盘导航、`node-component` prop、`createTypedOkrTree<T>()` 类型化辅助
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

## API

### Attributes

| 参数                       | 说明                                                                                                                                                          | 类型                   | 默认值               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | -------------------- |
| `data`                     | 展示数据（数组，支持多根）                                                                                                                                    | array                  | 必填                 |
| `direction`                | 展开方向：`vertical` / `horizontal`                                                                                                                           | string                 | `vertical`           |
| `onlyBothTree`             | 飞书 OKR 模式：子树在根节点左右两侧展开，需 `direction="horizontal"` 且提供 `leftData`                                                                        | boolean                | `false`              |
| `leftData`                 | 左子树数据                                                                                                                                                    | array                  | —                    |
| `label-width`              | 节点宽度。number → px；string → 直接作为 `style.width`                                                                                                        | string / number        | auto                 |
| `label-height`             | 节点高度，规则同上                                                                                                                                            | string / number        | auto                 |
| `label-class-name`         | 节点 className，`Function(node)` 或字符串。`node` 为内部 Node 实例                                                                                            | Function / string      | —                    |
| `current-lable-class-name` | 选中节点 className（保留原拼写）                                                                                                                              | Function / string      | —                    |
| `show-collapsable`         | 是否显示 +/- 展开按钮。为 `false` 时组件强制全部展开                                                                                                          | boolean                | `false`              |
| `show-node-num`            | 折叠时在按钮内显示子节点数                                                                                                                                    | boolean                | `false`              |
| `default-expand-all`       | 默认展开全部（仅 `show-collapsable` 为 true 时有意义）                                                                                                        | boolean                | `false`              |
| `render-content`           | 节点内容渲染函数 `(h, node)`                                                                                                                                  | Function               | —                    |
| `node-btn-content`         | 展开按钮内容渲染函数 `(h, node)`                                                                                                                              | Function               | —                    |
| `node-component`           | **新增。** 节点内容组件，以 `{ node, data }` 为 props 渲染。优先级：`#default` 插槽 > `node-component` > `render-content`                                     | Component              | —                    |
| `props`                    | 字段映射，见下表                                                                                                                                              | object                 | —                    |
| `node-key`                 | 节点唯一标识字段名                                                                                                                                            | string                 | —                    |
| `default-expanded-keys`    | 默认展开的 key 数组（需 `node-key`）；OKR 模式下对左右两树同时生效                                                                                            | array                  | —                    |
| `current-node-key`         | 初始选中节点 key（需 `node-key`）                                                                                                                             | string / number        | —                    |
| `filter-node-method`       | 过滤方法 `(value, data, node)`，返回 false 隐藏。`filter('')` 时同样会被调用，需对空值返回 true                                                               | Function               | —                    |
| `animate`                  | 是否开启展开/收起过渡动画                                                                                                                                     | boolean                | `false`              |
| `animate-name`             | `okr-fade-in-linear` / `okr-fade-in` / `okr-zoom-in-center` / `okr-zoom-in-top` / `okr-zoom-in-bottom` / `okr-zoom-in-left`                                   | string                 | `okr-zoom-in-center` |
| `animate-duration`         | 过渡时长（ms）                                                                                                                                                | number                 | `200`                |
| `align-root`               | **新增。** OKR 模式下自动根对齐                                                                                                                               | boolean                | `true`               |
| `theme`                    | **新增。** 内置主题：`default` / `feishu` / `dark` / `auto` / `minimal` / `colorful`，或自定义名字（自行编写 `.okr-theme-{name}` 变量），见「主题与样式定制」 | string                 | `default`            |
| `expanded-keys`            | **新增。** 受控展开态（`v-model:expanded-keys`，需 `node-key`）：列表内节点展开、其余收起；变化时触发 `update:expandedKeys`。未传为非受控                     | array                  | —                    |
| `current-key`              | **新增。** 受控选中态（`v-model:current-key`，需 `node-key`）：`null` 表示无选中；变化时触发 `update:currentKey`                                              | string / number / null | —                    |

### props 配置

| 参数       | 说明                                                                                   | 类型                            | 默认值     |
| ---------- | -------------------------------------------------------------------------------------- | ------------------------------- | ---------- |
| `label`    | 节点文本字段                                                                           | string / `function(data, node)` | `label`    |
| `children` | 子节点字段                                                                             | string                          | `children` |
| `disabled` | 禁用字段。禁用节点带 `is-disabled` 类，点击不选中、不触发 `node-click`（Vue 3 版实现） | string / `function(data, node)` | `disabled` |

### Events

| 事件                  | 说明                                                     | 回调参数                             |
| --------------------- | -------------------------------------------------------- | ------------------------------------ |
| `node-click`          | 节点被点击（同时设置选中态）                             | `(data, node, nodeComponent)`        |
| `node-expand`         | 节点展开                                                 | `(data, node, nodeComponent)`        |
| `node-collapse`       | 节点收起                                                 | `(data, node, nodeComponent)`        |
| `node-contextmenu`    | 节点右键。仅当外部监听了该事件时才阻止浏览器默认右键菜单 | `(event, data, node, nodeComponent)` |
| `update:expandedKeys` | **新增。** 受控展开态变化（仅传入 `expanded-keys` 时）   | `(keys: TreeKey[])`                  |
| `update:currentKey`   | **新增。** 受控选中态变化（仅传入 `current-key` 时）     | `(key: TreeKey \| null)`             |

### Methods（通过 ref 调用）

| 方法                                    | 说明                                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `filter(value)`                         | 过滤；OKR 模式下同时过滤左右子树。未设置 `filter-node-method` 时抛错                                                                                   |
| `updateKeyChildren(key, data)`          | 用新数据替换 key 节点的全部子节点。需 `node-key`，缺失抛错                                                                                             |
| `getNode(data)`                         | 按 Node 实例 / key / data 对象获取内部 Node。OKR 模式右树优先，右树不存在时回退左树                                                                    |
| `setCurrentNode(node)`                  | 设置选中（Node 实例）。需 `node-key`，缺失抛错                                                                                                         |
| `setCurrentKey(key)`                    | 按 key 设置选中；`null` 取消高亮。需 `node-key`，缺失抛错                                                                                              |
| `getCurrentKey()`                       | 当前选中 key，无则 `null`。需 `node-key`，缺失抛错                                                                                                     |
| `getCurrentNode()`                      | 当前选中节点的 data，无则 `null`                                                                                                                       |
| `remove(data)`                          | 删除节点（Node / key / data）。**需 `node-key`，未设置时静默无效**                                                                                     |
| `append(data, parentNode)`              | 追加子节点；`parentNode` 支持 key / data / Node，省略则追加为根                                                                                        |
| `insertBefore(data, refNode)`           | 在 refNode 前插入                                                                                                                                      |
| `insertAfter(data, refNode)`            | 在 refNode 后插入                                                                                                                                      |
| `expandAll()`                           | **新增。** 展开全部节点（OKR 模式含左右两树）                                                                                                          |
| `collapseAll()`                         | **新增。** 收起全部节点                                                                                                                                |
| `expandNode(data, expandParent = true)` | **新增。** 展开指定节点（key / data / Node），默认连同祖先展开；OKR 根节点同时展开左右两侧。返回 Node 或 null                                          |
| `collapseNode(data)`                    | **新增。** 收起指定节点；OKR 根节点同时收起左右两侧                                                                                                    |
| `scrollToNode(data, options?)`          | **新增。** 先展开祖先使其可见，再 `scrollIntoView`（居中、平滑）。`options` 为 `ScrollIntoViewOptions & { expand?: boolean }`，返回 `Promise<boolean>` |

### Slots

| 插槽         | 说明                                                                    | 作用域参数                                                                                |
| ------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `default`    | 节点内容（替代 `render-content`）                                       | `{ node, data }`                                                                          |
| `expand-btn` | 展开按钮内容（替代 `node-btn-content`；`show-node-num` 开启时数字优先） | `{ node, data, expanded, side }`，`side` 为 `right`（常规/右子树）或 `left`（OKR 左子树） |
| `empty`      | `data` 为空数组时在容器内渲染                                           | —                                                                                         |

### 需要注意的行为

- **增删方法会同步修改传入的源数据**：`append` / `insertBefore` / `insertAfter` 会把新数据写入父节点源数据的 `children` 数组，`remove` / `updateKeyChildren` 会从源数据中删除。这与 `vue-okr-tree` 一致，也是让 `data` 与视图保持一致的方式。
- 依赖 `node-key` 的方法：`setCurrentNode` / `setCurrentKey` / `getCurrentKey` / `updateKeyChildren` 缺少 `node-key` 时抛出 `[Tree] nodeKey is required in xxx`；`remove` / `append(key)` 等按 key 查找的方法在未设置 `node-key` 时查不到节点、静默无效。传 data 对象时可依赖内部隐藏标记 `$treeNodeId` 查找。
- `data` 为响应式对象时，原地 `push` / `splice` 会被侦听并增量更新视图（保留已展开状态）；替换引用则整棵重建。
- 组件导出了 `TreeStore` / `TreeNode` / `createNode` 与全部类型，方便扩展。
- 组件导出 `OkrTreeGroup`、`createTypedOkrTree`，插件方式注册时会同时注册 `<okr-tree-group>`。
- 开发环境（`process.env.NODE_ENV !== "production"`）下会对常见配置错误输出一次性 `console.warn`：重复 `node-key`、`onlyBothTree` 但 `direction` 非 `horizontal`、传了 `leftData` 未开 `onlyBothTree`、受控 prop 缺 `node-key`。通过 CDN 直接引用 UMD 时不输出。

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
