# 性能基线（1.5.0 #6）

> 复现：`pnpm build && pnpm bench`（脚本 [scripts/benchmark.mjs](../scripts/benchmark.mjs)）。
> 环境说明：脚本运行在 Node + jsdom 中（无真实布局/样式计算），单节点 DOM 开销显著高于真实浏览器（约 3–5 倍），数值用于**横向对比与回归告警**；真实浏览器数值见下文 Playwright 一节。

## 数据规模

2000+ 节点：40 个部门 × 50 名员工（两层），总计 2041 个节点对象。

## 基线（jsdom，Node v24，2026-09-18）

| 场景                                              | 耗时（3 轮取最优） |
| ------------------------------------------------- | ------------------ |
| 首渲染（2041 节点，默认折叠）                     | ≈ 620 ms           |
| 首渲染（默认全部展开）                            | ≈ 1070 ms          |
| `expandAll()`（状态 + 渲染）                      | ≈ 4.7 ms           |
| `collapseAll()`                                   | ≈ 3.9 ms           |
| `filter('员工-1')` + 恢复全显（两次过滤）         | ≈ 300 ms           |
| 原地 push + pop 一个节点（deep watch → 增量更新） | ≈ 67 ms            |
| 深层 label 原地修改（脏检查跳过重建）             | ≈ 43 ms            |

## 结构性开销核对（roadmap 条目逐项）

### 1. `data` deep watch 成本 → 已提供 `deep-watch: false` 开关

deep watch 每次触发会对整棵响应式数据树做 O(N) 遍历（N ≈ 2041），在「深层 label 修改」这类非结构变更场景下仍需 ≈ 40 ms（jsdom）。1.5.0 起提供 **`deep-watch: false`** prop（创建期生效）：只响应 `data` 引用变化（回到原版 vue-okr-tree 行为），不侦听原地变更。超大数据量、且通过替换引用更新数据的场景建议开启。

### 2. `computeLabelClass` 等每节点 computed 开销

`computeLabelClass` / `computeLabelStyle` / `nodeClass` 均为组件级 `computed`，Vue 会缓存计算结果，仅在依赖（`labelClassName`、`isCurrent`、`disabled`、子节点数等）变化时重算；2000 节点全部展开时这些 computed 的稳态开销为 0（缓存命中），非瓶颈。首渲染的开销主要来自 **2041 个组件实例的创建与 jsdom DOM 操作**，而非 computed。

### 3. `updateChildren` 脏标记：只重建受影响路径

1.4.x 之前，`data` 原地变更触发的 `Node.updateChildren()` 会全树递归做 key diff（构建 Map、splice `childNodes`——即使内容完全不变也会触发重渲染）。1.5.0 引入**逐层脏检查**：

- 每层先比对「源 children 数组」与现有 `childNodes`：长度一致且逐项 data 引用相同 → 本层**跳过重建**，仅向下做廉价检查（O(1) 比对 + 递归）；
- 变更层命中脏检查后走原有「按 data 引用 → 按 key」的复用重建逻辑，受影响路径之外的状态（expanded / current）不受影响；
- 非结构的字段变更（如 label 文本）由模板响应式直接生效，无需重建。

效果：原地 push/pop 一层子节点的成本从「全树 Map 重建 + 全树 splice 重渲染」降为「O(N) 廉价比对 + 单层重建」（见上表：2041 节点下 push+pop 全程 ≈ 67 ms，其中大头是 deep watch 遍历与 jsdom DOM 差异）。

### 4. 真实浏览器数值（Playwright，Chromium）

> 复现：`pnpm test:visual`（Playwright 基准用例 [tests/visual/perf.spec.ts](../tests/visual/perf.spec.ts)，挂载 2000 节点树并用浏览器内 `performance.now()` 计时）。

| 场景（Chromium，开发机）                | 耗时         | 验收                          |
| --------------------------------------- | ------------ | ----------------------------- |
| 2000 节点首渲染（挂载 + 首帧 DOM 就绪） | ≈ 160–260 ms | ✅ < 300 ms（roadmap 验收线） |

结论：2000 节点首渲染在真实浏览器中满足「< 300 ms」验收；更大数据量（万级）建议组合使用 `lazy` 懒加载 + `deep-watch: false`。

## 建议

- 组织架构类超大树：顶层骨架随 `data` 给出，深层用 `lazy` / `load` 按需加载（1.4.0），只加载展开路径；
- 只通过替换 `data` 引用更新数据时，开启 `deep-watch: false` 关闭深度侦听；
- 保持 node-key 稳定，有助于增量重建时最大化节点复用。
