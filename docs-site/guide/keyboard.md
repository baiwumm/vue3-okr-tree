# 键盘导航与可访问性

树容器为 `role="tree"`，节点为 `role="treeitem"`，带 `aria-level` / `aria-expanded` / `aria-selected` / `aria-disabled` / `aria-setsize` / `aria-posinset`（后两者按可见兄弟节点计数，被 `filter` 隐藏的节点不计入），`show-checkbox` 下另输出 `aria-checked`（半选为 `mixed`），子容器为 `role="group"`。

## 按键

| 按键           | 行为                                           |
| -------------- | ---------------------------------------------- |
| `Tab`          | 进入 / 离开树                                  |
| `↑` / `↓`      | 在可见节点间移动焦点（文档顺序，跳过收起子树） |
| `→`            | 展开当前节点；已展开则进入第一个子节点         |
| `←`            | 收起当前节点；已收起则回到父节点               |
| `Enter`        | 选中节点（触发 `node-click`）                  |
| `Space`        | 选中节点；`show-checkbox` 下改为切换该节点勾选 |
| `Home` / `End` | 移到第一个 / 最后一个可见节点                  |

OKR 模式下：根节点 `←` 作用于左子树（展开或进入），左树节点的 `←` / `→` 镜像（`←` 展开/进入、`→` 收起/返回根节点）。

## 漫游 tabindex 的唯一性

同一时刻只有一个节点可被 Tab 进入：容器自己不带 `tabindex`，组件用一棵内部「当前焦点节点」状态（`OkrTree.vue:417` 的 `focusedNode`）决定哪个 `treeitem` 拿到 `tabindex="0"`，其余为 `-1`。`focusin`、点击、方向键移动都会更新它，所以从容器 Tab 出去再回来会落到**上次离开时所在的节点**。只有两种情况回到起点：还没聚焦过任何节点，或那个节点被卸载了（例如它所在的子树被收起）——此时第一个根节点可 Tab 进入（`OkrTreeNode.vue:497-502`）。

`aria-expanded` 在 OKR 模式下要**左右两侧都展开**才是 `true`（`OkrTreeNode.vue:467-475`）；懒加载下未加载但可能加载的节点算「有子节点」，会输出展开按钮与 `aria-expanded`。焦点落在节点内的输入控件（搜索框等）时不拦截按键。

## 减弱动效与焦点环

系统开启 `prefers-reduced-motion: reduce` 时，展开/收起过渡与 `scrollToNode` 的平滑滚动自动关闭，状态直切（`animate` 不用你自己查媒体查询）。焦点环颜色与宽度用 `--okr-focus-color`（默认 `#409eff`）/ `--okr-focus-width`（默认 `2px`）定制，见[主题与样式定制](/theme/)。
