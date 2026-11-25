import { fileURLToPath, URL } from 'node:url'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// 文档站（VitePress → Docus v5 迁移）：Docus 是 Nuxt layer（extends），页面在 content/，
// Demo 用例直接复用 playground/components/demos 组件（单一来源），库本体以 src 源码别名引入
// （文档站开发/构建均无需先跑 dist 构建）。部署：腾讯云 EdgeOne 静态托管（nuxt generate → .output/public），
// 站内链接均用根绝对路径，与 base 无关（Nuxt 站点不支持像 VitePress 那样的一键 base 注入，
// 子路径部署时需要再评估）。
export default defineNuxtConfig({
  extends: ['docus'],
  site: {
    name: 'vue3-okr-tree',
    url: 'https://vue3-okr-tree.baiwumm.com',
  },
  app: {
    head: {
      // 图标与分享图在 docs-site/public/（构建时原样拷到站点根）
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        // 中文字体 1.7 MB 且是正文族：不 preload 要等 CSSOM + 字体请求才生效，
        // 首屏会先渲染回退字体再整页重排（font-display: swap 的代价）。
        {
          rel: 'preload',
          as: 'font',
          type: 'font/woff2',
          href: '/fonts/maple-mono-cn-regular.woff2',
          crossorigin: 'anonymous',
        },
      ],
      // og:image / twitter:* 由 nuxt-og-image 按页生成（1200×600 动态图）。这里不再写死
      // 静态 /og-image.png —— 曾经写过，被模块覆盖成悬空配置，还留下 630 vs 600 的高度矛盾。
      meta: [
        // 站长平台归属验证（Google Search Console / Bing Webmaster）。
        // 这两行是纯 meta 验证，不引入 JS；GSC 与 BWT 都要接，因为
        // ChatGPT / Copilot 走 Bing 索引，只看 Google 会漏掉一半 AI 可见性。
        {
          name: 'google-site-verification',
          content: '4YBtBTmg5H9MGoyvCmvEeJx8viyBPjLnK4INCHT9SQs',
        },
        { name: 'msvalidate.01', content: '6DEA985B20CA4A215DAC4EA659011A8A' },
      ],
    },
  },
  alias: {
    'vue3-okr-tree': r('../src/lib/index.ts'),
  },
  // 样式走 Docus 官方钩子 app/app.css（由 layer/modules/css.ts 注入 docus.css 末尾），不写 css: []。
  // 这里也**不覆写 content.build.markdown.highlight.theme**：docus 自带 { light, default, dark }
  // 三档 material-theme，暗色由 docus.css 的 `html.dark .shiki span` 规则切换；
  // 曾经写死的 { default: github-light, dark: github-dark } 会和默认值合并出第四个主题，
  // 且 Nuxt Color Mode 给 <html> 挂的 light 类让浅色页实际吃到 material-theme-lighter，两档主题错配。
  // 自托管字体已够用，关掉 google 系 provider，避免 CI 构建因网络抖动失败
  fonts: {
    providers: {
      google: false,
      googleicons: false,
    },
  },
  // nuxt-llms 需要显式 domain（顺带把 /llms.txt 指到正式域名）
  //
  // description 必须显式给：docus 的 modules/config.ts 拿的是 **docs-site/package.json**
  // 的 description，也就是「文档站，部署产物 docs-site/.output/public」这句构建说明——
  // 不覆盖的话 /llms.txt 的第二行就在告诉 AI 引擎自己是个构建目录。
  llms: {
    domain: 'https://vue3-okr-tree.baiwumm.com',
    description:
      'Vue 3 组织架构树 / OKR 树组件库：根节点左右双向展开（飞书 OKR 式布局）、CSS 变量主题化、懒加载、虚拟滚动、画布缩放与 PNG / SVG 导出。MIT 协议，npm 包 vue3-okr-tree，peer 依赖 vue >= 3.5.2。',
    full: {
      description:
        'Vue 3 组织架构树 / OKR 树组件库的完整文档：安装与引入、props / events / methods / 插槽、主题变量、虚拟滚动、画布缩放与导出、与 vue-okr-tree 的迁移差异。',
    },
  },
  vite: {
    resolve: {
      alias: [
        {
          find: 'vue3-okr-tree/dist/style.css',
          replacement: r('../src/lib/okr-tree/style.css'),
        },
      ],
    },
  },
})
