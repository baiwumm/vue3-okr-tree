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

| 项           | 值                                                                                                                                                                                                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 项目类型     | Vue 3 组件库文档站（Docus / Nuxt 静态站，含 `/playground/` 子路径）                                                                                                                                                                                                          |
| 框架预设     | `Other`（静态）。注意控制台预设不是最终裁决，见下方「根 package.json 不要出现 nuxt / next」                                                                                                                                                                                  |
| 根目录       | `/`                                                                                                                                                                                                                                                                          |
| 生产分支     | `main`                                                                                                                                                                                                                                                                       |
| 域名         | `vue3-okr-tree.baiwumm.com`（继续使用，DNS 解析迁至腾讯云 EdgeOne）                                                                                                                                                                                                          |
| 安装命令     | `pnpm install --frozen-lockfile`                                                                                                                                                                                                                                             |
| 构建命令     | `pnpm docs:build:full`                                                                                                                                                                                                                                                       |
| 构建产物目录 | `docs-site/.output/public`（`nuxt generate` 原生产物，Playground 已合并进它的 `playground/` 子目录）                                                                                                                                                                         |
| Node 版本    | 22.22.2（仓库根 `.node-version`）                                                                                                                                                                                                                                            |
| 环境变量     | 启用 AI Assistant 时需要 `AI_GATEWAY_API_KEY`；`PLAYGROUND_USE_DIST=1` 由脚本内部设置，无需重复配置。`NUXT_SITE_URL` 自 docus 5.15 起**不再必需**（sitemap 改走 `@nuxtjs/sitemap`，读 `nuxt.config.ts` 的 `site.url`）；控制台里已经配了也不冲突，值与 `site.url` 一致即可。 |

接入步骤（控制台字段名按实际界面填写）：

1. 在腾讯云 EdgeOne（Makers）控制台新建项目，接入本仓库（Git 集成，生产分支 `main`）或按控制台支持的方式上传静态产物。
2. 安装/构建命令与产物目录按上表填写；框架预设选 `Other`（静态）。若构建镜像不读取 `.node-version`，按控制台实际支持的方式声明 Node 22（例如环境变量 `NODE_VERSION=22`）。
   - ~~`docs-site/.output/public` 与 `docs-site/dist` 实测均采集不到产物，是因为它们是隐藏目录 / 路径不对，所以要把产物复制到仓库根的非隐藏目录 `out/`~~ → 2026-11-02 更正：真因是构建机会**按根 `package.json` 的依赖重新识别框架**（控制台预设不参与这一步），识别成 `nuxt` / `next` 时它跳过「把输出目录搬进上传暂存区」那步、改等框架自己的原生暂存来填，而自定义构建命令不会触发那个暂存——于是输出目录填什么都没生效，构建还显示成功、产物列表为空。改法见注意事项第一条，改完 `out/` 这层中转就删掉了。
3. 绑定自定义域名 `vue3-okr-tree.baiwumm.com`（域名保持不变），在腾讯云 DNSPod 或当前 DNS 服务商处把解析指向 EdgeOne 控制台给出的加速域名；DNS、HTTPS 证书与缓存/回源策略按控制台实际配置。
4. 产物根目录含 `404.html`，但**它不会自动生效**：EdgeOne 文档说 SSG 只要输出里有 `404.html` 就会用它应答未匹配请求，而这站实测被当成 SPA（`/nope-xyz` 返回 200 且 ETag 与 `/` 完全相同）——平台把未知路径回落到 `/index.html`。`edgeone.json` 没有 404 / 状态码字段（只有 install / build / output / nodeVersion / buildMachine / redirects / rewrites / headers / cloudFunctions），控制台也没有错误页入口，所以改由 **`edge-functions/[[default]].js`** 兜底：EdgeOne 的函数路由是「静态资源优先」，这个全量 catch-all 只在什么都没匹配上时运行，返回真正的 404 + `404.html` 正文。详见该文件头部注释。
   - 尾斜杠归一同批收进 `edgeone.json`：`/api/`、`/guide/`、`/theme/`、`/migration/`、`/changelog/` 各自 301 到无斜杠形态，外加 `/index.html` → `/`。**故意不用 `/*/ → /:splat` 通配**：Playground 产物走相对路径（`base: './'`），`/playground` 少一个斜杠就会把 `./assets/*` 解析到站点根、整页空白。新增顶层页面时 `pnpm verify:seo` 会报「缺少尾斜杠归一」，按提示补一行即可。产物里同时存在 `api.html` 与 `api/index.html` 两种形态，前者 canonical 是 `/api`、后者自指 `/api/`，不归一直就是「一页两个规范网址」。**没做 `.html` 反向跳转**：平台把 clean URL 内部映射到 `x.html`，在此基础上加 `/*.html → /:splat` 有把自己跳成重定向环的风险，不值得——`x.html` 本身带正确 canonical，重复度可控。
5. 启用 AI Assistant 时，在控制台的环境变量配置里按实际方式写入 `AI_GATEWAY_API_KEY`。

> **加速区域**：选择「全球可用区（含中国大陆）」要求域名已完成 ICP 备案；未备案时请选择不含中国大陆的可用区。

注意：

- **根 `package.json` 里不要出现 `nuxt` / `next` 依赖**：EdgeOne 构建机按根 `package.json` 的 `(dev)Dependencies` 识别框架，命中 `nuxt` / `next` 就跳过输出目录搬运，结果是产物列表为空、构建却显示成功（2026-11-02 踩过，排查代价很高）。文档站工具链的依赖一律加在 `docs-site/package.json`（workspace 成员 `vue3-okr-tree-docs`）里，`prismjs` / `better-sqlite3` / `vue` 这些与库、Playground 共用的仍留在根上，由 Node 向上解析命中。**副产物**：根上还留着 `vite`（库构建必需），平台因此把这站当 SPA，未匹配路径回落 `/index.html` 而不是 `404.html`——这是 `edge-functions/[[default]].js` 存在的原因，删它之前先确认 `/nope-xyz` 真的返回 404。
- **AI Assistant**：由 docus 内置模块驱动，需要 **Vercel AI Gateway** 的 key——本地开发在 `.env.local` 写 `AI_GATEWAY_API_KEY=<key>`，部署平台在控制台的环境变量配置里同名配置（默认模型 `google/gemini-3-flash`，可在 `nuxt.config.ts` 的 `docus.assistant.model` 调整）。**没有 key 时模块自动整体禁用**，不渲染任何入口、不影响构建。
- 构建依赖 **better-sqlite3**（`@nuxt/content` 的构建期原生模块），已在 `pnpm-workspace.yaml` 的 `allowBuilds` 放行；Windows 本地开发首次安装会编译/下载预编译产物。
- 站内链接全部使用根绝对路径（Docus 原生 clean URL）；**只支持根路径部署，不支持子路径部署**。~~子路径部署（base 注入）VitePress 时代支持一键切换，Docus 下需要另行评估，未配置。~~ → 2026-11-04 定论：Docus/Nuxt 的页面链接、静态资源与合并进 `playground/` 的产物路径都按根绝对路径生成，改 base 会同时牵动导航、站内搜索索引与 Playground 路径，当前无此需求，明确不做支持。
- Playground 构建产物会被合并到输出的 `playground/` 子目录，导航中的「Playground」指向它（以 dist 产物构建，同时验证发布包路径）。
- ~~仓库内不维护平台专属的路由 / 响应头配置；静态托管所需的目录索引与 404 行为在 EdgeOne 控制台侧按实际能力配置。~~ → 2026-11-25 更正：控制台没有 404 / 重写规则入口，**仓库内改由 `edgeone.json`（构建命令、产物目录、尾斜杠 301）与 `edge-functions/[[default]].js`（未知路径兜底 404）表达**。两份文件都要跟产物结构一起改：`verify:seo` 会断言 `outputDirectory` 与 CI 断言目录一致、兜底函数存在。

## SEO / 收录

站点骨架的改动点集中在这里，改完务必跑 `pnpm docs:build:full && pnpm verify:seo`：

- **`lang` / sitemap 靠 docus 版本**：docus 5.13 有两个静默缺陷——`<html lang="en">`（拿 `zh-CN` 去查 `@nuxt/ui` 里键为 `zh_cn` 的表）与 sitemap `<loc>` 相对路径（自带路由只读环境变量、不读 `site.url`）。**5.15.0 已修复两者**（`getLocaleKey()` + `@nuxtjs/sitemap`），所以 `docs-site/package.json` 的 `docus` 不要往 5.15 以下回退。
- **站长平台验证**：`nuxt.config.ts` 的 `app.head.meta` 里挂 GSC（`google-site-verification`）与 Bing（`msvalidate.01`）两条 meta。GSC 管 Google，BWT 管 Bing——ChatGPT / Copilot 走 Bing 索引，只接一个等于漏掉一半 AI 可见性。
- **结构化数据**：`app/app.config.ts` 的 `seo.schema` 声明站点实体（`SoftwareApplication` + `Organization`，`price: 0`），docus 5.15 走 `nuxt-schema-org` 把它们编进首页 `@graph`，`WebSite` 用 `publisher` / `about` 指过去。★ 待补：文档页 `Article` 的 `author` / `datePublished` 仍缺（docus 只把 `modifiedAt` 透传给 schema，且未写 `author`）；`modifiedAt` 已进 frontmatter，所以 sitemap 的 `<lastmod>` 与页面新鲜度信号是齐的。
- **Playground 不进索引**：`playground/index.html` 带 `noindex, follow`（Vite 客户端壳的静态 HTML 只有一个空 `#app`）。
- **`/llms.txt`**：`nuxt.config.ts` 里显式覆盖了 `llms.description` —— 不覆盖时 docus 会拿 **docs-site/package.json** 的 description（「部署产物 docs-site/.output/public」）当产品简介写给 AI 引擎。
- **门禁**：`scripts/verify-seo.mjs`（`pnpm verify:seo`）断言 sitemap 绝对 URL、每页 `lang="zh-CN"` / 单个 h1 / canonical、验证 meta、playground noindex、favicon 存在；CI 的 docs 作业里跑。

## 结构

- `package.json`：pnpm workspace 成员 `vue3-okr-tree-docs`（private），`nuxt` / `docus` 只声明在这里——原因见上方注意事项
- `nuxt.config.ts`：`extends: ['docus']` + 站点信息、head 图标/OG、`vue3-okr-tree` → `src` 源码别名
- `app/app.config.ts`：Docus 站点配置（zh-CN、header/Logo、GitHub、二级导航、主题色、内置组件 slot 覆写）
- `app/components/UColorModeButton.vue`：覆盖 @nuxt/ui 的同名组件（docus 的 header 与 footer 各一处），把主题切换接到 [theme-switch-animation](https://www.npmjs.com/package/theme-switch-animation) 的 View Transition，受控模式下主题状态仍归 `@nuxtjs/color-mode`
- `app/components/content/`：MDC 组件——`DocsDemo`（Demo 容器）、`Demo*`（playground 用例包装）、`ApiSection`（渲染 `shared/api.ts` 的 API 单一来源数据）、`ChangelogVersions`（CHANGELOG 摘要）
- `app/app.css`：Docus 的样式钩子（`nuxt.config.ts` 里不再写 `css: []`）——playground 排版样式与 prism 主题以 `layer(base)` 引入、Maple Mono CN 的 `@theme` 覆写、Demo 容器样式
- `content/`：页面（Markdown + MDC），`1.guide/ 2.theme/ 3.api/` 前缀数字控制导航分组与排序
- `public/`：图标、Logo、OG 图、自托管字体
- `../edgeone.json`（仓库根）：EdgeOne Makers 的项目配置（构建命令、产物目录、尾斜杠 301）；文件存在时**优先于控制台里的同名设置**
- `../edge-functions/[[default]].js`（仓库根）：全量 catch-all 的 Edge Function，只负责把未匹配路径应答成真正的 404（平台路由是静态优先，不会遮住真实页面）
