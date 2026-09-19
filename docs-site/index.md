---
layout: home

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
    details: 类似飞书 OKR 的根节点双向布局，内建 align-root 根对齐，展开/收起不位移；OkrTreeGroup 支持多树对齐。
  - icon: 🎨
    title: CSS 变量主题化
    details: 23+ 个 --okr-* 变量，内置 default / feishu / dark / auto / minimal / colorful 六套主题，也支持自定义主题名；unstyled 可整体去掉卡片外观，接入 Tailwind 或自有设计系统。
  - icon: ✅
    title: 交互完备
    details: 复选框选择（父子联动 / 半选 / check-strictly）、拖拽调整层级（allow-drop 钩子 + 6 个事件）、accordion 手风琴、点击节点展开，语义对齐 el-tree 的使用习惯。
  - icon: ⚡
    title: 大数据量友好
    details: lazy + load 按需加载子节点、updateChildren 逐层脏检查、deep-watch 开关，2000 节点首渲染 < 300ms；getVisibleNodes / getNodePath 便于做面包屑与「全选可见项」。
  - icon: 🖱️
    title: 画布缩放与导出
    details: OkrTreeViewport 提供滚轮缩放、拖拽平移、适应窗口与 PNG / SVG 导出，不侵入树本体。
  - icon: ⌨️
    title: WAI-ARIA 可访问性
    details: role=tree / treeitem、漫游 tabindex、完整方向键导航，OKR 左树镜像。
  - icon: 📦
    title: 发布就绪
    details: ESM / CJS / UMD + style.css + 单文件 d.ts；publint / attw 零错误，CI 全链路校验。
---
