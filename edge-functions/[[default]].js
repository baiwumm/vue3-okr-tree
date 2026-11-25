/**
 * 未知路径的兜底 404（EdgeOne Makers Edge Function）。
 *
 * 为什么需要它：产物里本来就有 `404.html`，EdgeOne 文档也说「SSG 只要输出目录里有
 * 404.html，平台会自动用它应答未匹配的请求」——但这站实测不是这样：
 *
 *   curl -sSI https://<site>/nope-xyz   → HTTP 200，ETag 与 `/` 完全相同
 *
 * 也就是说平台把这站当 SPA 处理，未匹配路径一律回落到 `/index.html` 并返回 200，
 * 任何一个拼错的链接都会变成「200 状态码 + 首页内容」的软 404，既污染索引质量
 * 也白白吃掉抓取预算。`edgeone.json` 没有 404 / 状态码字段（只有 install / build /
 * output / nodeVersion / buildMachine / redirects / rewrites / headers / cloudFunctions），
 * 控制台也没有错误页入口，所以只能从「函数」这一层补。
 *
 * 为什么会命中：EdgeOne 的路由顺序是「静态资源优先 → 函数」，文档原文是
 * "If Edge Functions route conflicts with static resource route, client request will be
 * preferentially routed to static resource"。所以 `[[default]]` 这个全量兜底不会遮住
 * 任何真实页面，只在「什么都没有匹配上」时才运行——正是回落 index.html 的那个时刻。
 *
 * 返回体直接取产物里的 `404.html`（与站点同一套样式、带 noindex），取不到再退化成
 * 内联的最小 HTML；两种情况都是真正的 404 状态码。
 */

const FALLBACK_HTML = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>404 - vue3-okr-tree</title>
  </head>
  <body>
    <main style="font:16px/1.7 system-ui, sans-serif; max-width:36rem; margin:18vh auto; padding:0 1.5rem">
      <h1 style="font-size:1.5rem">页面不存在</h1>
      <p>你访问的地址没有对应的页面。<a href="/">回到文档首页</a>，或用 <a href="/guide/quick-start">快速开始</a> 重新进入。</p>
    </main>
  </body>
</html>`

const HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  // 404 是终端状态，别让边缘节点或浏览器缓存住，否则路径重新上架后仍会命中旧响应。
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex',
}

export default async function onRequest(context) {
  const origin = new URL(context.request.url).origin

  try {
    const asset = await fetch(new URL('/404.html', origin))
    if (asset.ok) {
      return new Response(await asset.text(), { status: 404, headers: HEADERS })
    }
  } catch {
    // 子请求失败（网络/路由异常）就退化成内联页面，别让兜底自己再挂一次。
  }

  return new Response(FALLBACK_HTML, { status: 404, headers: HEADERS })
}
