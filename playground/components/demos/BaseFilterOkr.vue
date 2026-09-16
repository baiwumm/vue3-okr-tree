<template>
  <div>
    <h3 id="demo-14" class="tree-demo-title-h3">OKR 模式节点过滤(可被展开)</h3>
    <p>OKR 模式下调用 <code>filter</code> 会同时过滤左右两棵子树。</p>
    <BaseCard>
      <template #header>
        <div class="component-wrapper">
          <div class="filter-wrapper">
            <input
              v-model="filterText"
              type="text"
              placeholder="输入关键字进行过滤（如：销售 / 左 / 前端）"
            />
          </div>
          <div class="btns-wrap">
            <button @click="getNodeByData">通过 data 获取销售一部</button>
            <button @click="getNodeById">通过 id 获取销售一部</button>
            <button @click="setCurrentNode">通过 node 设置 销售一部 为选中状态</button>
            <button @click="getCurrentNode">获取当前选中节点</button>
            <button @click="remove">删除产品研发部</button>
            <button @click="append">为销售部门增加新的部门</button>
            <button @click="insertBefore">为销售部之前增加一个总部</button>
            <button @click="insertAfter">为销售部之后增加一个总部</button>
            <button @click="updateKeyChildren">更新销售部子部门</button>
            <button @click="reset">重置数据</button>
          </div>
          <EventLog ref="log" :max="5" />
          <VueOkrTree
            ref="tree"
            :data="testData"
            :left-data="testLeftData"
            only-both-tree
            direction="horizontal"
            show-collapsable
            node-key="id"
            default-expand-all
            current-lable-class-name="crrentClass"
            :filter-node-method="filterNode"
          />
        </div>
      </template>
      <template #description>
        在需要对节点进行过滤时，调用 Tree 实例的 <code>filter</code>
        方法，参数为关键字，OKR 模式下左右子树同时过滤。左右两棵树可以存在相同的
        <code>id</code>（本例根节点 id 均为 1），<code>getNode</code> 等按 key
        查找的方法优先返回右树节点。
      </template>
      <CodeBlock :code="code" />
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { VueOkrTree, type VueOkrTreeInstance } from 'vue3-okr-tree'
import BaseCard from '../BaseCard.vue'
import CodeBlock from '../CodeBlock.vue'
import EventLog from '../EventLog.vue'
import { keyedData, leftData } from '../../data'

const tree = ref<VueOkrTreeInstance | null>(null)
const log = ref<InstanceType<typeof EventLog> | null>(null)
const filterText = ref('')
const testData = ref(keyedData())
const testLeftData = ref(leftData())

const say = (text: string, event = 'method') => log.value?.push(event, text)

watch(filterText, (val) => {
  tree.value?.filter(val)
})

function filterNode(value: string, data: Record<string, any>) {
  if (!value) return true
  return data.label.indexOf(value) !== -1
}
function getNodeById() {
  const node = tree.value!.getNode(7)
  say(node ? `getNode(7) → ${node.data.label}` : 'getNode(7) → null')
}
function getNodeByData() {
  const node = tree.value!.getNode({ id: 7, label: '销售一部' })
  say(node ? `getNode({ id: 7 }) → ${node.data.label}` : 'getNode({ id: 7 }) → null')
}
function setCurrentNode() {
  const node = tree.value!.getNode(7)
  if (!node) return say('销售一部不存在')
  tree.value!.setCurrentNode(node)
  say(`setCurrentNode(node) → 当前 key = ${tree.value!.getCurrentKey()}`)
}
function getCurrentNode() {
  const node = tree.value!.getCurrentNode()
  say(node ? `当前选中的节点是「${node.label}」` : '当前没有选中节点')
}
function remove() {
  const node = tree.value!.getNode(2)
  if (!node) return say('产品研发部已删除')
  tree.value!.remove(node)
  say('remove(产品研发部) 完成')
}
function append() {
  const node = tree.value!.getNode(6)
  if (tree.value!.getNode(10)) return say('销售三部已经存在了，不可再增加')
  tree.value!.append({ id: 10, label: '销售三部' }, node!)
  say('append(销售三部, 销售部) 完成')
}
function insertBefore() {
  const node = tree.value!.getNode(6)
  if (tree.value!.getNode(11)) return say('销售总部已经存在了，不可再增加')
  tree.value!.insertBefore({ id: 11, label: '销售总部' }, node!)
  say('insertBefore(销售总部, 销售部) 完成')
}
function insertAfter() {
  const node = tree.value!.getNode(6)
  if (tree.value!.getNode(11)) return say('销售总部已经存在了，不可再增加')
  tree.value!.insertAfter({ id: 11, label: '销售总部' }, node!)
  say('insertAfter(销售总部, 销售部) 完成')
}
function updateKeyChildren() {
  tree.value!.updateKeyChildren(6, [
    {
      id: 7,
      label: '销售一部',
      children: [
        { id: 1117, label: '销售一部--子一' },
        { id: 1118, label: '销售一部--子二' },
      ],
    },
    { id: 8, label: '销售二部' },
    { id: 77, label: '销售三部' },
  ])
  say('updateKeyChildren(6, [...]) 完成')
}
function reset() {
  testData.value = keyedData()
  testLeftData.value = leftData()
  filterText.value = ''
  say('数据已重置')
}

const code = `
<template>
  <div class="filter-wrapper">
    <input v-model="filterText" placeholder="输入关键字进行过滤" />
  </div>
  <vue-okr-tree
    ref="tree"
    :data="testData"
    :left-data="testLeftData"
    only-both-tree
    direction="horizontal"
    show-collapsable
    node-key="id"
    default-expand-all
    current-lable-class-name="crrentClass"
    :filter-node-method="filterNode"
  />
</template>

<script setup>
import { ref, watch } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'

const tree = ref(null)
const filterText = ref('')
const testData = ref([/* 右树，见 OKR 展示模式 */])
const testLeftData = ref([/* 左树 */])

// OKR 模式下 filter 会同时过滤左右两棵子树
watch(filterText, (val) => tree.value.filter(val))

function filterNode(value, data) {
  if (!value) return true
  return data.label.indexOf(value) !== -1
}
<\/script>
`
</script>
