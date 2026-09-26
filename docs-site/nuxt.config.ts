import { fileURLToPath, URL } from 'node:url'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// 文档站（VitePress → Docus v5 迁移）：Docus 是 Nuxt layer（extends），页面在 content/，
// Demo 用例直接复用 playground/components/demos 组件（单一来源），库本体以 src 源码别名引入
// （文档站开发/构建均无需先跑 dist 构建）。部署：Cloudflare 静态资产（nuxt generate → .output/public），
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
      ],
      meta: [
        { property: 'og:image', content: 'https://vue3-okr-tree.baiwumm.com/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: 'https://vue3-okr-tree.baiwumm.com/og-image.png' },
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
  llms: {
    domain: 'https://vue3-okr-tree.baiwumm.com',
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
