# docs-site（Docus 文档站）

vue3-okr-tree 在线文档：指南 / 主题 / API / 迁移 / 更新日志，Demo 用例直接复用 `playground/components/demos` 组件（单一来源，与 Playground 完全一致）。

基于 [Docus v5](https://docus.dev)（Nuxt layer：`extends: ['docus']`，官方 `@nuxt/content` v3 + `@nuxt/ui` v4 + Tailwind 4）。

## 本地开发

```bash
pnpm install
pnpm docs:dev            # 文档站开发服务（库本体走 src 源码别名，无需先构建）
pnpm docs:build          # 仅构建文档站（nuxt generate → .output/public）
pnpm docs:preview        # 预览文档站构建产物
pnpm docs:build:full     # 完整构建：库 dist + Playground + 文档站 + 合并 /playground/ 子路径
pnpm docs:preview:full   # 构建完整产物并本地预览（/playground/ 仅存在于完整产物中）
```

## 部署到 Cloudflare Pages / Workers

推荐 **Cloudflare Pages 的 Git 集成**（仓库推送自动构建部署）：

| 配置项       | 值                                                                                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 构建命令     | `corepack enable && pnpm install --frozen-lockfile && pnpm docs:build:full`                                                                                      |
| 构建输出目录 | `docs-site/.output/public`                                                                                                                                       |
| 环境变量     | `NODE_VERSION=22`、`PLAYGROUND_USE_DIST=1`（脚本内部已设置，配置在此仅为显式声明）、`enablePrePostScripts=true`（如 CI 未启用 corepack 则先 `npm i -g pnpm@11`） |

> **Workers Builds（仓库连接）方式**：仓库根目录的 `wrangler.jsonc` 已配置静态资产（`docs-site/.output/public`，含 404 处理）。界面填写：构建命令 `npm i -g pnpm@11 && pnpm install --frozen-lockfile && pnpm docs:build:full`，部署命令 `npx wrangler deploy`；Node 版本由根目录 `.node-version`（22）钉住，如构建镜像未生效则在「变量和机密」里加 `NODE_VERSION=22`。

注意：

- **AI Assistant**：由 docus 内置模块驱动，需要 **Vercel AI Gateway** 的 key——本地开发在 `.env.local` 写 `AI_GATEWAY_API_KEY=<key>`，Cloudflare 在「变量和机密」里同名配置（默认模型 `google/gemini-3-flash`，可在 `nuxt.config.ts` 的 `docus.assistant.model` 调整）。**没有 key 时模块自动整体禁用**，不渲染任何入口、不影响构建。
- 构建依赖 **better-sqlite3**（`@nuxt/content` 的构建期原生模块），已在 `pnpm-workspace.yaml` 的 `allowBuilds` 放行；Windows 本地开发首次安装会编译/下载预编译产物。
- 站内链接全部使用根绝对路径（Docus 原生 clean URL），当前根路径部署；子路径部署（base 注入）VitePress 时代支持一键切换，Docus 下需要另行评估，未配置。
- Playground 构建产物会被合并到输出的 `playground/` 子目录，导航中的「Playground」指向它（以 dist 产物构建，同时验证发布包路径）。

## 结构

- `nuxt.config.ts`：`extends: ['docus']` + 站点信息、head 图标/OG、`vue3-okr-tree` → `src` 源码别名
- `app/app.config.ts`：Docus 站点配置（zh-CN、header/Logo、GitHub、二级导航、主题色、内置组件 slot 覆写）
- `app/components/UColorModeButton.vue`：覆盖 @nuxt/ui 的同名组件（docus 的 header 与 footer 各一处），把主题切换接到 [theme-switch-animation](https://www.npmjs.com/package/theme-switch-animation) 的 View Transition，受控模式下主题状态仍归 `@nuxtjs/color-mode`
- `app/components/content/`：MDC 组件——`DocsDemo`（Demo 容器）、`Demo*`（playground 用例包装）、`ApiSection`（渲染 `shared/api.ts` 的 API 单一来源数据）、`ChangelogVersions`（CHANGELOG 摘要）
- `app/app.css`：Docus 的样式钩子（`nuxt.config.ts` 里不再写 `css: []`）——playground 排版样式与 prism 主题以 `layer(base)` 引入、Maple Mono CN 的 `@theme` 覆写、Demo 容器样式
- `content/`：页面（Markdown + MDC），`1.guide/ 2.theme/ 3.api/` 前缀数字控制导航分组与排序
- `public/`：图标、Logo、OG 图、自托管字体
