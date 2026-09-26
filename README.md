<p align="center">
  <!-- 绝对地址：logo 不在 npm 包内（files 只含 dist 与文档），相对路径在 npm 页面上取不到 -->
  <img src="https://vue3-okr-tree.baiwumm.com/logo-512.png" width="112" height="112" alt="vue3-okr-tree Logo" />
</p>

<h1 align="center">vue3-okr-tree</h1>

[![npm version](https://img.shields.io/npm/v/vue3-okr-tree.svg)](https://www.npmjs.com/package/vue3-okr-tree)
[![npm downloads](https://img.shields.io/npm/dm/vue3-okr-tree.svg)](https://www.npmjs.com/package/vue3-okr-tree)
[![CI](https://github.com/baiwumm/vue3-okr-tree/actions/workflows/ci.yml/badge.svg)](https://github.com/baiwumm/vue3-okr-tree/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/baiwumm/vue3-okr-tree/graph/badge.svg)](https://codecov.io/gh/baiwumm/vue3-okr-tree)
[![license](https://img.shields.io/npm/l/vue3-okr-tree.svg)](./LICENSE)

📚 **[在线文档站](https://vue3-okr-tree.baiwumm.com)** · [Playground 演示](https://vue3-okr-tree.baiwumm.com/playground/) · [更新日志](./CHANGELOG.md)

基于 Vue 3 的组织架构树 / OKR 树组件，是 [vue-okr-tree](https://github.com/qq449245884/vue-okr-tree)（Vue 2）的 Vue 3 完整复刻版。特色是支持类似飞书 OKR 的**根节点左右双向展开**布局，全部连接线由纯 CSS 绘制。

React 技术栈请用姊妹包 [react-okr-tree](https://github.com/baiwumm/react-okr-tree)——本包的 React 完整复刻版，特性逐项对齐，版本号自 1.13.0 起两边锁步发布（同号即同一功能面）。

## 特性

- 对外 API（props / events / methods）与 `vue-okr-tree` 对齐，可平滑迁移；并修复了原版的多根过滤、左右树同 key 覆盖、`animate` 无效等缺陷（[迁移说明](https://vue3-okr-tree.baiwumm.com/migration)）
- `<script setup>` + TypeScript，完整 `.d.ts`；产物 ESM / CJS / UMD + `style.css`
- `align-root` 根对齐：OKR 模式下展开/收起不位移，无需手动测量 DOM；`OkrTreeGroup` 支持多棵树跨实例对齐
- 受控状态 `v-model:expanded-keys` / `v-model:current-key`，`expandAll` / `collapseAll` / `scrollToNode` 等方法，`#default` / `#expand-btn` / `#empty` 插槽
- `lazy` + `load` 懒加载子节点（大数据量只加载展开路径），`OkrTreeViewport` 画布缩放平移与 PNG/SVG 导出
- 复选框（父子联动 / 半选）、拖拽调整层级、手风琴、点击节点展开、`filter` 过滤、CSS / SVG 双连接线模式
- 外观全部通过 `--okr-*` CSS 变量暴露，内置 `default / feishu / dark / auto / minimal / colorful` 六套主题，`unstyled` 可交给 Tailwind 接管
- 完整 WAI-ARIA 键盘导航（漫游 tabindex、方向键展开收起），自动响应系统的减弱动效设置

## 安装

```bash
pnpm add vue3-okr-tree
# 或
npm i vue3-okr-tree
```

Peer 依赖 `vue >= 3.3.0`（CI 在 vue 3.3 / 3.4 / 3.5 三档矩阵下跑全量单测）。样式需显式引入 `vue3-okr-tree/dist/style.css`，组件不自动注入 CSS。

## 快速开始

```vue
<template>
  <vue-okr-tree :data="data" direction="horizontal" show-collapsable default-expand-all />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'
import 'vue3-okr-tree/dist/style.css'

const data = ref([
  {
    label: 'xxx科技有限公司',
    children: [
      { label: '产品研发部', children: [{ label: '研发-前端' }, { label: '研发-后端' }] },
      { label: '销售部', children: [{ label: '销售一部' }] },
    ],
  },
])
</script>
```

全局注册（`app.use(VueOkrTreePlugin)`）与 CDN / UMD 用法见 [快速开始](https://vue3-okr-tree.baiwumm.com/guide/quick-start)。

## OKR 模式（根节点左右双向展开）

```vue
<vue-okr-tree
  :data="data"
  :left-data="leftData"
  only-both-tree
  direction="horizontal"
  show-collapsable
  node-key="id"
  default-expand-all
/>
```

- `only-both-tree` 仅在 `direction="horizontal"` 时有效，且必须提供 `left-data`。
- `left-data[0].children` 挂到右树第一个根节点的左侧；左右两棵树允许存在相同的 `id`（内部左右分表）。
- `align-root`（默认 `true`）让根节点在容器内居中，展开/收起任意一侧都不位移；设为 `false` 恢复原版按内容宽度排布。

## 完整文档

在线文档站：<https://vue3-okr-tree.baiwumm.com>（[Demo 总览](https://vue3-okr-tree.baiwumm.com/guide/demos) 的 24 个用例可直接交互，与 Playground 同一批组件源码）。

| 场景                                              | 文档站页面                                                             |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| 不知道从哪找：按能力速查                          | [指南总览](https://vue3-okr-tree.baiwumm.com/guide/)                   |
| 安装、全局注册、CDN / UMD、SSR                    | [快速开始](https://vue3-okr-tree.baiwumm.com/guide/quick-start)        |
| 定制节点内容（插槽 / 组件 / render-content）      | [自定义节点内容](https://vue3-okr-tree.baiwumm.com/guide/node-content) |
| `v-model:expanded-keys`、ref 方法、`filter`       | [受控状态与方法](https://vue3-okr-tree.baiwumm.com/guide/controlled)   |
| 复选框（父子联动 / 半选）与拖拽调整层级           | [复选框与拖拽](https://vue3-okr-tree.baiwumm.com/guide/interaction)    |
| 懒加载子节点                                      | [懒加载](https://vue3-okr-tree.baiwumm.com/guide/lazy)                 |
| 画布缩放平移与图片导出 `OkrTreeViewport`          | [画布缩放](https://vue3-okr-tree.baiwumm.com/guide/viewport)           |
| 多棵树根对齐 `OkrTreeGroup`                       | [多树根对齐](https://vue3-okr-tree.baiwumm.com/guide/group)            |
| 键盘导航与 ARIA                                   | [键盘导航](https://vue3-okr-tree.baiwumm.com/guide/keyboard)           |
| `createTypedOkrTree<T>` 类型收窄                  | [类型化](https://vue3-okr-tree.baiwumm.com/guide/typed)                |
| 主题、`--okr-*` 变量、无样式模式、打印            | [主题与样式定制](https://vue3-okr-tree.baiwumm.com/theme/)             |
| 踩坑清单（回写源数据、`node-key` 缺失、只读数据） | [需要注意的行为](https://vue3-okr-tree.baiwumm.com/guide/behavior)     |
| 从 `vue-okr-tree`（Vue 2）迁移                    | [迁移说明](https://vue3-okr-tree.baiwumm.com/migration)                |
| 目录结构、三份真源、命令与发布                    | [仓库与本地开发](https://vue3-okr-tree.baiwumm.com/guide/repo)         |

<!-- API-DOC-BEGIN（本段由 pnpm gen:readme 从 shared/api.ts 生成，勿手改） -->

## API

完整表格（每个参数的说明、类型与默认值）见 **[文档站 API 页](https://vue3-okr-tree.baiwumm.com/api/)**，Playground 的 API 页与下面这份概览读的都是同一份 [`shared/api.ts`](https://github.com/baiwumm/vue3-okr-tree/blob/main/shared/api.ts)——条数由脚本统计，表与实现的偏差不超过一条用例（`tests/api-surface.spec.ts`）。

- **Attributes**（41 条）：`data` / `direction` / `onlyBothTree` / `leftData` / `label-width` / `label-height` / `label-class-name` / `current-lable-class-name` / `show-collapsable` / `accordion` / `expand-on-click-node` / `show-checkbox` / `check-strictly` / `default-checked-keys` / `draggable` / `allow-drag` / `allow-drop` / `connector` / `connector-shape` / `unstyled` / `show-node-num` / `default-expand-all` / `render-content` / `node-btn-content` / `node-component` / `props` / `node-key` / `default-expanded-keys` / `current-node-key` / `filter-node-method` / `animate` / `animate-name` / `animate-duration` / `align-root` / `theme` / `expanded-keys` / `current-key` / `lazy` / `load` / `deep-watch` / `virtual`
- **Props（props 属性的字段映射配置）**（4 条）：`label` / `children` / `disabled` / `isLeaf`
- **Events**（14 条）：`node-click` / `node-expand` / `node-collapse` / `node-contextmenu` / `update:expandedKeys` / `update:currentKey` / `check` / `check-change` / `node-drag-start` / `node-drag-enter` / `node-drag-leave` / `node-drag-over` / `node-drag-end` / `node-drop`
- **Methods（通过 ref 调用）**（28 条）：`filter` / `updateKeyChildren` / `getNode` / `setCurrentNode` / `setCurrentKey` / `getCurrentKey` / `getCurrentNode` / `remove` / `append` / `insertBefore` / `insertAfter` / `expandAll` / `collapseAll` / `expandNode` / `collapseNode` / `scrollToNode` / `getNodeEl` / `getCheckedKeys` / `getCheckedNodes` / `setCheckedKeys` / `getHalfCheckedKeys` / `getHalfCheckedNodes` / `isChecked` / `moveNode` / `getVisibleNodes` / `getNodePath` / `getNodeKey` / `store / root`
- **Slots**（3 条）：`default` / `expand-btn` / `empty`
- **OkrTreeGroup 与键盘导航**（4 条）：`align` / `default` / `refresh()` / `键盘导航`

<!-- API-DOC-END -->

## 需要注意的行为

- `append` / `insertBefore` / `insertAfter` / `remove` / `updateKeyChildren` / `moveNode` 与懒加载 `resolve` 会**同步修改你传入的源数据**；冻结 / 只读数据下写入被跳过并给出开发期警告，视图仍完成增删。
- 不配 `node-key` 也能渲染与交互，但按 key / data 定位节点的能力全部失效（`getNode` 返回 `null`、`v-model:expanded-keys` 不生效），传 Node 实例的仍然可用。
- `node-key` / `direction` / `onlyBothTree` / `deep-watch` / `virtual` 是创建期快照，运行时改不会生效；其余 prop 运行时正常同步。
- `virtual`（1.16.0 新增）要求数字型 `label-width`（horizontal 布局还要求 `label-height`）；窗口化后 `scrollToNode` 与键盘漫游对窗口外目标先揭示再定位，详见 [虚拟滚动](https://vue3-okr-tree.baiwumm.com/guide/virtual)。

完整清单见 [需要注意的行为](https://vue3-okr-tree.baiwumm.com/guide/behavior)。

## Vue Devtools 面板

开发环境自动生效：打开 Vue Devtools 会多一个 **OkrTree** 面板，查看每棵存活实例的节点注册表、展开 / 选中 / 勾选状态（含 OKR 左树分节）。零依赖、零初始化；门控与开发期警告同一套（`process.env.NODE_ENV`），消费方的生产构建会把它整体消除，详见 [文档站](https://vue3-okr-tree.baiwumm.com/guide/devtools)。

## 开发

```bash
pnpm install
pnpm dev              # Demo 站（引用源码）
pnpm test             # Vitest 单测
pnpm typecheck        # vue-tsc
pnpm lint             # ESLint
pnpm build            # 库构建 → dist/
pnpm verify:package   # publint + attw 包发布体检
pnpm size             # size-limit 体积预算
pnpm test:visual      # Playwright 视觉回归 + 性能基线
pnpm docs:dev         # 在线文档站（VitePress，源码在 docs-site/）
pnpm gen:readme       # 从 shared/api.ts 重新生成上面的 API 概览
```

更多命令（`verify:dist` / `bench` / `test:coverage` / `docs:build:full`）见 `package.json`。后续优化计划见 [docs/roadmap.md](./docs/roadmap.md)，需求与决策见 [docs/requirements.md](./docs/requirements.md)。

发布：更新 `version` 与 `CHANGELOG.md` → 提交 → `git tag v1.x.x && git push origin v1.x.x`，`release.yml` 跑完门禁后 `npm publish --provenance` 并创建 GitHub Release。完整步骤见 [docs/release-guide.md](./docs/release-guide.md)。

## License

MIT
