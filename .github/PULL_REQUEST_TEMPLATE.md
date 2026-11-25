## 变更说明

<!-- 一句话说明「为什么改」，以及改前改后的行为差异 -->

Closes #

## 涉及范围

- [ ] 核心组件（`src/lib/`）
- [ ] 画布组件（`OkrTreeViewport`）/ 多树对齐（`OkrTreeGroup`）
- [ ] 对外类型与 API 面（`shared/api.ts` / `src/lib/index.ts`）
- [ ] 文档站（`docs-site/`）
- [ ] Playground（`playground/`）
- [ ] 脚本与实验台（`scripts/` / `tests/` / `tests-consumer/`）
- [ ] 仅仓库级（`docs/` / `.github/` / 根配置）

## 一致性与真源检查

- [ ] 若改公开 API（props / events / methods / 插槽）：`shared/api.ts` 与 `src/` 的 `defineExpose` 已同步，`pnpm gen:readme` 已重跑（README 的 API 段是生成物，勿手改）
- [ ] 若改公开类型：`tests-consumer/consumer.ts` 已同步，`pnpm verify:peer-types` 通过（它编译 `dist/index.d.ts`，是产物类型面的唯一消费端断言）
- [ ] 若改行为：文档站对应页面与 `docs/requirements.md` §6 的兼容性决策已更新
- [ ] 若改发布产物面（`exports` / dist 结构 / peer 下限）：`pnpm build` 后跑过 `pnpm verify:dist`、`pnpm verify:package`、`pnpm size`
- [ ] 若改文档站：`pnpm docs:build:full` + `pnpm verify:seo` + `pnpm verify:edgeone` 已跑过
- [ ] 若新增依赖：只进 dev 侧，发布包 `dependencies` 保持为空
- [ ] 若 AI 参与提交：trailer 按 `AGENTS.md`，`ai-commit-trailer` 的 `check` exit 0
- [ ] 决策记录（为什么做 / 为什么不做 / 为什么撤回）已进活文档（`docs/requirements.md` §6 或 `docs/roadmap.md`）

## 验证结果

<!-- 填实际跑过的命令与结果；未跑的项写明原因 -->

- 门禁（format:check / lint / typecheck / test / build）：
- 按改动面的追加项（verify:dist / verify:peer-types / verify:package / size / verify:seo / test:visual）：

## 截图 / 录屏

<!-- 视觉与观感变更建议附录屏；无视觉变化可删除本节 -->
