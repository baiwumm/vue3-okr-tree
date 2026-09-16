<template>
  <div>
    <h3 :id="anchor" class="tree-demo-title-h3">{{ title }}</h3>
    <p v-if="$slots.default"><slot /></p>
    <table>
      <thead>
        <tr>
          <th v-for="col in columns" :key="col">{{ col }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rows" :key="i">
          <td v-for="(cell, j) in row" :key="j" v-html="cell"></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  anchor: string
  columns: string[]
  rows: string[][]
}>()
</script>
