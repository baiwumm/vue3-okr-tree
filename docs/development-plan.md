# vue3-okr-tree 开发计划清单

> 依据 `docs/requirements.md`。按阶段推进，每阶段有明确产出与验收点。⭐ = 关键路径。
>
> **2026-09-16 评审更新**：需求文档新增第 6 节「原版行为怪癖与兼容性决策」（Q1–Q7）。相关任务已回填到对应阶段（1.2/1.4/1.5、2.6、5.2、6.8、7.1）；阶段 1.4 响应式方案已锁定，阶段 5.2/6.8 顺序已调整。

## 阶段 0：项目脚手架

- [x] 0.1 初始化仓库：`package.json`（name=`vue3-okr-tree`，MIT，exports/dual-format 字段，`peerDependencies: { "vue": ">=3.0.0" }`，开发依赖用 Vue 3.5+）、`.gitignore`、`.npmignore`、README 骨架
- [x] 0.2 搭建 Vite 工程：库模式构建配置（ESM + UMD，外部化 vue）+ Demo 站入口（`playground/` 或 `examples/`）
- [x] 0.3 引入 TypeScript + vue-tsc；配置 ESLint + Prettier；安装 Vitest + Vue Test Utils（阶段 1/2 测试用）
- [x] 0.4 目录结构约定：
  ```
  src/
    lib/            # 组件库源码
      okr-tree/
        OkrTree.vue
        OkrTreeNode.vue
        model/ (tree-store.ts / node.ts / util.ts / transition.css)
      index.ts      # 导出 VueOkrTree + 类型
    types/          # 对外类型定义
  playground/       # Demo 站（独立 Vite 入口）
  docs/             # 需求与计划文档
  ```

## 阶段 1：数据模型层（无 UI，纯 TS）

- [x] ⭐ 1.1 移植 `Node` 类 → `node.ts`：expanded/leftExpanded/isCurrent/visible/level/childNodes/isLeaf、setData、insertChild/insertBefore/insertAfter、removeChild、expand/collapse、updateLeafState；**新增 `updateChildren` 的真实实现**（原版缺失，data 引用未变分支会 TypeError，见 requirements Q4：按新 children 重建并复用子节点 expanded/leftExpanded/isCurrent 状态）
- [x] ⭐ 1.2 移植 `TreeStore` → `tree-store.ts`：nodesMap 注册/注销、setData/setLeftData、filter（**按 Q1 修复为全树过滤**：遍历全部根节点、所有节点执行 filterNodeMethod、父节点有可见后代时保持可见）、currentNode 管理、append/remove/insertBefore/insertAfter/updateChildren、getNode；**OKR 模式左右分表**（右树 nodesMap / 左树 leftNodesMap，见 Q2），default-expanded-keys 与 current-node-key 按 key 同时作用于左右两树
- [x] 1.3 移植 `util.ts`：`$treeNodeId` 标记（保留 defineProperty 方案）、getNodeKey；**不移植** `findNearestComponent`（死代码，见 requirements 2.1）
- [x] ⭐ 1.4 响应式改造（方案已锁定，见 requirements 5.3.2）：Node 状态字段（expanded/leftExpanded/isCurrent/visible/childNodes 容器）接入 `shallowReactive`/`shallowRef`；**data 及源数据对象保持原始引用（必要时 markRaw），严禁 deep reactive 包裹 Node 实例**（否则 node.data 被代理，破坏 setData 引用比较与 removeChild 的 indexOf 逻辑）。需覆盖：data/leftData 异步变更、data 引用回切与原地变更（deep watch → updateChildren，Q4）、左右子树独立更新（原 1.0.13/1.0.15 bug 场景）
- [x] 1.5 用 Vitest 为模型层写单测，除常规构建/展开/过滤/增删改/选中态/key 查找外，**必须覆盖**：
  - 多根 data 过滤（Q1）
  - 左右树同 key 不互相覆盖、default-expanded-keys 两树同时生效（Q2）
  - data 原地变更与引用回切不报错、状态尽量保留（Q4）
  - append/insertBefore/insertAfter/remove 同步修改源数据 children（Q3 复刻验证）
  - 节点倒序显示、异步修改 data（原仓库已知 bug 场景）

## 阶段 2：组件层

- [x] ⭐ 2.1 `OkrTree.vue`：全部 props（requirements 3.1，含 animate-duration 接线/Q5）、provide store、watch data（deep）/leftData/defaultExpandedKeys、defineExpose 全部 methods（requirements 3.4，含各抛错语义）、4 个事件（3.3）
- [x] ⭐ 2.2 `OkrTreeNode.vue`：递归渲染、左右子树容器（onlyBothTree）、展开/折叠按钮（含 show-node-num 计数、node-btn-content）、节点点击/右键、is-current/labelClassName 样式计算
- [x] 2.3 renderContent/nodeBtnContent 兼容层：`h` 从 vue 导入后显式传入（Vue 3 render 不再注入 h）、保持 `(h, node)` 签名（node 为 Node 实例）；开放默认作用域插槽 `#default="{ node }"`（requirements 5.3.5）
- [x] 2.4 过渡动画：6 组 okr-* transition（transition.css 全量迁移，含 okr-zoom-in-left/Q6）+ animate/animate-name/animate-duration props
- [x] 2.5 交互细节对齐：one-branch、collapsed 指示线、only-child 圆角、contextmenu 仅在外部监听时阻断默认行为、show-collapsable=false 时强制全展开
- [x] 2.6 Vue Test Utils 组件冒烟测试：垂直/水平/OKR 三模式渲染、展开/折叠与事件、filter()、render-content、node-click 选中态

## 阶段 3：样式

- [x] ⭐ 3.1 移植垂直模式全部连接线/节点/按钮样式（OkrTree.vue 内 ~450 行 CSS）
- [x] ⭐ 3.2 移植水平模式样式（含左子树 is-left-child-node 全套）
- [x] 3.3 移除全局样式污染（去掉 `* {}` reset），样式收敛到组件前缀
- [x] 3.4 label-width/label-height 动态尺寸逻辑验证

## 阶段 4：根对齐增强

- [x] ⭐ 4.1 内建 onlyBothTree 根对齐：新增 `align-root` prop（默认 true），左右子树容器宽度按最大侧对齐（ResizeObserver 或纯 CSS grid 方案），取代原 Demo 手动 DOM 测量
- [x] 4.2 伸缩时根节点位置固定验证（对应原 2023/02/16、2023/02/20 两次修复）

## 阶段 5：库构建与集成验证

- [x] ⭐ 5.1 Vite 库构建跑通：es.js / umd.js / style.css / .d.ts 产物完整；`.d.ts` 用 vite-plugin-dts 生成（如遇问题再评估 vue-tsc 方案）；UMD 全局名定为 `VueOkrTree`
- [x] 5.2 最小 playground 先行验证 dist 产物路径：`import { VueOkrTree } from 'vue3-okr-tree'` + `import 'vue3-okr-tree/dist/style.css'` 可用（完整 Demo 站的 dist 双路径验证移至 6.8，待 Demo 页完成后执行）
- [x] 5.3 package.json exports/main/module/types 字段核对，模拟 `npm pack` 安装验证

## 阶段 6：Demo 演示页（与 requirements 4 逐项对齐）

- [x] ⭐ 6.1 Demo 基建：BaseCard 组件（示例区 + 描述 + 代码高亮）、页面排版、回顶按钮
- [x] 6.2 基础用例组：基础用法 / 水平方向 / 节点展开 / 全部展开 / key 展开
- [x] 6.3 样式与内容用例组：节点样式 / 自定义节点内容 / 按钮自定义 / 动画
- [x] ⭐ 6.4 OKR 用例组：OKR 模式（含两树根对齐对比）/ OKR 自定义内容 ×2
- [x] 6.5 功能用例组：Filter（含空值恢复语义演示）/ OKR Filter / Events / OKR Events
- [x] 6.6 API 文档表格：Attributes / Props / Events / Methods 四张表，内容以 requirements 3.1–3.4 为准（含边界说明，补全原表格遗漏）
- [x] 6.7 每个用例附源码高亮展示
- [x] 6.8 Demo 站切换为引 dist 产物跑通（原 5.2 的完整验证，收口库构建正确性）

## 阶段 7：对齐验收与收尾

- [x] ⭐ 7.1 与原仓库逐项对照测试：所有 props/events/methods 行为、抛错语义、已知 bug 场景（异步 data、左/右子树独立更新、节点倒序）；**并逐项核对 requirements 第 6 节决策清单**——Q1/Q2/Q4/Q5 修复生效、Q3 复刻一致、Q7 死代码不移植不算缺失
- [x] 7.2 视觉走查：与原 Demo 截图对照（垂直/水平/OKR 三模式）
- [x] 7.3 补全 README（安装、快速开始、API 表、与 vue-okr-tree 的迁移说明）；**明确写入 Q3（增删方法会修改用户源数据）、node-key 相关方法的抛错/静默边界、插槽用法**
- [x] 7.4 发布前检查：`npm publish --dry-run`、License、repository 字段

## 里程碑

| 里程碑 | 内容     | 验收                                               |
| ------ | -------- | -------------------------------------------------- |
| M1     | 阶段 0–1 | 模型层单测全绿（含 Q1–Q4 专项用例）                |
| M2     | 阶段 2–3 | 三种模式可渲染、交互正确，组件冒烟测试通过         |
| M3     | 阶段 4–5 | dist 产物可用、根对齐生效                          |
| M4     | 阶段 6–7 | Demo 全用例对齐、达到 requirements 第 7 节验收标准 |

## 验收核对记录（2026-09-17 自动执行）

对照 `requirements.md` 第 7 节验收标准逐条核对：

| #   | 验收项                                                                         | 结果 | 证据                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------ | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 3.1–3.4 全部 API 行为与原组件一致，抛错文案语义一致；有意差异仅限第 6 节 Q1–Q9 | ✅   | `tests/components/okr-tree.spec.ts`（26 个用例，含 4 条抛错文案断言）、`tests/model/*.spec.ts`（43 个）                                                                                                                    |
| 2   | Demo 页 20 个用例可交互、与原 Demo 对齐；Filter 体现空值恢复                   | ✅   | 浏览器逐用例截图核对：三模式渲染、+/- 展开收起、节点数、选中样式、render-content / node-btn-content / 插槽、动画过渡、OKR 根对齐（开/关、收起不位移）、filter 与空值恢复、11 个方法按钮、4 类事件日志；无控制台 error/warn |
| 3   | 构建产物 es / umd / cjs / style.css / index.d.ts，import + require + CDN 可用  | ✅   | `pnpm build` + `scripts/verify-dist.mjs`（16 项断言）+ `node -e require(...)` + ESM 自引用 import；`npm pack --dry-run` 11 个文件 92.4 kB；`npm publish --dry-run` 通过                                                    |
| 4   | 原仓库已知 bug（异步改 data、左右子树独立更新、倒序显示）正常                  | ✅   | `node.spec.ts`「保持源数据顺序」「data 引用变化 / 原地变更」、`tree-store.spec.ts`「右树 data 更新后左子树不丢失」、组件测试「响应式 data 原地 push」「leftData 更新」                                                     |
| 5   | Q1–Q5、Q8 修复项有用例覆盖，Q3 复刻项有单测                                    | ✅   | Q1 多根过滤 / Q2 左右分表 / Q4 updateChildren / Q3 源数据副作用：`tree-store.spec.ts`、`node.spec.ts`；Q5/Q8：`transition-robustness.spec.ts`、Demo 用例 9；Q9：verify-dist                                                |

补充记录：

- 开发过程中新增决策 Q8（原版 animate 在展开/收起时无过渡 → 补 CSS 状态过渡）与 Q9（`"type":"module"` 下增补 `.cjs`），已写入 requirements 第 6 节。
- 浏览器核对时发现自动化浏览器窗格内 `requestAnimationFrame` 不触发，导致 Vue `<transition>` 卸载被挂起；据此把 animate 关闭时的 `<transition>` 改为 `css:false`（同步完成，不依赖 rAF），并加回归测试 `transition-robustness.spec.ts`。
- 6.8：`PLAYGROUND_USE_DIST=1 pnpm build:playground` 构建 + `vite preview` 浏览器核对，发布产物路径下 Demo 与源码路径渲染一致（20 节 / 17 棵树 / 203 个节点 / 4 张表）。
- 测试统计：Vitest 4 个文件 71 个用例全部通过；vue-tsc、ESLint、Prettier 无错误。
