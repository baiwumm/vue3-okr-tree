---
title: 指南总览
navigation:
  icon: i-lucide-map
description: 一页速查：想做什么 → 用哪个 prop / 方法 → 去哪页看细节
---

## 布局与展开

| 要做的事          | 用什么                                              | 详见                                |
| ----------------- | --------------------------------------------------- | ----------------------------------- |
| 选展开方向        | `direction="vertical" \| "horizontal"`              | [快速开始](/guide/quick-start)      |
| 飞书 OKR 双向展开 | `only-both-tree` + `:left-data`（必须 horizontal）  | [快速开始](/guide/quick-start)      |
| 根节点不跳位      | `align-root`（默认开）；多棵树对齐用 `OkrTreeGroup` | [多树根对齐](/guide/group)          |
| 展开/收起动画     | `animate` + `animate-name` + `animate-duration`     | [主题与样式定制](/theme/)           |
| 连接线换 SVG      | `connector="svg"` + `connector-shape`               | [主题与样式定制](/theme/)           |
| 手风琴 / 点击展开 | `accordion` / `expand-on-click-node`                | [受控状态与方法](/guide/controlled) |
| 大数据放不下      | `OkrTreeViewport` 缩放平移与导出                    | [画布缩放](/guide/viewport)         |

## 数据与状态

| 要做的事          | 用什么                                                            | 详见                                |
| ----------------- | ----------------------------------------------------------------- | ----------------------------------- |
| 字段名不一样      | `props: { label, children, disabled, isLeaf }`                    | [API](/api/)                        |
| 只加载展开路径    | `lazy` + `load`                                                   | [懒加载](/guide/lazy)               |
| 精确控制展开/选中 | `v-model:expanded-keys` / `v-model:current-key`（需 `node-key`）  | [受控状态与方法](/guide/controlled) |
| 命令式增删改      | `append` / `insertBefore` / `insertAfter` / `remove` / `moveNode` | [受控状态与方法](/guide/controlled) |
| 搜索过滤          | `filter-node-method` + `ref.filter(value)`                        | [需要注意的行为](/guide/behavior)   |
| 面包屑 / 全选可见 | `getNodePath()` / `getVisibleNodes()`                             | [受控状态与方法](/guide/controlled) |
| 勾选              | `show-checkbox` + `getCheckedKeys()` 等                           | [复选框与拖拽](/guide/interaction)  |
| 拖拽换父级        | `draggable` + `allow-drag` / `allow-drop`                         | [复选框与拖拽](/guide/interaction)  |

## 外观与集成

| 要做的事        | 用什么                                        | 详见                                               |
| --------------- | --------------------------------------------- | -------------------------------------------------- |
| 换整体观感      | `theme`（六套内置）或自写 `.okr-theme-{name}` | [主题与样式定制](/theme/)                          |
| 精确调外观      | `--okr-*` 变量（可写在任意祖先或内联）        | [主题与样式定制](/theme/)                          |
| 接 Tailwind     | `unstyled`（只去卡片外观，布局与连接线保留）  | [主题与样式定制](/theme/)                          |
| 打印 / 导出图片 | 打印样式自动生效；图片用 `exportImage()`      | [主题与样式定制](/theme/)、[画布](/guide/viewport) |
| 类型收窄        | `createTypedOkrTree<T>()`                     | [类型化](/guide/typed)                             |
| 键盘与读屏      | 内置 WAI-ARIA tree 与漫游 tabindex            | [键盘导航](/guide/keyboard)                        |
| SSR / Nuxt      | 服务端可直接渲染，三项客户端专属能力除外      | [快速开始](/guide/quick-start)                     |

## 子页

- [快速开始](/guide/quick-start) — 安装、样式引入、全局注册、CDN / UMD、SSR
- [Demo 总览](/guide/demos) — 24 个可交互用例（与 Playground 同一批组件源码）
- [自定义节点内容](/guide/node-content) — 插槽 / 组件 / render-content 三种写法
- [受控状态与方法](/guide/controlled) — 判定规则、ref 方法、事件回调
- [复选框与拖拽](/guide/interaction) — 联动与半选、三分区放置与钩子
- [懒加载子节点](/guide/lazy) — `load` / `resolve` / `reject`、`isLeaf`、失败重试
- [画布缩放 OkrTreeViewport](/guide/viewport) — props / 方法 / 交互契约 / 导出
- [多树根对齐 OkrTreeGroup](/guide/group) — 测量机制与自动重测
- [键盘导航与可访问性](/guide/keyboard) — 按键表与漫游 tabindex
- [类型化 createTypedOkrTree](/guide/typed) — T 覆盖位置与导出清单
- [需要注意的行为](/guide/behavior) — 回写源数据、`node-key` 缺失、只读数据、创建期 prop
- [仓库与本地开发](/guide/repo) — 目录结构、三份真源、命令与发布
