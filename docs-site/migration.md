# 与 vue-okr-tree 的差异（迁移说明）

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

## Vue 3 版新增能力

- 受控状态 `v-model:expanded-keys` / `v-model:current-key` 与展开/收起/滚动方法（1.2.0）
- `#expand-btn` / `#empty` 插槽、`node-component` prop、`createTypedOkrTree<T>()`（1.2.0 / 1.3.0）
- `<OkrTreeGroup>` 多树根对齐、WAI-ARIA 键盘导航（1.3.0）
- `lazy` + `load` 懒加载、`<OkrTreeViewport>` 画布缩放与导出、`getNodeEl`（1.4.0）
- `deep-watch` 性能开关、逐层脏检查增量更新（1.5.0）
