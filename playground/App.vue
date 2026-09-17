<template>
  <div class="vue-okr-tree-demo" :class="[themeClass, { 'is-dark-page': theme === 'dark' }]">
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

    <div class="demo-theme-bar">
      <span class="demo-theme-label">主题（<code>theme</code> prop）：</span>
      <button
        v-for="t in themes"
        :key="t.name"
        class="demo-btn"
        :class="{ 'is-active': theme === t.name }"
        :title="t.desc"
        @click="theme = t.name"
      >
        {{ t.name }}
      </button>
      <span class="demo-theme-desc">{{ currentThemeDesc }}</span>
    </div>

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
    <!-- 17 受控状态与方法（1.2.0 新增） -->
    <Base09 />
    <!-- 17-20 API 文档表格 -->
    <Attributes />
    <Props />
    <Events />
    <Methods />
    <Slots />
    <Group />

    <div class="top-wrapp" title="回到顶部" @click="goTop">↑</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
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
import Base09 from './components/demos/Base09.vue'
import Attributes from './components/api/Attributes.vue'
import Props from './components/api/Props.vue'
import Events from './components/api/Events.vue'
import Methods from './components/api/Methods.vue'
import Slots from './components/api/Slots.vue'
import Group from './components/api/Group.vue'

type ThemeName = 'default' | 'feishu' | 'dark' | 'auto' | 'minimal' | 'colorful'
const themes: { name: ThemeName; desc: string }[] = [
  { name: 'default', desc: '与 vue-okr-tree 原版一致：灰线、白卡、直角、轻阴影' },
  { name: 'feishu', desc: '飞书 OKR 观感：圆角 8px、浅灰线、主色 #3370ff 选中态' },
  { name: 'dark', desc: '暗色页面：深底、浅灰线、选中态亮色填充' },
  { name: 'auto', desc: '跟随系统：浅色时同 default，系统暗色时同 dark' },
  { name: 'minimal', desc: '演示 / 打印：无阴影、细边框、小圆角' },
  { name: 'colorful', desc: '按层级着色（data-level），适合组织架构展示' },
]
const theme = ref<ThemeName>('default')
const themeClass = computed(() => (theme.value === 'default' ? '' : `okr-theme-${theme.value}`))
const currentThemeDesc = computed(() => themes.find((t) => t.name === theme.value)?.desc ?? '')

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
  { id: 'demo-17', text: '受控状态与方法' },
  { id: 'api-attributes', text: 'Attributes' },
  { id: 'api-props', text: 'Props' },
  { id: 'api-events', text: 'Events API' },
  { id: 'api-methods', text: 'Methods' },
  { id: 'api-slots', text: 'Slots' },
  { id: 'api-group', text: 'OkrTreeGroup' },
]

function goTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<style scoped>
.demo-theme-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  margin: 12px 0 0;
  padding: 10px 16px;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  color: #606266;
}
.demo-theme-bar .demo-theme-label {
  margin-right: 4px;
}
.demo-theme-bar .demo-btn {
  margin: 0;
}
.demo-theme-bar .demo-theme-desc {
  flex-basis: 100%;
  color: #909399;
  font-size: 12px;
}
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
