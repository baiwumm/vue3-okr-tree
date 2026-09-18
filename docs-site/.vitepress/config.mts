import { defineConfig } from 'vitepress'
import { fileURLToPath, URL } from 'node:url'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// 文档站（roadmap 1.5.0 #3）：VitePress，页面按「指南 / 主题 / API / 迁移 / 更新日志」组织，
// Demo 用例直接复用 playground/components/demos 组件（单一来源）。
// 库本体以 src 源码别名引入（文档站开发/构建均无需先跑 dist 构建）。
// 部署：Cloudflare Pages/Workers（见 docs-site/README.md）；站内链接均用根绝对路径，
// VitePress 会自动附加 base，base 改回子路径部署时无需改动页面。
export default defineConfig({
  lang: 'zh-CN',
  title: 'vue3-okr-tree',
  description:
    'Vue 3 组织架构树 / OKR 树组件：根节点左右双向展开、CSS 变量主题化、懒加载、画布缩放与导出',
  // Cloudflare 按域名根路径部署；如需子路径部署改回 '/vue3-okr-tree/' 即可
  base: '/',
  srcDir: '.',
  srcExclude: ['README.md'],
  cleanUrls: false,
  lastUpdated: true,
  // 图标与分享图放 docs-site/public/（构建时原样拷到站点根）；head 内路径 VitePress 不会自动加 base，
  // 与 base 保持一致地写根绝对路径。
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
    ['meta', { property: 'og:image', content: 'https://vue3-okr-tree.baiwumm.com/og-image.png' }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: 'https://vue3-okr-tree.baiwumm.com/og-image.png' }],
  ],
  themeConfig: {
    siteTitle: 'vue3-okr-tree',
    // 导航栏 Logo：透明底、图形随主题反相（源文件 design/logo/concept-c-ring-*.svg）
    logo: { light: '/logo.svg', dark: '/logo-dark.svg' },
    nav: [
      { text: '指南', link: '/guide/quick-start', activeMatch: '/guide/' },
      { text: '主题', link: '/theme/', activeMatch: '/theme/' },
      { text: 'API', link: '/api/', activeMatch: '/api/' },
      { text: '迁移', link: '/migration' },
      { text: '更新日志', link: '/changelog' },
      // Playground 由 docs:build:full 合并进输出目录 /playground/ 子路径
      { text: 'Playground', link: '/playground/', target: '_blank' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '快速开始', link: '/guide/quick-start' },
            { text: 'Demo 总览（可交互）', link: '/guide/demos' },
            { text: '受控状态与方法', link: '/guide/controlled' },
            { text: '懒加载子节点', link: '/guide/lazy' },
            { text: '画布缩放 OkrTreeViewport', link: '/guide/viewport' },
            { text: '多树根对齐 OkrTreeGroup', link: '/guide/group' },
            { text: '键盘导航与可访问性', link: '/guide/keyboard' },
            { text: '类型化 createTypedOkrTree', link: '/guide/typed' },
          ],
        },
        {
          text: '外观',
          items: [{ text: '主题与样式定制', link: '/theme/' }],
        },
      ],
      '/theme/': [{ text: '主题与样式定制', link: '/theme/' }],
      '/api/': [{ text: 'API', link: '/api/' }],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/baiwumm/vue3-okr-tree' }],
    outline: [2, 3],
    footer: {
      message: '基于 MIT 许可发布',
      copyright: 'Copyright © 2026 baiwumm',
    },
  },
  vite: {
    resolve: {
      alias: [
        { find: /^vue3-okr-tree$/, replacement: r('../../src/lib/index.ts') },
        {
          find: 'vue3-okr-tree/dist/style.css',
          replacement: r('../../src/lib/okr-tree/style.css'),
        },
      ],
    },
  },
})
