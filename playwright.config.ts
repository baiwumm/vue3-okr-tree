import { defineConfig, devices } from '@playwright/test'

/**
 * 视觉回归测试（roadmap 1.5.0 #5）：真实浏览器对 Playground 关键用例截图比对。
 * 运行：pnpm build:playground（PLAYGROUND_USE_DIST=1）→ pnpm test:visual
 * 快照按平台存放（-win32 / -linux 后缀），每个平台的基线必须先存在才能跑门禁：
 * 缺失基线即判失败（updateSnapshots: 'missing' 只写入文件、仍返回 softError），
 * Linux 基线由 .github/workflows/snapshot-bootstrap.yml 生成后提交，见该文件用法说明。
 */
export default defineConfig({
  testDir: 'tests/visual',
  testMatch: '**/*.spec.ts',
  // 视觉与性能测试追求确定性：串行运行，避免并发争用导致的截图与计时抖动
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  // 缺失基线时写入实际截图并把该用例判失败（提示去提交基线），已存在的快照不一致同样失败
  updateSnapshots: 'missing',
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  expect: {
    toHaveScreenshot: {
      // 跨环境渲染允许 2% 像素差异（亚像素抗锯齿抖动）
      maxDiffPixelRatio: 0.02,
    },
  },
  webServer: {
    command: 'pnpm preview:playground --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
