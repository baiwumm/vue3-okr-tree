# vue3-okr-tree

基于 Vue 3 的组织架构树 / OKR 树组件，是 [vue-okr-tree](https://github.com/qq449245884/vue-okr-tree)（Vue 2）的 Vue 3 完整复刻版。特色是支持类似飞书 OKR 的**根节点左右双向展开**布局，全部连接线由纯 CSS 绘制。

- 对外 API（props / events / methods）与 `vue-okr-tree` 对齐，可平滑迁移
- `<script setup>` + TypeScript，提供完整 `.d.ts`
- 产物：ESM / CJS / UMD + `style.css`
- 内建 `align-root` 根对齐，OKR 模式下展开/收起不再位移，无需手动测量 DOM
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

也可以使用作用域插槽（Vue 3 版新增，原版插槽实际不可用）：

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

## API

### Attributes

| 参数                       | 说明                                                                                                                        | 类型              | 默认值               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------- | -------------------- |
| `data`                     | 展示数据（数组，支持多根）                                                                                                  | array             | 必填                 |
| `direction`                | 展开方向：`vertical` / `horizontal`                                                                                         | string            | `vertical`           |
| `onlyBothTree`             | 飞书 OKR 模式：子树在根节点左右两侧展开，需 `direction="horizontal"` 且提供 `leftData`                                      | boolean           | `false`              |
| `leftData`                 | 左子树数据                                                                                                                  | array             | —                    |
| `label-width`              | 节点宽度。number → px；string → 直接作为 `style.width`                                                                      | string / number   | auto                 |
| `label-height`             | 节点高度，规则同上                                                                                                          | string / number   | auto                 |
| `label-class-name`         | 节点 className，`Function(node)` 或字符串。`node` 为内部 Node 实例                                                          | Function / string | —                    |
| `current-lable-class-name` | 选中节点 className（保留原拼写）                                                                                            | Function / string | —                    |
| `show-collapsable`         | 是否显示 +/- 展开按钮。为 `false` 时组件强制全部展开                                                                        | boolean           | `false`              |
| `show-node-num`            | 折叠时在按钮内显示子节点数                                                                                                  | boolean           | `false`              |
| `default-expand-all`       | 默认展开全部（仅 `show-collapsable` 为 true 时有意义）                                                                      | boolean           | `false`              |
| `render-content`           | 节点内容渲染函数 `(h, node)`                                                                                                | Function          | —                    |
| `node-btn-content`         | 展开按钮内容渲染函数 `(h, node)`                                                                                            | Function          | —                    |
| `props`                    | 字段映射，见下表                                                                                                            | object            | —                    |
| `node-key`                 | 节点唯一标识字段名                                                                                                          | string            | —                    |
| `default-expanded-keys`    | 默认展开的 key 数组（需 `node-key`）；OKR 模式下对左右两树同时生效                                                          | array             | —                    |
| `current-node-key`         | 初始选中节点 key（需 `node-key`）                                                                                           | string / number   | —                    |
| `filter-node-method`       | 过滤方法 `(value, data, node)`，返回 false 隐藏。`filter('')` 时同样会被调用，需对空值返回 true                             | Function          | —                    |
| `animate`                  | 是否开启展开/收起过渡动画                                                                                                   | boolean           | `false`              |
| `animate-name`             | `okr-fade-in-linear` / `okr-fade-in` / `okr-zoom-in-center` / `okr-zoom-in-top` / `okr-zoom-in-bottom` / `okr-zoom-in-left` | string            | `okr-zoom-in-center` |
| `animate-duration`         | 过渡时长（ms）                                                                                                              | number            | `200`                |
| `align-root`               | **新增。** OKR 模式下自动根对齐                                                                                             | boolean           | `true`               |

### props 配置

| 参数       | 说明                                                                                   | 类型                            | 默认值     |
| ---------- | -------------------------------------------------------------------------------------- | ------------------------------- | ---------- |
| `label`    | 节点文本字段                                                                           | string / `function(data, node)` | `label`    |
| `children` | 子节点字段                                                                             | string                          | `children` |
| `disabled` | 禁用字段。禁用节点带 `is-disabled` 类，点击不选中、不触发 `node-click`（Vue 3 版实现） | string / `function(data, node)` | `disabled` |

### Events

| 事件               | 说明                                                     | 回调参数                             |
| ------------------ | -------------------------------------------------------- | ------------------------------------ |
| `node-click`       | 节点被点击（同时设置选中态）                             | `(data, node, nodeComponent)`        |
| `node-expand`      | 节点展开                                                 | `(data, node, nodeComponent)`        |
| `node-collapse`    | 节点收起                                                 | `(data, node, nodeComponent)`        |
| `node-contextmenu` | 节点右键。仅当外部监听了该事件时才阻止浏览器默认右键菜单 | `(event, data, node, nodeComponent)` |

### Methods（通过 ref 调用）

| 方法                           | 说明                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| `filter(value)`                | 过滤；OKR 模式下同时过滤左右子树。未设置 `filter-node-method` 时抛错                |
| `updateKeyChildren(key, data)` | 用新数据替换 key 节点的全部子节点。需 `node-key`，缺失抛错                          |
| `getNode(data)`                | 按 Node 实例 / key / data 对象获取内部 Node。OKR 模式右树优先，右树不存在时回退左树 |
| `setCurrentNode(node)`         | 设置选中（Node 实例）。需 `node-key`，缺失抛错                                      |
| `setCurrentKey(key)`           | 按 key 设置选中；`null` 取消高亮。需 `node-key`，缺失抛错                           |
| `getCurrentKey()`              | 当前选中 key，无则 `null`。需 `node-key`，缺失抛错                                  |
| `getCurrentNode()`             | 当前选中节点的 data，无则 `null`                                                    |
| `remove(data)`                 | 删除节点（Node / key / data）。**需 `node-key`，未设置时静默无效**                  |
| `append(data, parentNode)`     | 追加子节点；`parentNode` 支持 key / data / Node，省略则追加为根                     |
| `insertBefore(data, refNode)`  | 在 refNode 前插入                                                                   |
| `insertAfter(data, refNode)`   | 在 refNode 后插入                                                                   |

### 需要注意的行为

- **增删方法会同步修改传入的源数据**：`append` / `insertBefore` / `insertAfter` 会把新数据写入父节点源数据的 `children` 数组，`remove` / `updateKeyChildren` 会从源数据中删除。这与 `vue-okr-tree` 一致，也是让 `data` 与视图保持一致的方式。
- 依赖 `node-key` 的方法：`setCurrentNode` / `setCurrentKey` / `getCurrentKey` / `updateKeyChildren` 缺少 `node-key` 时抛出 `[Tree] nodeKey is required in xxx`；`remove` / `append(key)` 等按 key 查找的方法在未设置 `node-key` 时查不到节点、静默无效。传 data 对象时可依赖内部隐藏标记 `$treeNodeId` 查找。
- `data` 为响应式对象时，原地 `push` / `splice` 会被侦听并增量更新视图（保留已展开状态）；替换引用则整棵重建。
- 组件导出了 `TreeStore` / `TreeNode` / `createNode` 与全部类型，方便扩展。

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
