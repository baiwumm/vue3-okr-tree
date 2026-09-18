<template>
  <ApiTable title="Attributes" anchor="api-attributes" :columns="columns" :rows="rows">
    与 vue-okr-tree 完全对齐；<code>align-root</code> 为 Vue 3 版新增。
  </ApiTable>
</template>

<script setup lang="ts">
import ApiTable from './ApiTable.vue'

const columns = ['参数', '说明', '类型', '可选值', '默认值']
const rows: string[][] = [
  ['data', '展示数据（数组，支持多根）', 'array', '—', '— (必填)'],
  ['direction', '树的展开方向', 'string', 'horizontal / vertical', 'vertical'],
  [
    'onlyBothTree',
    '飞书 OKR 模式：子树在根节点左右两边展开，该模式只有在 <code>direction</code> 为 horizontal 时有效，且必须提供 leftData 数据',
    'boolean',
    '—',
    'false',
  ],
  ['leftData', '展示左子树的数据，仅在 onlyBothTree 模式启用', 'array', '—', '—'],
  [
    'label-width',
    '节点的宽度，默认为自动宽度。number 类型单位 px；string 类型直接作为节点的 style.width',
    'string / number',
    '—',
    'auto',
  ],
  [
    'label-height',
    '节点的高度，默认为自动高度。number 类型单位 px；string 类型直接作为节点的 style.height',
    'string / number',
    '—',
    'auto',
  ],
  [
    'label-class-name',
    '节点 className 的回调方法，也可以使用字符串为所有节点设置固定 className。函数参数为内部 Node 实例（源数据在 <code>node.data</code>）',
    'Function(node) / string',
    '—',
    '—',
  ],
  [
    'current-lable-class-name',
    '当前选中节点的样式（保留原拼写）',
    'Function(node) / string',
    '—',
    '—',
  ],
  [
    'show-collapsable',
    '节点是否可被展开（显示 +/- 圆形按钮）。为 false 时组件强制全部展开',
    'boolean',
    '—',
    'false',
  ],
  ['show-node-num', '折叠时在圆形按钮内显示子节点数', 'boolean', '—', 'false'],
  [
    'default-expand-all',
    '默认展开全部，仅在 show-collapsable 为 true 时有意义',
    'boolean',
    '—',
    'false',
  ],
  [
    'render-content',
    '树节点内容区的渲染函数。<code>h</code> 由组件从 vue 导入后传入；<code>node</code> 为内部 Node 实例（源数据在 <code>node.data</code>，文本在 <code>node.label</code>），与 element-ui 的 <code>(h, { data })</code> 不同',
    'Function(h, node)',
    '—',
    '—',
  ],
  ['node-btn-content', '展开按钮内容渲染函数，参数约定同上', 'Function(h, node)', '—', '—'],
  [
    'node-component',
    '<strong>Vue 3 版新增。</strong>节点内容组件，以 <code>{ node, data }</code> 为 props 渲染。优先级：<code>#default</code> 插槽 &gt; node-component &gt; render-content',
    'Component',
    '—',
    '—',
  ],
  ['props', '配置选项，具体看下表', 'object', '—', '—'],
  ['node-key', '每个树节点用来作为唯一标识的属性，整棵树应该是唯一的', 'string', '—', '—'],
  [
    'default-expanded-keys',
    '默认展开的节点的 key 数组（必须设置 node-key）。OKR 模式下对左右两棵树同时生效',
    'array',
    '—',
    '—',
  ],
  ['current-node-key', '初始选中节点的 key（需 node-key）', 'string / number', '—', '—'],
  [
    'filter-node-method',
    "对树节点进行筛选时执行的方法，返回 true 表示节点可以显示，返回 false 隐藏。调用 <code>filter('')</code> 时同样会执行，需对空值返回 true 以恢复全部显示",
    'Function(value, data, node)',
    '—',
    '—',
  ],
  ['animate', '是否开启节点展开的过渡动画', 'boolean', '—', 'false'],
  [
    'animate-name',
    '过渡动画名称',
    'string',
    'okr-fade-in-linear / okr-fade-in / okr-zoom-in-center / okr-zoom-in-top / okr-zoom-in-bottom / okr-zoom-in-left',
    'okr-zoom-in-center',
  ],
  [
    'animate-duration',
    '过渡动画时长（ms）。原版声明但未生效，Vue 3 版已修复',
    'number',
    '—',
    '200',
  ],
  [
    'align-root',
    '<strong>Vue 3 版新增。</strong>OKR 模式下自动按左右子树对齐根节点（纯 CSS），展开/收起不改变根节点位置；设为 false 恢复原始行为',
    'boolean',
    '—',
    'true',
  ],
  [
    'theme',
    '<strong>Vue 3 版新增。</strong>内置主题：default / feishu / dark / auto / minimal / colorful，或自定义名字（自行编写 <code>.okr-theme-{name}</code> 变量）。全部外观取值可通过 <code>--okr-*</code> CSS 变量覆盖，页面顶部可切换预览',
    'string',
    'default / feishu / dark / auto / minimal / colorful',
    'default',
  ],
  [
    'expanded-keys',
    '<strong>Vue 3 版新增。</strong>受控展开态（支持 <code>v-model:expanded-keys</code>，需 node-key）：传入后列表内节点展开、其余收起；用户点击 +/- 或调用展开/收起方法后触发 <code>update:expandedKeys</code>。未传时为非受控（原版行为）',
    'array',
    '—',
    '—',
  ],
  [
    'current-key',
    '<strong>Vue 3 版新增。</strong>受控选中态（支持 <code>v-model:current-key</code>，需 node-key）：<code>null</code> 表示无选中；点击节点或调用 setCurrentKey / setCurrentNode 后触发 <code>update:currentKey</code>',
    'string / number / null',
    '—',
    '—',
  ],
  [
    'lazy',
    '<strong>Vue 3 版新增（1.4.0）。</strong>懒加载子节点：初始 data 中没有 children（或为空数组）的节点视为未加载，首次展开时调用 <code>load</code>，见「懒加载子节点」用例',
    'boolean',
    '—',
    'false',
  ],
  [
    'load',
    '<strong>Vue 3 版新增（1.4.0）。</strong>懒加载取数函数。<code>resolve(children)</code> 后子节点同步写入源数据 children 并展开；<code>reject()</code> 或抛错时节点回到折叠态、可重试。<code>node.isLeftChild</code> 可区分 OKR 左树节点',
    'Function(node, resolve, reject?)',
    '—',
    '—',
  ],
]
</script>
