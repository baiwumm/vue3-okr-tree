<template>
  <div class="demo-frame vue-okr-tree-demo">
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * Demo 总览页专用容器：用例组件自带的 h3 标题在总览页与 markdown 小节标题重复，
 * 这里隐藏之（单个指南页里的用例不受影响——它们走 ::docs-demo）。
 * vue-okr-tree-demo 是 playground 排版样式的类作用域（按钮 / 输入框 / 段落都在它下面），
 * 少了它总览页的用例控件会退化成浏览器默认样式。
 */
</script>

<style>
.demo-frame .tree-demo-title-h3 {
  display: none;
}
</style>
