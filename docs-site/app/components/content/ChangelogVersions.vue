<script setup lang="ts">
import { changelogEntries } from './changelog-entries.data'

/**
 * 更新日志摘要（替代 VitePress 的 <!--@include: CHANGELOG.md-->）：数据由
 * scripts/gen-changelog-entries.mjs 在 docs:build 时从仓库根 CHANGELOG.md 生成
 * （changelog-entries.data.ts），渲染交给 Nuxt UI 的 <UChangelogVersions>（时间轴 + 圆点）。
 * 完整记录始终以仓库 CHANGELOG.md 为准。
 *
 * #date：内置组件用 reka-ui 的 useDateFormatter(locale.value.code) 排版日期，
 * 而 docus 未启用 @nuxtjs/i18n 时 locale.value 是字符串、.code 为 undefined，
 * 结果永远是英文「Sep 26, 2026」——这里覆盖回 CHANGELOG 里的 ISO 原样。
 */
const versions = changelogEntries.map((e) => ({
  title: e.version,
  date: e.date,
  description: e.summary,
}))
</script>

<template>
  <UChangelogVersions :versions="versions">
    <template #date="{ version }">
      {{ version.date }}
    </template>
  </UChangelogVersions>
</template>
