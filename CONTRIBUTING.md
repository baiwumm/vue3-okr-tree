# Contributing to vue3-okr-tree

感谢愿意动手。这个仓库由单人维护，短而聚焦的改动远比大包大揽更容易被审阅和合并。

## 开始之前

- 先读 [AGENTS.md](./AGENTS.md)。它是本仓的真源：目录结构、生成物与真源的分工、
  `docs/` 约定、提交与 trailer 规范、发布流程。
- 稍大一点的改动，先开一条 [Ideas 讨论](https://github.com/baiwumm/vue3-okr-tree/discussions/categories/ideas)
  把方案对齐，再动手写代码；接入与使用问题走 [Q&A](https://github.com/baiwumm/vue3-okr-tree/discussions/categories/q-a)
  —— 两个分类都配了表单模板。
- Bug 走 issue 表单（`.github/ISSUE_TEMPLATE`，空白 issue 已关闭）。表单会收集真正需要的
  信息：版本、Vue 版本、触发场景、最小复现。
- 视觉与观感类问题（连线位置、根对齐、展开收起抖动、主题配色）同样欢迎开 issue，
  它们是 `docs/roadmap.md` 的输入，只是**不算**安全漏洞。

## 本地开发

环境：Node ≥ 22.22.2（见 `.node-version`）与 pnpm（版本由 `packageManager` 字段钉住）。

```bash
pnpm install
pnpm format:check   # prettier
pnpm lint           # eslint
pnpm typecheck      # vue-tsc --noEmit
pnpm test           # vitest
pnpm build          # vite build + post-build
```

上面五条与 CI 的 verify 作业一致，推送前必须在本地过。按改动面追加：

- **产物面**（`exports` / `dist` 结构 / 类型声明）：`pnpm build` 后跑 `pnpm verify:dist`、
  `pnpm verify:peer-types`、`pnpm verify:package`、`pnpm size`。
- **文档站**：`pnpm docs:build:full`（与线上 EdgeOne 部署同一条命令），再跑
  `pnpm verify:seo` 与 `pnpm verify:edgeone`。
- **视觉变更**：`pnpm test:visual`（Playwright 视觉回归，基线在 `.screenshots/`）。

## Pull request

- 一个 PR 一件事，diff 尽量聚焦。
- 提交信息走 conventional commits + scope，中文主题（`fix(model): …`、`docs(api): …`）。
- 若有 AI 参与提交，按 [AGENTS.md](./AGENTS.md) 的规定追加 trailer 块（由
  `ai-commit-trailer` skill 校验，`check` 退出码为 0 才算通过）。没有 trailer 的提交
  不会给工具记上贡献。
- 决策记录（为什么做 / 为什么不做 / 为什么撤回）写进活文档
  （`docs/requirements.md` §6 的兼容性决策、`docs/roadmap.md` 的「已决定不做」），
  不要只留在提交信息里。

## 依赖

发布包的运行时 `dependencies` 保持为空：`vue` 与可选的 `html-to-image` 走
`peerDependencies`。新增依赖只能进 dev 侧，并在 PR 里说明理由。

## 社区

参与本项目即表示你同意 [行为准则](./CODE_OF_CONDUCT.md)。违规举报请发 me@baiwumm.com。

## 安全

不要为漏洞开公开 issue 或 PR。走[私密漏洞报告](https://github.com/baiwumm/vue3-okr-tree/security/advisories/new)，
详见 [SECURITY.md](./SECURITY.md)。
