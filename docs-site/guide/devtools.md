# Vue Devtools 面板

开发环境下，本库会向 Vue Devtools 注册一个 **OkrTree** 面板（Tab 栏在「Components / Pinia」等旁边），用于查看每棵存活树实例的内部状态，不需要任何额外安装或初始化。

## 使用方式

1. 浏览器装好 [Vue Devtools 扩展](https://devtools.vuejs.org/)（v6 及以上）。
2. 正常开发运行（`pnpm dev` 或你自己项目的 dev server），页面上渲染出任意 `<VueOkrTree>` 即可。
3. 打开 Vue Devtools，切到 **OkrTree** 面板：左列列出当前存活的树实例（按根节点文案标识），点击右侧即可查看。

面板数据按需拉取——点击、展开、勾选后回到面板即见最新状态，不占用任何渲染路径。

## 能看到什么

- **树实例列表**：每棵实例一条，附注册表节点数 tag；OKR 模式（`only-both-tree`）额外带 `OKR` 标记，节点数显示为「右树+左树」。
- **概要**：右树 / 左树节点数、展开节点数、当前节点（key 与文案）、开启复选框时的勾选 / 半选计数。
- **节点注册表**：右树 / 左树各一分节，逐节点列出文案、层级、展开、可见、勾选 / 半选、子节点数——即 `store.nodesMap` 的可读视图，排查「`getNode` 为什么取不到」「这个节点为什么被过滤掉了」这类问题时直接对照。

## 生产安全性

面板代码与开发期警告同一套门控（运行时 `process.env.NODE_ENV !== 'production'`，由使用方的打包器替换）：**只在开发构建里生效，消费方的生产构建会把它整体消除**，与 Pinia / Vue Router 内置 Devtools 集成是同一模型。npm 包产物因此增大约 1.5 kB gzip（ESM 预算内），但不会进入你的生产包；SSR 渲染与浏览器直接引 UMD（无 `process`）时自动视为生产环境，不会注册。

实现是零依赖的：直接按 `@vue/devtools-api` v6 的线协议与 `window.__VUE_DEVTOOLS_GLOBAL_HOOK__` 握手（事件名与排队条目形状逐字同源），没有引入 `@vue/devtools-api` 依赖。姊妹包 react-okr-tree 无对应物——React DevTools 不提供第三方自定义面板 API。
