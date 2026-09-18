<template>
  <div class="docs-demo-block vue-okr-tree-demo">
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * 文档站 Demo 容器：套用 playground 的 .vue-okr-tree-demo 排版样式，
 * 使 playground/components/demos 下的用例组件在文档站中获得与 Playground 一致的外观。
 */
defineOptions({ name: 'DocsDemoBlock' })
</script>

<style>
.docs-demo-block {
  max-width: 100%;
  padding: 16px 0;
  margin: 0;
}
.docs-demo-block h3 {
  margin-top: 0;
}
</style>
