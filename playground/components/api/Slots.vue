<template>
  <ApiTable
    title="Slots"
    anchor="api-slots"
    :columns="slotsSection.columns"
    :rows="slotsSection.rows"
  >
    Vue 3 版新增的插槽。<code>#default</code> 与 <code>render-content</code>、<code
      >#expand-btn</code
    >
    与 <code>node-btn-content</code> 二者任选其一，插槽优先。
  </ApiTable>
</template>

<script setup lang="ts">
import ApiTable from './ApiTable.vue'
import { slotsSection } from '../../../shared/api'
</script>
