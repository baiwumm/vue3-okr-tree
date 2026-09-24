/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { fileURLToPath, URL } from 'node:url'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// 库模式构建：ESM + UMD，外部化 vue，CSS 抽出为 dist/style.css，类型打包为 dist/index.d.ts
export default defineConfig({
  plugins: [
    vue(),
    dts({
      processor: 'vue',
      tsconfigPath: r('./tsconfig.json'),
      entryRoot: r('./src'),
      include: ['src/lib/**/*.ts', 'src/lib/**/*.vue', 'src/types/**/*.ts', 'env.d.ts'],
      exclude: ['tests/**', 'playground/**'],
      bundleTypes: true,
      insertTypesEntry: true,
      cleanVueFileName: true,
      copyDtsFiles: false,
    }),
  ],
  resolve: {
    alias: {
      '@': r('./src'),
    },
  },
  build: {
    lib: {
      entry: r('./src/lib/index.ts'),
      name: 'VueOkrTree',
      formats: ['es', 'umd', 'cjs'],
      // es/umd 保持原命名；cjs 用 .cjs 扩展名以兼容 "type": "module" 下的 require()
      fileName: (format) => (format === 'cjs' ? 'vue3-okr-tree.cjs' : `vue3-okr-tree.${format}.js`),
      cssFileName: 'style',
    },
    cssCodeSplit: false,
    sourcemap: true,
    /**
     * 用 Terser 而不是默认的 esbuild 压缩：`src/lib/okr-tree/viewport.ts` 里那三条
     * `@vite-ignore` / `webpackIgnore` / `turbopackIgnore` 必须活到**发布出去的产物**里，
     * 消费者用 Next 16 的 Turbopack 时只认后两家，缺了就变成构建期 "Module not found"
     * （库能发出去但下游装不上，文档站是第一个撞上的真实消费者）。
     * esbuild 保不住——实测 minifyWhitespace / legalComments:'inline' / 连注释改写成
     * legal 形态四档全丢；Terser 可以按正则留。门禁在 scripts/verify-dist.mjs。
     * 历史上这里还有一条 scripts/post-build.mjs 里的 esbuild 补压（因为 Vite lib 模式下
     * es 输出不随 cjs/umd 压缩），一并删掉——那道压缩正是把注释吃掉的东西。
     */
    minify: 'terser',
    terserOptions: {
      format: {
        comments: /vite-ignore|webpackIgnore|turbopackIgnore/,
      },
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'tests/*.spec.ts',
      'tests/components/**/*.spec.ts',
      'tests/model/**/*.spec.ts',
      'tests/ssr/**/*.spec.ts',
    ],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**'],
      // 初始阈值（roadmap 1.5.0 #7）：当前基线 statements ≈ 90%，门槛 80%
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
})
