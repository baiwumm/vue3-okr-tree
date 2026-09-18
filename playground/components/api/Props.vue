<template>
  <ApiTable
    title="Props"
    anchor="api-props"
    :columns="propsSection.columns"
    :rows="propsSection.rows"
  >
    通过 <code>props</code> 属性传入的字段映射配置。
  </ApiTable>
</template>

<script setup lang="ts">
import ApiTable from './ApiTable.vue'
import { propsSection } from '../../../shared/api'
</script>
