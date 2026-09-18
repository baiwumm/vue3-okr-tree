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
| `--okr-anim-duration`     | 展开/收起过渡时长（由 prop 写入） | `200ms`                         |

画布组件 `OkrTreeViewport` 另有一组变量：`--okr-viewport-height`（默认 `420px`）、`--okr-viewport-bg`、`--okr-viewport-border`、`--okr-viewport-radius`、`--okr-viewport-toolbar-bg`、`--okr-viewport-toolbar-shadow`。
