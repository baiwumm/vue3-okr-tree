---
layout: home
# 首页标签标题用站点全名（「vue3-okr-tree — Vue 3 组织架构树 / OKR 树组件」），
# 不再挂 config.titleTemplate 的短后缀；:title 是 VitePress 的占位符
titleTemplate: ':title'

hero:
  name: vue3-okr-tree
  text: Vue 3 组织架构树 / OKR 树组件
  tagline: 根节点左右双向展开 · CSS / SVG 连接线 · CSS 变量主题化 · 懒加载 · 复选框与拖拽 · 画布缩放与导出
  image:
    src: /logo-tile.svg
    alt: vue3-okr-tree Logo
    width: 180
    height: 180
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/quick-start
    - theme: alt
      text: 可交互 Demo
      link: /guide/demos
    - theme: alt
      text: API
      link: /api/
    - theme: alt
      text: GitHub
      link: https://github.com/baiwumm/vue3-okr-tree

features:
  - icon: 🌳
    title: OKR 左右双向展开
    details: 内建 align-root 根对齐，展开收起不位移。
  - icon: 🎨
    title: CSS 变量主题化
    details: 六套主题，外观取值全部可用 --okr-* 覆写。
  - icon: ✅
    title: 交互完备
    details: 复选框、拖拽换父级、手风琴、点击节点展开。
  - icon: ⚡
    title: 大数据量友好
    details: 懒加载 + 逐层脏检查，2000 节点首渲染 < 300ms。
  - icon: 🖱️
    title: 画布缩放与导出
    details: 滚轮缩放、拖拽平移、适应窗口、PNG / SVG 导出。
  - icon: ⌨️
    title: WAI-ARIA 可访问性
    details: 漫游 tabindex、方向键导航、OKR 左树镜像。
  - icon: 📦
    title: 发布就绪
    details: ESM / CJS / UMD + d.ts，publint / attw 零错误。
---
