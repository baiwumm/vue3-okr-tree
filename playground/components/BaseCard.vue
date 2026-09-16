<template>
  <div class="base-card-wrapper">
    <div class="card-source">
      <slot name="header"></slot>
    </div>
    <div ref="meta" class="card-body-meta" :style="{ height: metaHeight + 'px' }">
      <div ref="metaInner">
        <div v-if="$slots.description" class="description">
          <slot name="description" />
        </div>
        <slot></slot>
      </div>
    </div>
    <div class="base-card-control" @click="handleClick">
      {{ show ? '隐藏代码' : '显示代码' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'

const show = ref(false)
const metaHeight = ref(0)
const metaInner = ref<HTMLElement | null>(null)

async function handleClick() {
  show.value = !show.value
  if (show.value) {
    await nextTick()
    metaHeight.value = (metaInner.value?.getBoundingClientRect().height ?? 0) + 20
  } else {
    metaHeight.value = 0
  }
}
</script>

<style scoped>
.base-card-wrapper {
  border: 1px solid #ebebeb;
  border-radius: 3px;
  transition: all 0.2s;
}
.base-card-wrapper .card-source {
  padding: 24px;
}
.base-card-wrapper .base-card-control {
  border-top: 1px solid #eaeefb;
  height: 44px;
  background-color: #fff;
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
  text-align: center;
  margin-top: -1px;
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 14px;
}
.base-card-wrapper .base-card-control:hover {
  color: #409eff;
}
.base-card-wrapper .card-body-meta {
  border-top: 1px solid #eaeefb;
  height: 0;
  overflow: hidden;
  transition: height 0.25s;
  background: #f5f2f0;
}
.card-body-meta .description {
  padding: 20px;
  border: 1px solid #ebebeb;
  border-radius: 3px;
  font-size: 14px;
  line-height: 22px;
  color: #666;
  word-break: break-word;
  margin: 10px;
  background-color: #fff;
}
</style>
