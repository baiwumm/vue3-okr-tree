<script setup lang="ts">
import { version } from '../../../../package.json'

/**
 * Hero 区的版本按钮：读取根 package.json 的 version，
 * 点击跳 GitHub Releases。
 */
</script>

<template>
  <UButton
    :label="`v${version}`"
    to="https://github.com/baiwumm/vue3-okr-tree/releases"
    target="_blank"
    icon="i-lucide-tag"
    color="primary"
    variant="subtle"
    size="md"
  />
</template>
