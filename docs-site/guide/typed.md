# 类型化：createTypedOkrTree&lt;T&gt;

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

组件同时导出 `TreeStore` / `TreeNode` / `createNode` 与全部类型（`TreeKey` / `TreeNodeData` / `TreeLoadFunction` / `ViewportOffset` 等），方便扩展与二次封装。
