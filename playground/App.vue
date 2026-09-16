<template>
  <div class="vue-okr-tree-demo">
    <h2 class="tree-demo-title">Tree 树形控件（vue3-okr-tree）</h2>
    <p class="tree-demo-subtitle">
      用清晰的层级结构展示信息，可展开或折叠；支持类似飞书 OKR 的根节点左右双向展开。
      <a href="https://github.com/baiwumm/vue3-okr-tree" target="_blank" rel="noreferrer">GitHub</a>
      ·
      <a href="https://www.npmjs.com/package/vue3-okr-tree" target="_blank" rel="noreferrer">npm</a>
    </p>
    <nav class="demo-nav">
      <a v-for="item in nav" :key="item.id" :href="`#${item.id}`">{{ item.text }}</a>
    </nav>

    <!-- 1 基础用法 -->
    <Base01 />
    <!-- 2 水平方向 -->
    <Base02 />
    <!-- 3 节点展开 -->
    <Base03 />
    <!-- 4 节点全部展开 -->
    <Base04 />
    <!-- 5 通过 key 让节点展开 -->
    <Base041 />
    <!-- 6 节点样式 -->
    <Base05 />
    <!-- 7 自定义节点内容 -->
    <Base06 />
    <!-- 8 展开按钮自定义内容 -->
    <Base062 />
    <!-- 9 节点动画 -->
    <Base061 />
    <!-- 10 OKR 模式 -->
    <Base07 />
    <!-- 11 OKR 模式之自定义内容 -->
    <Base08 />
    <!-- 12 OKR 模式自定义内容 II（showNodeNum） -->
    <Base081 />
    <!-- 13 Filter -->
    <BaseFilter />
    <!-- 14 OKR Filter -->
    <BaseFilterOkr />
    <!-- 15 Events -->
    <BaseEvents />
    <!-- 16 OKR Events -->
    <BaseEventsOkr />
    <!-- 17-20 API 文档表格 -->
    <Attributes />
    <Props />
    <Events />
    <Methods />

    <div class="top-wrapp" title="回到顶部" @click="goTop">↑</div>
  </div>
</template>

<script setup lang="ts">
import Base01 from './components/demos/Base01.vue'
import Base02 from './components/demos/Base02.vue'
import Base03 from './components/demos/Base03.vue'
import Base04 from './components/demos/Base04.vue'
import Base041 from './components/demos/Base041.vue'
import Base05 from './components/demos/Base05.vue'
import Base06 from './components/demos/Base06.vue'
import Base062 from './components/demos/Base062.vue'
import Base061 from './components/demos/Base061.vue'
import Base07 from './components/demos/Base07.vue'
import Base08 from './components/demos/Base08.vue'
import Base081 from './components/demos/Base081.vue'
import BaseFilter from './components/demos/BaseFilter.vue'
import BaseFilterOkr from './components/demos/BaseFilterOkr.vue'
import BaseEvents from './components/demos/BaseEvents.vue'
import BaseEventsOkr from './components/demos/BaseEventsOkr.vue'
import Attributes from './components/api/Attributes.vue'
import Props from './components/api/Props.vue'
import Events from './components/api/Events.vue'
import Methods from './components/api/Methods.vue'

const nav = [
  { id: 'demo-1', text: '基础用法' },
  { id: 'demo-2', text: '水平方向' },
  { id: 'demo-3', text: '节点展开' },
  { id: 'demo-4', text: '全部展开' },
  { id: 'demo-5', text: 'key 展开' },
  { id: 'demo-6', text: '节点样式' },
  { id: 'demo-7', text: '自定义内容' },
  { id: 'demo-8', text: '按钮自定义' },
  { id: 'demo-9', text: '动画' },
  { id: 'demo-10', text: 'OKR 模式' },
  { id: 'demo-11', text: 'OKR 自定义' },
  { id: 'demo-12', text: 'OKR 节点数' },
  { id: 'demo-13', text: 'Filter' },
  { id: 'demo-14', text: 'OKR Filter' },
  { id: 'demo-15', text: 'Events' },
  { id: 'demo-16', text: 'OKR Events' },
  { id: 'api-attributes', text: 'Attributes' },
  { id: 'api-props', text: 'Props' },
  { id: 'api-events', text: 'Events API' },
  { id: 'api-methods', text: 'Methods' },
]

function goTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<style scoped>
.demo-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-size: 13px;
  padding: 12px 16px;
  border: 1px solid #ebebeb;
  border-radius: 4px;
  background: #fafafa;
}
.demo-nav a {
  color: #409eff;
  text-decoration: none;
}
.demo-nav a:hover {
  text-decoration: underline;
}
</style>
