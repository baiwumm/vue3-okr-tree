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
    include: ['tests/**/*.spec.ts'],
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
