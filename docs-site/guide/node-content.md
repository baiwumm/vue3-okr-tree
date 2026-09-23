# 自定义节点内容

三种等价写法，优先级：`#default` 插槽 > `node-component` > `render-content`。三者都缺省时渲染节点的 `label`。

<DemoBlock>

<Base06 />

</DemoBlock>

## render-content

签名 `(h, node)`：`h` 是 Vue 的渲染函数（由组件从 vue 导入后传入），`node` 是**内部 Node 实例**（源数据在 `node.data`，文本在 `node.label`，另有 `isCurrent` / `expanded` / `leftExpanded` / `isLeftChild` / `level` / `childNodes` 等）。这与 element-ui 的 `(h, { data })` 不同，与 vue-okr-tree 保持一致。

```ts
function renderContent(h, node) {
  return h('div', { class: ['diy', node.isCurrent && 'is-current', node.isLeftChild && 'left'] }, [
    h('div', node.data.label),
    h('small', node.data.content),
  ])
}
```

`node-btn-content` 用同一套参数约定，定制展开按钮内容。

## node-component

传一个组件，以 `{ node, data }` 为 props 渲染（Vue 3 版新增）：

```vue
<vue-okr-tree :data="data" :node-component="DeptCard" />
```

## #default 插槽

作用域插槽（Vue 3 版新增，原版的插槽实际不可用）：

```vue
<vue-okr-tree :data="data">
  <template #default="{ node, data }">
    <b>{{ data.label }}</b>
    <small v-if="node.isCurrent">（已选中）</small>
  </template>
</vue-okr-tree>
```

## 其余插槽

| 插槽名       | 说明                                                         | 作用域参数                                                                                                               |
| ------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `expand-btn` | 展开按钮内容；`show-node-num` 开启时折叠态的数字优先于该插槽 | `{ node, data, expanded, side, loading }`，side 为 `right`（常规/右子树）或 `left`（OKR 左子树），loading 为懒加载进行中 |
| `empty`      | `data` 为空数组时在容器内渲染                                | —                                                                                                                        |

## 类型收窄

需要插槽作用域里的 `data` 带上自己的数据类型，用 [`createTypedOkrTree<T>()`](/guide/typed)。

<script setup lang="ts">
import DemoBlock from '../components/DemoBlock.vue'
import Base06 from '../../playground/components/demos/Base06.vue'
</script>
