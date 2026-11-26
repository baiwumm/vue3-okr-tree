# AGENTS.md

## 生成物不要手改

README、文档站页面、API 表等**生成物或衍生产物一律不手改**：改它们的来源（`shared/api.ts`、`src/` 的 `defineExpose`）与生成器（`scripts/gen-readme-api.mjs`），然后运行生成命令。

- `README.md` 的 `<!-- API-DOC-BEGIN -->` … `<!-- API-DOC-END -->` 之间由 `pnpm gen:readme` 从 `shared/api.ts` 生成（只生成 API 分组概览，完整表格在文档站 API 页）；标记之外的正文是人写的，可以直接改。
- `pnpm gen:readme` 的输出已是 Prettier 规范形态，与 `pnpm format:check`（CI 有一步）往返稳定，不需要生成后再补一次格式化。
- `shared/api.ts` 同时驱动三处：文档站 `<ApiDoc>`、Playground API 页、README 概览；表与 `defineExpose` 的偏差不超过 `tests/api-surface.spec.ts`。
- 改公开类型（`src/lib/index.ts` 导出、组件 props / 插槽 / `defineExpose`）时同步 `tests-consumer/consumer.ts`——它在 `pnpm verify:peer-types` 里编译 `dist/index.d.ts`，是产物类型面的唯一消费端断言。该检查跑在 `peer-matrix` 的「3.5.2 下限」腿（先 build），声明的 peer 下限因此就是类型能编译的下限；dev 腿只跑单测。理由见 `docs/acceptance.md` 第 5 节。
- 单元格里的行内代码用 `<code>`，不要用 Markdown 反引号——两个消费方都按 HTML（`v-html`）渲染。

## docs/ 目录与文档约定

`docs/` 的文件清单与定位见 [docs/README.md](./docs/README.md)（活文档：requirements / roadmap / release-guide / acceptance / perf / security-deps；历史快照：development-plan / release-readiness）。约定：

- **文件名**一律 kebab-case 英文，按用途命名（不放版本号、不放日期）；新文档先在 `docs/README.md` 索引登记再落笔。
- **历史快照**在文首加「⚠️ 历史快照」横幅封存，正文不再随版本更新；最新门禁数字的**唯一权威是 `docs/acceptance.md`**，其余文档引用而非复制。
- **不写死易漂移的数字**（用例数、断言数、体积、run 号）：要刷新只刷新 `acceptance.md`，别处改措辞而不是抄数字。
- **活文档只写现状**：过期表述直接改写成现在的样子，不留「~~旧表述~~ → 新表述 + 日期」这类历史叙述。文档是给人查现状的，不是变更日志——变更过程在 `CHANGELOG.md` 与 git 历史里，需要保留当时判断的另立历史快照文档（文首加「⚠️ 历史快照」横幅封存）。
- **发布相关**：日常发布是推 `v*` tag 的全自动流程（CI 经 OIDC Trusted Publishing 发包，无 token / GitHub Secrets），操作与排错只看 `docs/release-guide.md`，不要在别的文档里另写一份发布步骤。

以上规则以本节为单一来源，`docs/README.md` 只维护索引表。

## 代码与提交风格

- 注释密度高是刻意的：写「为什么」和约束（尤其反直觉的结论），不写「这行做了什么」。
- commit message 走 conventional commits + scope，中文主题：`fix(model): …`、`docs(api): …`、`chore(release): …`。破坏性变更用 `!` + 正文 `BREAKING CHANGE:` 段。
- **AI 参与的提交必须带 trailer**：正文后空一行追加连续的 trailer 块，`Co-authored-by: <产品名> <registry 邮箱>`（GitHub 只解析这一行，它决定多人作者与 Contributors 归属），模型名只进 `Assisted-by: <产品名>:<模型名>`。身份按**实际运行本次会话的产品**匹配 `ai-commit-trailer` skill 的 `references/agents.json`，不得照抄其它产品、不得把模型名塞进 `Co-authored-by` 的姓名位。纯人工改动不加 trailer。格式、身份表与校验流程以该 skill 为唯一规范，本文件不重复其定义。
- 提交前用该 skill 的 `node "$SKILL_DIR/scripts/normalize.mjs" check --message .git/COMMIT_TRAILER_MSG` 自检，**exit 0 才算通过**（`fix --write` 可自动归位 trailer）；`check --range` 报出的历史提交只报告、不重写——改写已推送历史是另一次显式决定。

示例：

```text
fix(model): 修掉万级节点折叠时的重复遍历

改用 WeakMap 缓存子树索引，折叠路径从 O(n²) 回到 O(n)。

Co-authored-by: pi <noreply@pi.dev>
Assisted-by: pi:glm-4.6
```
