# Security Policy

`vue3-okr-tree` 是纯前端运行的 Vue 3 组件库：没有服务端、没有账号体系、不发起网络请求。
安全面很窄，但有两处值得认真对待——**节点内容的渲染**与**画布导出**。

## 报告漏洞

**请不要为安全问题开公开 issue 或 PR。** 走 GitHub 私密漏洞报告：

https://github.com/baiwumm/vue3-okr-tree/security/advisories/new

请写明：受影响的版本、Vue 版本、复现步骤、以及你预期的影响面。PoC 里请使用伪造数据，
不要贴真实站点的凭证或用户数据。

这是个人维护的项目，响应是尽力而为的：收到后会在 advisory 里给确认，修复前请留出
时间，不要在未协调的情况下公开细节。

## 范围

**在范围内**：

- 组件内部把使用方传入的数据拼接进 HTML / 样式而导致的注入面（`render-content`、
  `node-btn-content` 插槽、`node-component` 自定义组件渲染路径）
- `OkrTreeViewport` 导出 PNG / SVG 时对 DOM 的序列化与图片编码处理（含 `html-to-image`
  的调用边界）
- 懒加载 `load` 回调、`filter-node-method`、`check-strictly` 等回调在异常输入下的状态污染
  或越界访问
- 发布产物本身：`dist` 里的代码与 `package.json` 的 `exports` / `peerDependencies` 声明
  不一致、误带非预期文件

**不在范围内**：

- 布局与观感问题（连线位置、根对齐、展开收起抖动、主题配色）——这些是 issue 与讨论区的事
- 性能问题（首渲染耗时、虚拟滚动掉帧）——走 issue，附上复现数据即可
- 使用方自己把不可信输入直接喂进 `render-content` 等插槽所产生的 XSS：组件按 Vue 的常规
  语义渲染插槽内容，责任在使用方
- 依赖链上的通用漏洞——本仓库的运行时依赖只有 `vue` 与可选的 `html-to-image`，其余为
  dev 侧依赖，由 Renovate 与 CI 审计跟进

## 受支持的版本

只有**最新发布的 minor 版本**接收安全修复。修复以新版本发布后走正常升级路径，
不单独回补旧版本。
