<template>
  <div class="docs-demo-block vue-okr-tree-demo">
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * Demo 容器（原 VitePress DemoBlock 组件）：套用 playground 的 .vue-okr-tree-demo
 * 排版样式，使 playground/components/demos 的用例组件在文档站获得一致外观。
 * 在 MDC 里以 ::docs-demo 块使用。
 */
defineOptions({ name: 'DocsDemo' })
</script>
