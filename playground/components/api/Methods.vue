<template>
  <ApiTable
    title="Methods"
    anchor="api-methods"
    :columns="methodsSection.columns"
    :rows="methodsSection.rows"
  >
    通过组件 <code>ref</code> 调用。增删类方法会同步修改传入的源数据（与 vue-okr-tree 一致）。
  </ApiTable>
</template>

<script setup lang="ts">
import ApiTable from './ApiTable.vue'
import { methodsSection } from '../../../shared/api'
</script>
