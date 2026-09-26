---
title: vue3-okr-tree — Vue 3 组织架构树 / OKR 树组件
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
