---
# 标题不带品牌前缀：docus 的 titleTemplate 是 `%s - vue3-okr-tree`，原先这里也写了
# "vue3-okr-tree — ..."，渲染出来品牌重复两次，58 字符的标题浪费近一半版面。
title: Vue 3 组织架构树 / OKR 树组件
description: Vue 3 组织架构树 / OKR 树组件：根节点左右双向展开、CSS 变量主题化、懒加载、画布缩放与导出
navigation: false
---

::u-page-hero
---

title: Vue 3 组织架构树 / OKR 树组件
description: 根节点左右双向展开 · CSS 变量主题化 · 懒加载 · 画布缩放与导出
links:

- label: 快速开始
  to: /guide/quick-start
  icon: i-lucide-rocket
- label: GitHub
  to: https://github.com/baiwumm/vue3-okr-tree
  icon: i-simple-icons-github
  color: neutral
  variant: subtle
  target: _blank

---

#headline

:version-badge

::

::u-page-section
---

headline: 概览

# 只给搜索引擎与读屏软件看：视觉上不占位（sr-only），但正文留在 DOM 里。

# 需求方 2026-11-25 要求首页不展示概览段，而这段是首页唯一能承载

# 「组织架构树 / OKR 树 / 组织架构图」词面的正文，所以不下线、只隐藏。

# 块里刻意不放链接：sr-only 的链接是可聚焦的，键盘 Tab 会停在不可见的焦点上（WCAG 2.4.7）。这些内链导航与特性卡片都已覆盖，不靠它。

class: sr-only

---

#body

vue3-okr-tree 是一个基于 Vue 3 的组织架构树 / OKR 树组件：根节点居中，左右两侧同时展开子节点，连接线由纯 CSS 绘制，不需要 canvas、额外的布局引擎或手动测量 DOM。它的对外 API 与 Vue 2 时代的 vue-okr-tree 对齐，已有项目迁移时基本不用重写模板。

它面向三类页面：企业**组织架构图**、飞书式的 **OKR 目标树**，以及需要层级拖拽的编辑器。复选框父子联动与半选、拖拽换父级、手风琴、点击节点展开、`filter` 过滤都是内建能力；数据量上去以后，`lazy` 只加载展开路径，`virtual` 做窗口化渲染。外观全部通过 `--okr-*` CSS 变量暴露，内置 default / feishu / dark / auto / minimal / colorful 六套主题，也可以用 `unstyled` 交给 Tailwind 接管；需要整幅画布时，`OkrTreeViewport` 提供滚轮缩放、拖拽平移与 PNG / SVG 导出。键盘导航按 WAI-ARIA tree 语义实现（漫游 tabindex + 方向键），并自动响应系统的减弱动效设置。

完整的 props / events / methods / 插槽见 API，与 Vue 2 版的差异清单见 迁移说明。React 技术栈用同结构实现的 react-okr-tree，两个包自 1.13.0 起锁步发版。

::

::u-page-section
---

headline: 上手
title: 两行代码接入，5 分钟看到你自己的数据
description: 不想先装也行——Playground 里 24 个用例，把 data 换成你的组织结构即可看到效果。

---

#body

```vue
<script setup lang="ts">
import { VueOkrTree } from 'vue3-okr-tree'
import 'vue3-okr-tree/dist/style.css'
</script>

<template>
  <VueOkrTree :data="data" direction="horizontal" show-collapsable default-expand-all />
</template>
```

不想先装也行：**[Playground](/playground/)** 里 24 个用例可以直接改数据试交互；安装、CDN / UMD 与 SSR 注意事项见 **[快速开始](/guide/quick-start)**。

::

::u-page-section
---

headline: 特性
title: 一棵树覆盖组织架构与 OKR 两类场景
description: 渲染、交互、导出全部内建；外观走 CSS 变量，不需要构建期配置。

---

#body

:::u-page-grid

::::u-page-card
---

icon: i-lucide-tree-deciduous
title: OKR 左右双向展开
to: /guide/quick-start
spotlight: true

---

内建 align-root 根对齐，展开收起不位移。

::::

::::u-page-card
---

icon: i-lucide-palette
title: CSS 变量主题化
to: /theme
spotlight: true

---

六套内置主题，外观取值全部可用 --okr-* 变量覆写。

::::

::::u-page-card
---

icon: i-lucide-mouse-pointer-click
title: 交互完备
to: /guide/interaction
spotlight: true

---

复选框联动、拖拽换父级、手风琴、点击节点展开。

::::

::::u-page-card
---

icon: i-lucide-zap
title: 大数据量友好
to: /guide/lazy
spotlight: true

---

懒加载 + 逐层脏检查，2000 节点首渲染 < 300ms。

::::

::::u-page-card
---

icon: i-lucide-image-down
title: 画布缩放与导出
to: /guide/viewport
spotlight: true

---

滚轮缩放、拖拽平移、适应窗口、PNG / SVG 导出。

::::

::::u-page-card
---

icon: i-lucide-keyboard
title: WAI-ARIA 可访问性
to: /guide/keyboard
spotlight: true

---

漫游 tabindex、方向键导航、OKR 左树镜像。

::::

:::

::
