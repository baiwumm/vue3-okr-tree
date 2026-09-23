# AGENTS.md

## 生成物不要手改

README、文档站页面、API 表等**生成物或衍生产物一律不手改**：改它们的来源（`shared/api.ts`、`src/` 的 `defineExpose`）与生成器（`scripts/gen-readme-api.mjs`），然后运行生成命令。

- `README.md` 的 `<!-- API-DOC-BEGIN -->` … `<!-- API-DOC-END -->` 之间由 `pnpm gen:readme` 从 `shared/api.ts` 生成（只生成 API 分组概览，完整表格在文档站 API 页）；标记之外的正文是人写的，可以直接改。
- `pnpm gen:readme` 的输出已是 Prettier 规范形态，与 `pnpm format:check`（CI 有一步）往返稳定，不需要生成后再补一次格式化。
- `shared/api.ts` 同时驱动三处：文档站 `<ApiDoc>`、Playground API 页、README 概览；表与 `defineExpose` 的偏差不超过 `tests/api-surface.spec.ts`。
- 单元格里的行内代码用 `<code>`，不要用 Markdown 反引号——两个消费方都按 HTML（`v-html`）渲染。
