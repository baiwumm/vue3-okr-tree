# 快速开始

vue3-okr-tree 是 [vue-okr-tree](https://github.com/qq449245884/vue-okr-tree)（Vue 2）的 Vue 3 完整复刻版，API 与其保持对齐。

React 技术栈请用姊妹包 [react-okr-tree](https://react-okr-tree.baiwumm.com)——本包的 React 完整复刻版，特性逐项对齐，版本号自 1.13.0 起两边锁步发布（同号即同一功能面）。

## 安装

```bash
pnpm add vue3-okr-tree
# 或
npm i vue3-okr-tree
```

Peer 依赖：`vue >= 3.3.0`（CI 在 vue 3.3 / 3.4 / 3.5 三档矩阵下跑全量单测）。

## 使用

```vue
<template>
  <vue-okr-tree :data="data" direction="horizontal" show-collapsable />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'
import 'vue3-okr-tree/dist/style.css'

const data = ref([
  {
    id: 1,
    label: 'xxx科技有有限公司',
    children: [
      { id: 2, label: '产品研发部', children: [{ id: 3, label: '研发-前端' }] },
      { id: 4, label: '销售部' },
    ],
  },
])
</script>
```

样式必须显式引入（`import 'vue3-okr-tree/dist/style.css'`），组件不会自动注入 CSS——只引组件不引样式的话，拿到的是没有外观与连接线的结构。

也可以全局注册：

```ts
import { createApp } from 'vue'
import VueOkrTreePlugin from 'vue3-okr-tree'
import 'vue3-okr-tree/dist/style.css'

createApp(App).use(VueOkrTreePlugin) // 注册 <vue-okr-tree> / <okr-tree> / <okr-tree-group> / <okr-tree-viewport>
```

## CDN（UMD）

UMD 产物挂在全局变量 `VueOkrTree` 上：

```html
<link rel="stylesheet" href="https://unpkg.com/vue3-okr-tree/dist/style.css" />
<script src="https://unpkg.com/vue"></script>
<script src="https://unpkg.com/vue3-okr-tree"></script>
<script>
  const { VueOkrTree } = window.VueOkrTree
</script>
```

注意这条路径下**没有任何开发期警告**：警告按 `process.env.NODE_ENV` 判定，`<script>` 环境里 `process` 不存在，一律视为生产环境，配置写错只会表现为一幅不对的画。排查问题请改用打包器环境，或对照[需要注意的行为](/guide/behavior)。

## SSR / 服务端渲染

组件 SSR 安全：setup 与渲染阶段不访问 `window` / `document`，浏览器专属能力（ResizeObserver、滚轮与指针监听、字体就绪后的重测）都放在挂载后并带 `typeof` 守卫，因此 Nuxt / Vite SSR 下可直接静态渲染，不会 hydration 报警。`tests/ssr/render-to-string.spec.ts` 用 `vue/server-renderer` 在无 DOM 的 Node 环境里覆盖了三种布局、OKR 左树、受控与交互 props 组合、`#default` / `#empty` 插槽、`OkrTreeGroup` 与 `OkrTreeViewport` 包裹六种情形。

三项是客户端专属，服务端调用没有意义：`OkrTreeViewport` 的 `exportImage()`（按需动态导入 `html-to-image`）、树的方法 `scrollToNode()`（`scrollIntoView`）、以及依赖 `ResizeObserver` 的自动重测。

样式仍需自己引：SSR 不会替你 import `vue3-okr-tree/dist/style.css`，在入口或布局里引一次即可。

## 更多

- 想直接把玩所有用例：前往 [Demo 总览](/guide/demos)（与 GitHub 上的 Playground 相同的组件）。
- 定制节点内容：[自定义节点内容](/guide/node-content)（`#default` 插槽 / `node-component` / `render-content`）。
- 大数据量：阅读[懒加载](/guide/lazy)与[画布缩放](/guide/viewport)。
- 从 vue-okr-tree 迁移：阅读[迁移说明](/migration)。
- 踩坑清单：[需要注意的行为](/guide/behavior)（回写类方法会改源数据、冻结 / 只读数据的边界、`node-key` 缺失时的静默）。
