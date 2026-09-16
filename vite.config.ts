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
      tsconfigPath: r('./tsconfig.json'),
      include: ['src/lib/**/*.ts', 'src/lib/**/*.vue', 'src/types/**/*.ts', 'env.d.ts'],
      exclude: ['tests/**', 'playground/**'],
      rollupTypes: true,
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
      formats: ['es', 'umd'],
      fileName: (format) => `vue3-okr-tree.${format}.js`,
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
  },
})
