// Docus 站点配置（schema 见 node_modules/docus/nuxt.schema.ts）：
// 与姊妹站 react-okr-tree 同格式：首页标题是「名称 — 一句话定位」，内页只挂短名后缀。
export default defineAppConfig({
  docus: {
    locale: 'zh-CN',
    colorMode: '',
  },
  seo: {
    title: 'vue3-okr-tree',
    description:
      'Vue 3 组织架构树 / OKR 树组件：根节点左右双向展开、CSS 变量主题化、懒加载、画布缩放与导出',
  },
  header: {
    title: 'vue3-okr-tree',
    // 导航栏 Logo：透明底、图形随主题反相（源文件 design/logo/concept-c-ring-*.svg）
    logo: {
      light: '/logo.svg',
      dark: '/logo-dark.svg',
      alt: 'vue3-okr-tree',
    },
  },
  github: {
    url: 'https://github.com/baiwumm/vue3-okr-tree',
    branch: 'main',
    // 「编辑此页」链到仓库里的 docs-site/content/
    rootDir: 'docs-site',
  },
  // 分区导航不做 header 二级条（tabs），走侧边栏分组展开的形态（同 docus.dev）
  toc: {
    title: '本页内容',
    // 右侧栏底部的「社区」块（同 docus.dev 的 Community）；links 为空时 docus 整块不渲染
    bottom: {
      links: [
        {
          icon: 'i-simple-icons-github',
          label: 'GitHub',
          to: 'https://github.com/baiwumm/vue3-okr-tree',
          target: '_blank',
        },
        {
          icon: 'i-simple-icons-npm',
          label: 'npm',
          to: 'https://www.npmjs.com/package/vue3-okr-tree',
          target: '_blank',
        },
        {
          icon: 'i-lucide-history',
          label: '更新日志',
          to: '/changelog',
        },
      ],
    },
  },
  // Assistant：UI 开启；实际可用还差 AI_GATEWAY_API_KEY（Vercel AI Gateway），
  // 无 key 时模块自动整体禁用、不渲染任何入口（见 docus/modules/assistant）
  search: {
    fts: false,
  },
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'zinc',
    },
    // 首页 Hero：字号收到 docus.dev 的量级（默认 sm:text-7xl 对中文标题过大），
    // 标题/描述限宽靠 slot class 完成，不再用裸 CSS 选择器
    pageHero: {
      slots: {
        title: 'font-semibold sm:text-6xl max-w-[19ch] mx-auto',
        description: 'max-w-[46ch] mx-auto',
      },
    },
    // 首页特性卡片：图标从裸图标改成主色底、圆角色块
    pageCard: {
      slots: {
        leading:
          'inline-flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary mb-3',
        leadingIcon: 'size-5 shrink-0',
      },
    },
    // 更新日志时间轴：内置版式假设正文列宽于 max-w-2xl（每版的日期+圆点是绝对定位的 8rem 左栏，
    // container 用 mx-auto max-w-2xl 居中让出它），而 docus 的 UPageBody 恰好就是 672px，
    // 居中量归零后日期与圆点直接压在版本号上。这里改成「让出 8rem + 24px 间隙」的流内布局；
    // 左栏是 hidden lg:flex，所以让位也只从 lg 起，窄屏日期回到 header 的 meta 行里。
    changelogVersion: {
      slots: {
        container: 'flex flex-col lg:ms-32 lg:ps-6',
      },
    },
  },
})
