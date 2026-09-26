<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ThemeAnimationType, useThemeAnimation } from 'theme-switch-animation/vue'
import { useAppConfig, useColorMode } from '#imports'

/**
 * 覆盖 @nuxt/ui 的 <UColorModeButton>（docus 的 header 与 footer 各渲染一个），
 * 把主题切换接上 theme-switch-animation 的 View Transition：新主题以按钮为圆心、
 * 边缘带高斯模糊地圆形扩散揭开。不支持 View Transitions 或
 * prefers-reduced-motion: reduce 时库自动降级为直切，状态仍然正确。
 *
 * CIRCLE_BLUR 不配 reverse：库里只有 CIRCLE / FAN / RIPPLE / CLOCK_SWEEP / CURTAIN
 * 接入了反向形态（core/orchestrate.ts 的 reverseCapable 白名单），其余类型传了静默忽略。
 * 要「切暗扩散、切亮收拢」的方向感就换回 ThemeAnimationType.CIRCLE。
 * blurAmount 只有 CIRCLE_BLUR 消费，这里取库默认的 2。
 *
 * 走受控模式（isDark + onChange）：主题状态依旧归 @nuxtjs/color-mode 管
 * （localStorage、prefers-color-scheme、SSR 首屏类名都不旁落），库只负责转场。
 * options 用 reactive 包（受控模式要求响应式来源，否则按 setup 快照工作）。
 *
 * 日/月图标沿用内置的 CSS 双图标写法而非 computed：它的翻转只依赖 <html> 上的 dark 类，
 * 正是库在受控模式下等待的那个 DOM 变化，转场后截图时不会慢半拍。
 */
const colorMode = useColorMode()
const appConfig = useAppConfig()

const isDark = computed(() => colorMode.value === 'dark')

const { triggerRef, toggleTheme, finished } = useThemeAnimation<HTMLElement>(
  reactive({
    animationType: ThemeAnimationType.CIRCLE_BLUR,
    duration: 500,
    get isDark() {
      return colorMode.value === 'dark'
    },
    onChange(next: boolean) {
      colorMode.preference = next ? 'dark' : 'light'
    },
  })
)

// 动画期间禁用：连点会把两轮转场叠在一起。降级路径下 finished 立即结算，不会卡住
const animating = ref(false)

async function onClick() {
  animating.value = true
  toggleTheme()
  await finished.value
  animating.value = false
}
</script>

<template>
  <span ref="triggerRef" class="inline-flex">
    <UButton
      color="neutral"
      variant="ghost"
      :aria-label="isDark ? '切换到浅色主题' : '切换到深色主题'"
      :disabled="animating"
      @click="onClick"
    >
      <template #leading="{ ui }">
        <UIcon
          :name="appConfig.ui.icons.dark"
          :class="ui.leadingIcon({ class: 'hidden dark:inline-block' })"
        />
        <UIcon :name="appConfig.ui.icons.light" :class="ui.leadingIcon({ class: 'dark:hidden' })" />
      </template>
    </UButton>
  </span>
</template>
