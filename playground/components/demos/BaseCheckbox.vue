<template>
  <div>
    <h3 id="demo-checkbox" class="tree-demo-title-h3">复选框选择模式（show-checkbox）</h3>
    <p>节点前渲染复选框，父子联动半选态；可切换 check-strictly 关闭联动。</p>
    <BaseCard>
      <template #header>
        <div class="component-wrapper">
          <div class="demo-checkbox-toolbar">
            <button class="demo-btn" @click="strictly = !strictly">
              check-strictly（父子不联动）：{{ strictly ? '开' : '关' }}
            </button>
            <button class="demo-btn" @click="setChecked">setCheckedKeys([7, 8])</button>
            <button class="demo-btn" @click="logKeys">getCheckedKeys / getHalfCheckedKeys</button>
          </div>
          <EventLog ref="log" />
          <VueOkrTree
            ref="treeRef"
            :data="testData"
            :check-strictly="strictly"
            direction="horizontal"
            show-collapsable
            show-checkbox
            node-key="id"
            :default-checked-keys="[3, 4]"
            @check="handleCheck"
            @check-change="handleCheckChange"
          />
        </div>
      </template>
      <template #description>
        设置 <code>show-checkbox</code> 开启复选框；父子联动半选态，<code>check-strictly</code>
        可关闭联动。<code>check</code> 回调参数为
        <code>(data, { checkedNodes, checkedKeys, halfCheckedNodes, halfCheckedKeys })</code>；<code
          >check-change</code
        >
        在每个状态变化的节点上触发，参数为 <code>(data, checked, indeterminate)</code>。方法
        <code>getCheckedKeys</code> / <code>setCheckedKeys</code> /
        <code>getHalfCheckedKeys</code> / <code>isChecked</code> 通过 ref 调用。OKR
        模式下左右两树勾选独立维护，方法按 key 对两树同时生效。
      </template>
      <CodeBlock :code="code" />
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VueOkrTree, type TreeNodeData, type TreeCheckInfo } from 'vue3-okr-tree'
import BaseCard from '../BaseCard.vue'
import CodeBlock from '../CodeBlock.vue'
import EventLog from '../EventLog.vue'
import { keyedData } from '../../data'

const log = ref<InstanceType<typeof EventLog> | null>(null)
const strictly = ref(false)
const treeRef = ref<InstanceType<typeof VueOkrTree> | null>(null)
const testData = ref(keyedData())

function handleCheck(data: TreeNodeData, info: TreeCheckInfo) {
  log.value?.push(
    'check',
    `「${data.label}」被勾选切换，当前选中 ${info.checkedKeys.length} 个、半选 ${info.halfCheckedKeys.length} 个`
  )
}
function handleCheckChange(data: TreeNodeData, checked: boolean, indeterminate: boolean) {
  log.value?.push(
    'check-change',
    `「${data.label}」→ ${checked ? '已选' : indeterminate ? '半选' : '未选'}`
  )
}
function setChecked() {
  treeRef.value?.setCheckedKeys([7, 8])
  log.value?.push('setCheckedKeys', '勾选 [7, 8]，父节点 6 全选、根 1 半选（联动模式）')
}
function logKeys() {
  const tree = treeRef.value
  if (!tree) return
  log.value?.push(
    'getCheckedKeys',
    `checked=[${tree.getCheckedKeys().join(', ')}] half=[${tree.getHalfCheckedKeys().join(', ')}]`
  )
}

const code = `
<template>
  <vue-okr-tree
    ref="treeRef"
    :data="testData"
    direction="horizontal"
    show-collapsable
    show-checkbox
    node-key="id"
    :default-checked-keys="[3, 4]"
    @check="handleCheck"
    @check-change="handleCheckChange"
  />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'

const treeRef = ref()
const testData = ref([{ id: 1, label: 'xxx科技有有限公司', children: [/* … */] }])

function handleCheck(data, { checkedKeys, halfCheckedKeys }) {
  console.log(checkedKeys, halfCheckedKeys)
}
function handleCheckChange(data, checked, indeterminate) {
  console.log(data.label, checked, indeterminate)
}
// 通过 ref 调用方法
// treeRef.value.setCheckedKeys([7, 8])
// treeRef.value.getCheckedKeys() / getHalfCheckedKeys() / isChecked(key)
<\/script>
`
</script>

<style scoped>
.demo-checkbox-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
</style>
