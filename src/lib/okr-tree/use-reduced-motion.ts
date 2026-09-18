import { ref } from 'vue'

const QUERY = '(prefers-reduced-motion: reduce)'

/** 全局共享状态：系统是否要求减少动效（matchMedia 监听只注册一次） */
const reduceMotion = ref(false)
let listening = false

/**
 * 读取 prefers-reduced-motion。SSR 安全：服务端没有 window，返回恒为 false 的共享 ref。
 * 调用方（OkrTree / OkrTreeNode）据此把 animate 视为关闭，使展开/收起状态直切。
 */
export function usePrefersReducedMotion() {
  if (!listening && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    listening = true
    const mql = window.matchMedia(QUERY)
    reduceMotion.value = mql.matches
    if (typeof mql.addEventListener === 'function')
      mql.addEventListener('change', (e) => {
        reduceMotion.value = e.matches
      })
  }
  return reduceMotion
}
