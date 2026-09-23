<template>
  <div>
    <ApiTable title="OkrTreeGroup 与键盘导航" anchor="api-group" :columns="columns" :rows="rows">
      Vue 3 版新增。<code>OkrTreeGroup</code> 包裹多棵 OKR
      模式的树，使组内根节点水平坐标一致（原版需在业务层手动测量 DOM）；需成员树开启
      <code>align-root</code>（默认）。键盘导航为所有树内置。
    </ApiTable>
    <div id="group-demo" class="base-card-wrapper">
      <div class="card-source component-wrapper">
        <p class="group-demo-tip">
          两棵宽度不同的 OKR 树被
          <code>&lt;okr-tree-group&gt;</code> 包裹后根节点对齐（左列线在同一直线上）：
        </p>
        <OkrTreeGroup>
          <VueOkrTree
            :data="treeA"
            :left-data="leftA"
            node-key="id"
            only-both-tree
            direction="horizontal"
            show-collapsable
          />
          <VueOkrTree
            :data="treeB"
            :left-data="leftB"
            node-key="id"
            only-both-tree
            direction="horizontal"
            show-collapsable
          />
        </OkrTreeGroup>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { OkrTreeGroup, VueOkrTree } from 'vue3-okr-tree'
import ApiTable from './ApiTable.vue'
import { groupSection } from '../../../shared/api'

// 与其余五张表一样走 shared/api.ts 单一来源（此前这里是手写副本，改了表不会传导）
const columns = groupSection.columns
const rows = groupSection.rows

const treeA = ref([
  {
    id: 1,
    label: '研发中心',
    children: [
      { id: 11, label: '前端组' },
      { id: 12, label: '后端组' },
    ],
  },
])
const leftA = ref([{ id: 1, label: '研发中心', children: [{ id: 21, label: '左侧 OKR-1' }] }])
const treeB = ref([{ id: 1, label: '产品设计部', children: [{ id: 13, label: '交互设计' }] }])
const leftB = ref([
  {
    id: 1,
    label: '产品设计部',
    children: [
      { id: 22, label: '左侧 OKR-2' },
      { id: 23, label: '左侧 OKR-3' },
    ],
  },
])
</script>

<style scoped>
.group-demo-tip {
  margin: 0 0 8px;
  font-size: 13px;
  color: #909399;
}
</style>
