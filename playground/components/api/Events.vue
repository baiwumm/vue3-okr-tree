<template>
  <ApiTable
    title="Events"
    anchor="api-events"
    :columns="eventsSection.columns"
    :rows="eventsSection.rows"
  >
    <code>node</code> 均为内部 Node 实例，<code>nodeComponent</code> 为递归节点组件实例。
  </ApiTable>
</template>

<script setup lang="ts">
import ApiTable from './ApiTable.vue'
import { eventsSection } from '../../../shared/api'
</script>
