# AGENTS.md

## 生成物不要手改

README、文档站页面、API 表等**生成物或衍生产物一律不手改**：改它们的来源（`shared/api.ts`、`src/` 的 `defineExpose`）与生成器（`scripts/gen-readme-api.mjs`），然后运行生成命令。

- `README.md` 的 `<!-- API-DOC-BEGIN -->` … `<!-- API-DOC-END -->` 之间由 `pnpm gen:readme` 从 `shared/api.ts` 生成（只生成 API 分组概览，完整表格在文档站 API 页）；标记之外的正文是人写的，可以直接改。
- `pnpm gen:readme` 的输出已是 Prettier 规范形态，与 `pnpm format:check`（CI 有一步）往返稳定，不需要生成后再补一次格式化。
- `shared/api.ts` 同时驱动三处：文档站 `<ApiDoc>`、Playground API 页、README 概览；表与 `defineExpose` 的偏差不超过 `tests/api-surface.spec.ts`。
- 单元格里的行内代码用 `<code>`，不要用 Markdown 反引号——两个消费方都按 HTML（`v-html`）渲染。

## docs/ 目录与文档约定

`docs/` 的文件清单与定位见 [docs/README.md](./docs/README.md)（活文档：requirements / roadmap / release-guide / acceptance / perf；历史快照：development-plan / release-readiness）。约定：

- **文件名**一律 kebab-case 英文，按用途命名（不放版本号、不放日期）；新文档先在 `docs/README.md` 索引登记再落笔。
- **历史快照**在文首加「⚠️ 历史快照」横幅封存，正文不再随版本更新；最新门禁数字的**唯一权威是 `docs/acceptance.md`**，其余文档引用而非复制。
- **不写死易漂移的数字**（用例数、断言数、体积、run 号）：要刷新只刷新 `acceptance.md`，别处改措辞而不是抄数字。
- **改活文档用就地更正体例**：`~~旧表述~~ → 新表述 + 日期`，保留历史结论，不整段重写、不抹掉当时的判断。
- **发布相关**：日常发布是推 `v*` tag 的全自动流程（CI 经 OIDC Trusted Publishing 发包，无 token / GitHub Secrets），操作与排错只看 `docs/release-guide.md`，不要在别的文档里另写一份发布步骤。

以上规则以本节为单一来源，`docs/README.md` 只维护索引表。
