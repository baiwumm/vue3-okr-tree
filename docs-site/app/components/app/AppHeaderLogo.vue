<script setup lang="ts">
import { useAppConfig, useLogoAssets } from '#imports'

const appConfig = useAppConfig()
const { hasLogo, headerLightUrl, headerDarkUrl, contextMenuItems } = useLogoAssets()
</script>

<template>
  <!-- 覆写 Docus 同名组件：默认 Logo 与站名二选一，这里改为并排展示 -->
  <span class="flex items-center gap-2">
    <UContextMenu v-if="hasLogo" :items="contextMenuItems">
      <UColorModeImage
        :light="headerLightUrl"
        :dark="headerDarkUrl"
        :alt="appConfig.header?.logo?.alt || appConfig.header?.title"
        :class="['h-6 w-auto shrink-0', appConfig.header?.logo?.class]"
      />
    </UContextMenu>
    <span class="font-bold text-highlighted">{{ appConfig.header?.title }}</span>
  </span>
</template>
