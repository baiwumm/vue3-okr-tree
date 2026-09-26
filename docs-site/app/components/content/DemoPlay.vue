<script setup lang="ts">
import { computed } from 'vue'
import Base01 from '../../../../playground/components/demos/Base01.vue'
import Base02 from '../../../../playground/components/demos/Base02.vue'
import Base03 from '../../../../playground/components/demos/Base03.vue'
import Base04 from '../../../../playground/components/demos/Base04.vue'
import Base041 from '../../../../playground/components/demos/Base041.vue'
import Base05 from '../../../../playground/components/demos/Base05.vue'
import Base06 from '../../../../playground/components/demos/Base06.vue'
import Base061 from '../../../../playground/components/demos/Base061.vue'
import Base062 from '../../../../playground/components/demos/Base062.vue'
import Base07 from '../../../../playground/components/demos/Base07.vue'
import Base08 from '../../../../playground/components/demos/Base08.vue'
import Base081 from '../../../../playground/components/demos/Base081.vue'
import Base09 from '../../../../playground/components/demos/Base09.vue'
import Base10 from '../../../../playground/components/demos/Base10.vue'
import Base11 from '../../../../playground/components/demos/Base11.vue'
import BaseAccordion from '../../../../playground/components/demos/BaseAccordion.vue'
import BaseCheckbox from '../../../../playground/components/demos/BaseCheckbox.vue'
import BaseConnector from '../../../../playground/components/demos/BaseConnector.vue'
import BaseDraggable from '../../../../playground/components/demos/BaseDraggable.vue'
import BaseEvents from '../../../../playground/components/demos/BaseEvents.vue'
import BaseEventsOkr from '../../../../playground/components/demos/BaseEventsOkr.vue'
import BaseFilter from '../../../../playground/components/demos/BaseFilter.vue'
import BaseFilterOkr from '../../../../playground/components/demos/BaseFilterOkr.vue'
import BaseNodeClick from '../../../../playground/components/demos/BaseNodeClick.vue'

/**
 * Demo 总览页的按名取用入口：MDC 的 props 不支持脚本绑定，
 * 页面用 :demo-play{name="base-01"} 引用 playground 的用例组件（单一来源）。
 * name 是组件文件名的 kebab-case 形式。
 */
const props = defineProps<{ name: keyof typeof demos }>()

const demos = {
  base01: Base01,
  base02: Base02,
  base03: Base03,
  base04: Base04,
  base041: Base041,
  base05: Base05,
  base06: Base06,
  base061: Base061,
  base062: Base062,
  base07: Base07,
  base08: Base08,
  base081: Base081,
  base09: Base09,
  base10: Base10,
  base11: Base11,
  'base-accordion': BaseAccordion,
  'base-checkbox': BaseCheckbox,
  'base-connector': BaseConnector,
  'base-draggable': BaseDraggable,
  'base-events': BaseEvents,
  'base-events-okr': BaseEventsOkr,
  'base-filter': BaseFilter,
  'base-filter-okr': BaseFilterOkr,
  'base-node-click': BaseNodeClick,
}

const demo = computed(() => demos[props.name])
</script>

<template>
  <component :is="demo" v-if="demo" />
  <mark v-else class="demo-play-missing">未知用例：{{ props.name }}</mark>
</template>

<style>
.demo-play-missing {
  color: red;
}
</style>
