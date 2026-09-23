# 需要注意的行为

页面收录几条容易踩到、且开发期不一定看得见的约定。

## 回写类方法会改你的源数据

以下方法会**同步修改你传进来的 `data` 对象**（写 `children` 数组、把新节点对象塞进去），与 vue-okr-tree 一致：

- `append` / `insertBefore` / `insertAfter` / `remove` / `updateKeyChildren`
- `moveNode`（以及拖拽引发的移动）
- 懒加载的 `resolve(children)`

这不是缺陷而是刻意保留的语义：命令式改完之后视图与源数据始终一致，不需要你自己同步状态。但它意味着别把 `data` 当成不可变输入——`props` 字段映射后的对象、Redux / pinia store 里的对象会被就地改写；需要「撤销」请自己先深拷贝；同一份数据同时喂给多棵树会互相污染。

想在不改源数据的前提下换内容，正确做法是更新上层状态、让 `data` 的**引用**变化后由组件重建。

## 未设置 node-key 时的默认 key 策略

不配 `node-key` 也能正常渲染与交互：组件会在每个节点的源数据对象上写入一个**不可枚举**的 `$treeNodeId` 内部 id，作为 `v-for` 的 key。源数据被冻结或只读、写不进去时，降级到内部 WeakMap 记录同样的 id，行为不变（不抛错）。

代价是：**未配 `node-key` 时节点注册表是空的**，凡是按 key 或按 data 对象定位节点的入参都查不到节点——`getNode(data 对象)` 返回 `null`，`getCheckedKeys` / `getHalfCheckedKeys` 返回空数组，`v-model:expanded-keys` / `default-expanded-keys` / `current-key` / `default-checked-keys` / `updateKeyChildren` / `setCheckedKeys` 均不生效（开发期会给出警告）。仍然可用的是**传 Node 实例**：`#default` 插槽作用域里的 `node`、各事件回调的节点参数，以及不依赖注册表的 `getVisibleNodes()`、`expandAll` / `collapseAll` / `filter` 等。

另外，深拷贝源数据（`JSON.parse(JSON.stringify(data))`、部分状态库的快照恢复）会丢掉这个不可枚举标记，克隆出的对象会被分配新的内部 id、被当作不同节点，展开态随之丢失。需要持久化、跨拷贝定位节点或使用上述按 key 的能力，请配置 `node-key`。

## 冻结 / 只读源数据

渲染、展开收起、过滤、勾选等只读操作在 `Object.freeze` 或外部 store 的 readonly 数据上完全正常。
但上面列出的**回写类方法**要改源数据的 `children`：冻结数据下写入这一步被跳过并输出一条开发期警告（不抛错、也不静默失败），而**视图仍会完成这次增删**（`append` / `insertBefore` / `insertAfter` / `remove` / `moveNode` / 懒加载 `resolve` 均如此）——于是视图与源数据不再一致，下次 `data` 引用变化重建时该节点会消失。需要在这类数据上做增删，请改为更新上层状态、让 `data` 引用变化后由组件重建。

## 创建期快照的 prop

`node-key` / `direction` / `onlyBothTree` 是**创建期快照**，运行时改不会生效（开发期会警告并提示换 `:key` 重建实例）。`deep-watch` 同样只在创建期生效（它是 watch 创建期读取的快照，改值不会重建那个 watch）。其余 prop（`data` / `leftData` / `show-collapsable` / `default-expand-all` / `props` 映射 / `accordion` / `draggable` 等）运行时正常同步。

两个「初始态」prop 的运行时语义不同，别混：

- `default-expanded-keys` 运行时变更 = **只追加展开、不收回**：新列表会逐个展开（左右两树都查，`tree-store.ts:320-329`），但不在新列表里的已展开节点不会被收起，所以净效果只有「加」。
- `default-checked-keys` 运行时变更 = **先清空再按新列表应用**（`OkrTree.vue:762` 走 `setCheckedKeys`），且 `data` 重建后不恢复。

需要「精确控制哪些展开」请用受控的 `v-model:expanded-keys`。以上与姊妹包 react-okr-tree 实测一致（两端各跑一条 `defaultExpandedKeys: [1] → [3]` 的用例，结果都是 `[true, true]`）。

## 过滤与可见性

- `filter('')` 同样会对每个节点执行 `filter-node-method`，需对空值返回 `true` 才能恢复全部显示。
- 过滤为全树语义：父节点有可见后代时保持可见；被 `filter` 隐藏的节点不计入 `aria-setsize` / `aria-posinset`。
- 折叠的子树仍挂载在 DOM 中，所以「DOM 里的节点数」不等于可见节点数，取真正可见的节点请用 `getVisibleNodes()`。
