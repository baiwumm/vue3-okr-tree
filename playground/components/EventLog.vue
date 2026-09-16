<template>
  <div class="event-log">
    <div class="event-log-title">事件输出（最近 {{ max }} 条）</div>
    <div v-if="!items.length" class="event-log-empty">
      尚未触发事件，试试点击节点 / 右键 / 展开按钮
    </div>
    <div v-for="(item, i) in items" :key="i" class="event-log-item">
      <span class="evt">{{ item.event }}</span> → {{ item.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

export interface LogItem {
  event: string
  text: string
}

const props = withDefaults(defineProps<{ max?: number }>(), { max: 8 })
const items = ref<LogItem[]>([])

function push(event: string, text: string) {
  items.value.unshift({ event, text })
  if (items.value.length > props.max) items.value.length = props.max
}

defineExpose({ push })
</script>
