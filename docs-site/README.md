# docs-site（Docus 文档站）

vue3-okr-tree 在线文档：指南 / 主题 / API / 迁移 / 更新日志，Demo 用例直接复用 `playground/components/demos` 组件（单一来源，与 Playground 完全一致）。

基于 [Docus v5](https://docus.dev)（Nuxt layer：`extends: ['docus']`，官方 `@nuxt/content` v3 + `@nuxt/ui` v4 + Tailwind 4）。

## 本地开发

```bash
pnpm install
pnpm docs:dev            # 文档站开发服务（库本体走 src 源码别名，无需先构建）
pnpm docs:build          # 仅构建文档站（nuxt generate → .output/public）
pnpm docs:preview        # 预览文档站构建产物
pnpm docs:build:full     # 完整构建：库 dist + Playground + 文档站 + 合并 /playground/ 子路径（产物即 .output/public）
pnpm docs:preview:full   # 构建完整产物并本地预览（/playground/ 仅存在于完整产物中）
```

## 部署到腾讯云 EdgeOne

文档站是 `nuxt generate` 产出的纯静态站点，由腾讯云 EdgeOne（Makers）托管。下表是仓库侧需要提供的值；EdgeOne 控制台的入口、字段名与默认预览域名以实际界面为准，不在此写死。

| 项           | 值                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| 项目类型     | Vue 3 组件库文档站（Docus / Nuxt 静态站，含 `/playground/` 子路径）                                  |
| 框架预设     | `Other`（静态）。注意控制台预设不是最终裁决，见下方「根 package.json 不要出现 nuxt / next」          |
| 根目录       | `/`                                                                                                  |
| 生产分支     | `main`                                                                                               |
| 域名         | `vue3-okr-tree.baiwumm.com`（继续使用，DNS 解析迁至腾讯云 EdgeOne）                                  |
| 安装命令     | `pnpm install --frozen-lockfile`                                                                     |
| 构建命令     | `pnpm docs:build:full`                                                                               |
| 构建产物目录 | `docs-site/.output/public`（`nuxt generate` 原生产物，Playground 已合并进它的 `playground/` 子目录） |
| Node 版本    | 22（仓库根 `.node-version`）                                                                         |
| 环境变量     | 启用 AI Assistant 时需要 `AI_GATEWAY_API_KEY`；`PLAYGROUND_USE_DIST=1` 由脚本内部设置，无需重复配置  |

接入步骤（控制台字段名按实际界面填写）：

1. 在腾讯云 EdgeOne（Makers）控制台新建项目，接入本仓库（Git 集成，生产分支 `main`）或按控制台支持的方式上传静态产物。
2. 安装/构建命令与产物目录按上表填写；框架预设选 `Other`（静态）。若构建镜像不读取 `.node-version`，按控制台实际支持的方式声明 Node 22（例如环境变量 `NODE_VERSION=22`）。
   - ~~`docs-site/.output/public` 与 `docs-site/dist` 实测均采集不到产物，是因为它们是隐藏目录 / 路径不对，所以要把产物复制到仓库根的非隐藏目录 `out/`~~ → 2026-11-02 更正：真因是构建机会**按根 `package.json` 的依赖重新识别框架**（控制台预设不参与这一步），识别成 `nuxt` / `next` 时它跳过「把输出目录搬进上传暂存区」那步、改等框架自己的原生暂存来填，而自定义构建命令不会触发那个暂存——于是输出目录填什么都没生效，构建还显示成功、产物列表为空。改法见注意事项第一条，改完 `out/` 这层中转就删掉了。
3. 绑定自定义域名 `vue3-okr-tree.baiwumm.com`（域名保持不变），在腾讯云 DNSPod 或当前 DNS 服务商处把解析指向 EdgeOne 控制台给出的加速域名；DNS、HTTPS 证书与缓存/回源策略按控制台实际配置。
4. 产物根目录含 `404.html`：若控制台支持自定义 404 / 错误页，指向该文件。站点是预生成的纯静态页面，不需要 SPA history 回退。
5. 启用 AI Assistant 时，在控制台的环境变量配置里按实际方式写入 `AI_GATEWAY_API_KEY`。

> **加速区域**：选择「全球可用区（含中国大陆）」要求域名已完成 ICP 备案；未备案时请选择不含中国大陆的可用区。

注意：

- **根 `package.json` 里不要出现 `nuxt` / `next` 依赖**：EdgeOne 构建机按根 `package.json` 的 `(dev)Dependencies` 识别框架，命中 `nuxt` / `next` 就跳过输出目录搬运，结果是产物列表为空、构建却显示成功（2026-11-02 踩过，排查代价很高）。文档站工具链的依赖一律加在 `docs-site/package.json`（workspace 成员 `vue3-okr-tree-docs`）里，`prismjs` / `better-sqlite3` / `vue` 这些与库、Playground 共用的仍留在根上，由 Node 向上解析命中。
- **AI Assistant**：由 docus 内置模块驱动，需要 **Vercel AI Gateway** 的 key——本地开发在 `.env.local` 写 `AI_GATEWAY_API_KEY=<key>`，部署平台在控制台的环境变量配置里同名配置（默认模型 `google/gemini-3-flash`，可在 `nuxt.config.ts` 的 `docus.assistant.model` 调整）。**没有 key 时模块自动整体禁用**，不渲染任何入口、不影响构建。
- 构建依赖 **better-sqlite3**（`@nuxt/content` 的构建期原生模块），已在 `pnpm-workspace.yaml` 的 `allowBuilds` 放行；Windows 本地开发首次安装会编译/下载预编译产物。
- 站内链接全部使用根绝对路径（Docus 原生 clean URL），当前根路径部署；子路径部署（base 注入）VitePress 时代支持一键切换，Docus 下需要另行评估，未配置。
- Playground 构建产物会被合并到输出的 `playground/` 子目录，导航中的「Playground」指向它（以 dist 产物构建，同时验证发布包路径）。
- 仓库内不维护平台专属的路由 / 响应头配置；静态托管所需的目录索引与 404 行为在 EdgeOne 控制台侧按实际能力配置。

## 结构

- `package.json`：pnpm workspace 成员 `vue3-okr-tree-docs`（private），`nuxt` / `docus` 只声明在这里——原因见上方注意事项
- `nuxt.config.ts`：`extends: ['docus']` + 站点信息、head 图标/OG、`vue3-okr-tree` → `src` 源码别名
- `app/app.config.ts`：Docus 站点配置（zh-CN、header/Logo、GitHub、二级导航、主题色、内置组件 slot 覆写）
- `app/components/UColorModeButton.vue`：覆盖 @nuxt/ui 的同名组件（docus 的 header 与 footer 各一处），把主题切换接到 [theme-switch-animation](https://www.npmjs.com/package/theme-switch-animation) 的 View Transition，受控模式下主题状态仍归 `@nuxtjs/color-mode`
- `app/components/content/`：MDC 组件——`DocsDemo`（Demo 容器）、`Demo*`（playground 用例包装）、`ApiSection`（渲染 `shared/api.ts` 的 API 单一来源数据）、`ChangelogVersions`（CHANGELOG 摘要）
- `app/app.css`：Docus 的样式钩子（`nuxt.config.ts` 里不再写 `css: []`）——playground 排版样式与 prism 主题以 `layer(base)` 引入、Maple Mono CN 的 `@theme` 覆写、Demo 容器样式
- `content/`：页面（Markdown + MDC），`1.guide/ 2.theme/ 3.api/` 前缀数字控制导航分组与排序
- `public/`：图标、Logo、OG 图、自托管字体
