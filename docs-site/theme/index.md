# 主题与样式定制

组件所有可定制的外观取值都通过 CSS 变量暴露，并在使用点写成 `var(--okr-*, 默认值)`，因此：

- 不传 `theme` 时外观与 vue-okr-tree 完全一致；
- 变量可以写在组件根容器（`theme` prop 会加 `okr-theme-{name}` 类）、任意祖先元素、`:root`，甚至内联 `style="--okr-line-color: red"`；
- 选中态只在主题中提供内置样式，且优先级刻意放低，你通过 `current-lable-class-name` 传入的类始终可以覆盖它。

## 内置主题

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

六套主题的实际效果可在 [Demo 总览](/guide/demos) 各用例与 Playground 顶部切换预览。

传不在这六套里的名字是允许的（用于挂你自己的 `.okr-theme-{name}` 类），只是开发期会输出一条提示，避免拼错主题名时毫无视觉变化却找不到原因。内置清单可从包入口按 `BUILT_IN_THEMES` 取用。

## 自定义主题 / 覆盖变量

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

## 变量一览

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
| `--okr-drop-color`        | 拖拽放置指示线 / inner 描边颜色   | 取 `--okr-current-bg`           |
| `--okr-focus-color`       | 键盘焦点环颜色                    | `#409eff`                       |
| `--okr-focus-width`       | 键盘焦点环宽度                    | `2px`                           |
| `--okr-anim-duration`     | 展开/收起过渡时长（由 prop 写入） | `200ms`                         |
| `--okr-anim-easing`       | 过渡缓动（按动画名可覆盖）        | `cubic-bezier(.55,0,.1,1)`      |

画布组件 `OkrTreeViewport` 另有一组变量：`--okr-viewport-height`（默认 `420px`）、`--okr-viewport-bg`、`--okr-viewport-border`、`--okr-viewport-radius`、`--okr-viewport-toolbar-bg`、`--okr-viewport-toolbar-shadow`。

另有 `--okr-group-left-width` 由 [`OkrTreeGroup`](/guide/group) 运行时测量写入，不是给用户改的。

## 连接线：CSS 与 SVG 两种渲染模式

默认 `connector="css"` 用伪元素画线；`connector="svg"` 把线条换成覆盖层 `<svg>` 路径，**布局零改动**——伪元素只被中和边框、保留占位盒（展开按钮的 +/- 符号同为伪元素边框，不在中和范围内）。

```vue
<vue-okr-tree :data="data" direction="horizontal" connector="svg" connector-shape="orthogonal" />
```

- `connector-shape` 仅在 svg 模式下生效：`curve` 三次贝塞尔（控制点随主轴延伸，最长 40px）/ `orthogonal` 中点直角折线 / `straight` 两点直线。
- 线色与线宽继续走 `--okr-line-color` / `--okr-line-width`，六套主题与自定义变量零配置适配。
- 锚点随模式镜像：垂直出底入顶；水平右树出右入左、OKR 左树出左入右；根节点到 OKR 左树顶层节点绘制镜像连线。
- 展开/收起（含 `animate` 过渡期间）与容器尺寸变化都会自动重绘，不留残影；运行时切换 `connector` / `connector-shape` 即时生效。
- 可与[画布缩放](/guide/viewport)与 OKR 双树组合；交互用例见 [Demo 总览](/guide/demos)。

## 无样式模式

`unstyled` 只去掉卡片外观（背景 / 边框 / 圆角 / 阴影，含 hover 态），布局与连接线原样保留，
供 Tailwind 或自有设计系统接管。它**刻意不动** `padding`、`font-size`、`color`：改 `padding` 会移动
节点盒、牵动连接线的伪元素几何，这三项请继续用 `--okr-node-padding` / `--okr-node-font-size` /
`--okr-node-color` 或 `label-class-name` 调。

顺带说明为什么样式是手写而不是接 Tailwind：连接线是伪元素上的像素级几何（`::before/::after` 的
边框与偏移量彼此咬合），工具类表达不了；而 Preflight 会重新引入全局样式污染——那正是原版
`* { margin:0; padding:0 }` 被诟病的地方。所以组件本体只留 CSS 变量，本文档站才随意用 Tailwind。

## 打印

`@media print` 下自动隐藏展开按钮与画布工具栏（纸上点不动的交互件），并去掉卡片与画布的
`box-shadow`（部分打印引擎会把阴影渲染成灰块、也费墨）。折叠的子树按屏幕原样输出——想让整棵树
都印出来，先调 `expandAll()`。需要图片版请用[画布组件](/guide/viewport)的 `exportImage()`。

## 减弱动效

系统开启「减弱动态效果」（`prefers-reduced-motion: reduce`）时，展开/收起过渡与 `scrollToNode`
的平滑滚动自动关闭，状态直切——`animate` 无需宿主自己判断媒体查询。
