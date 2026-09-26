import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// Demo 站入口。默认（dev）直接引用 src/lib 源码；
// 设置 PLAYGROUND_USE_DIST=1 时改为引用 dist 构建产物，用于验证发布包路径（计划 6.8）。
const useDist = process.env.PLAYGROUND_USE_DIST === '1'

export default defineConfig({
  root: r('./playground'),
  base: './',
  plugins: [vue()],
  resolve: {
    alias: useDist
      ? {
          'vue3-okr-tree/dist/style.css': r('./dist/style.css'),
          'vue3-okr-tree': r('./dist/vue3-okr-tree.es.js'),
        }
      : {
          'vue3-okr-tree/dist/style.css': r('./src/lib/okr-tree/style.css'),
          'vue3-okr-tree': r('./src/lib/index.ts'),
        },
  },
  server: {
    port: 5173,
    open: false,
  },
  build: {
    outDir: r('./playground/dist'),
    emptyOutDir: true,
  },
})
