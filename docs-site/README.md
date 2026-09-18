# docs-site（VitePress 文档站）

vue3-okr-tree 在线文档：指南 / 主题 / API / 迁移 / 更新日志，Demo 用例直接复用 `playground/components/demos` 组件（单一来源，与 Playground 完全一致）。

## 本地开发

```bash
pnpm install
pnpm docs:dev            # 文档站开发服务（库本体走 src 源码别名，无需先构建）
pnpm docs:build          # 仅构建文档站
pnpm docs:preview        # 预览文档站构建产物
pnpm docs:build:full     # 完整构建：Playground(dist) + 文档站 + 合并 /playground/ 子路径
```

## 部署到 Cloudflare Pages / Workers

推荐 **Cloudflare Pages 的 Git 集成**（仓库推送自动构建部署）：

| 配置项       | 值                                                                                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 构建命令     | `corepack enable && pnpm install --frozen-lockfile && pnpm docs:build:full`                                                                                      |
| 构建输出目录 | `docs-site/.vitepress/dist`                                                                                                                                      |
| 环境变量     | `NODE_VERSION=22`、`PLAYGROUND_USE_DIST=1`（脚本内部已设置，配置在此仅为显式声明）、`enablePrePostScripts=true`（如 CI 未启用 corepack 则先 `npm i -g pnpm@11`） |

> Workers（静态资产）方式等价：`pnpm docs:build:full` 后把 `docs-site/.vitepress/dist` 作为资产目录上传即可。

注意：

- 站内链接全部使用根绝对路径（VitePress 自动附加 `base`）。当前 `base: '/'`（根路径部署）；如需子路径部署，只需把 `docs-site/.vitepress/config.mts` 的 `base` 改为对应子路径，页面无需改动。
- Playground 构建产物会被合并到输出的 `playground/` 子目录，导航中的「Playground」指向它（以 dist 产物构建，同时验证发布包路径）。

## 结构

- `.vitepress/config.mts`：站点配置（导航 / 侧边栏 / 库源码别名）
- `.vitepress/theme/`：默认主题 + Demo 复用样式
- `components/`：`DemoBlock`（Demo 容器）、`ApiDoc`（渲染 `shared/api.ts` 的 API 单一来源数据）
- `guide/` `theme/` `api/` `migration.md` `changelog.md`：页面（Markdown + 内嵌 Vue 组件）
