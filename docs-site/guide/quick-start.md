# 快速开始

vue3-okr-tree 是 [vue-okr-tree](https://github.com/qq449245884/vue-okr-tree)（Vue 2）的 Vue 3 完整复刻版，API 与其保持对齐。

## 安装

```bash
pnpm add vue3-okr-tree
# 或
npm i vue3-okr-tree
```

Peer 依赖：`vue >= 3.0.0`。

## 使用

```vue
<template>
  <vue-okr-tree :data="data" direction="horizontal" show-collapsable />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'
import 'vue3-okr-tree/dist/style.css'

const data = ref([
  {
    id: 1,
    label: 'xxx科技有有限公司',
    children: [
      { id: 2, label: '产品研发部', children: [{ id: 3, label: '研发-前端' }] },
      { id: 4, label: '销售部' },
    ],
  },
])
</script>
```

也可以全局注册：

```ts
import { VueOkrTreePlugin } from 'vue3-okr-tree'
// app.use(VueOkrTreePlugin) 后可用 <vue-okr-tree> / <okr-tree> / <okr-tree-group> / <okr-tree-viewport>
```

## 更多

- 想直接把玩所有用例：前往 [Demo 总览](/guide/demos)（与 GitHub 上的 Playground 相同的组件）。
- 大数据量：阅读[懒加载](/guide/lazy)与[画布缩放](/guide/viewport)。
- 从 vue-okr-tree 迁移：阅读[迁移说明](/migration)。
