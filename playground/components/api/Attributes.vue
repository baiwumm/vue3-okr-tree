<template>
  <ApiTable
    title="Attributes"
    anchor="api-attributes"
    :columns="attributesSection.columns"
    :rows="attributesSection.rows"
  >
    与 vue-okr-tree 完全对齐；<code>align-root</code> 为 Vue 3 版新增。
  </ApiTable>
</template>

<script setup lang="ts">
import ApiTable from './ApiTable.vue'
import { attributesSection } from '../../../shared/api'
</script>
