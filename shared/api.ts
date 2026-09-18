/**
 * API 文档数据单一来源（roadmap 1.5.0 #3「API 表与 README 单一来源」）。
 *
 * 三处消费：
 * - playground/components/api/*.vue（Playground 表格）
 * - docs-site（VitePress API 页，经 ApiDoc 组件渲染）
 * - scripts/gen-readme-api.mjs（生成 README 的 API 段落，node 直接导入本文件）
 *
 * 注意：本文件会被 Node 原生 type-stripping 直接导入，只使用可擦除语法
 * （interface / 类型标注），不要使用 enum / namespace / 装饰器。
 * 单元格中的 <code> / <strong> 为 HTML 片段，表格渲染与 README 生成器分别处理。
 */

export interface ApiSection {
  /** 锚点 id（playground / docs 通用） */
  id: string
  /** 标题 */
  title: string
  /** 表格上方的补充说明（HTML 片段，可为空） */
  intro: string
  columns: string[]
  rows: string[][]
}

export const attributesSection: ApiSection = {
  id: 'api-attributes',
  title: 'Attributes',
  intro: '与 vue-okr-tree 完全对齐；<code>align-root</code> 起为 Vue 3 版新增。',
  columns: ['参数', '说明', '类型', '可选值', '默认值'],
  rows: [
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
    [
      'accordion',
      '<strong>Vue 3 版新增。</strong>手风琴模式：用户展开某节点时自动收起其同级兄弟。与 el-tree 语义一致，只作用于交互展开（点击 +/- 按钮、点击节点内容、键盘操作）；<code>expandNode</code> 等程序化方法与受控 <code>expanded-keys</code> 不受互斥限制',
      'boolean',
      '—',
      'false',
    ],
    [
      'expand-on-click-node',
      '<strong>Vue 3 版新增。</strong>点击节点内容时切换该节点的展开 / 收起（默认 false 保持原版行为）。叶子节点点击只选中不切换；选中态与 <code>node-click</code> 照常触发。OKR 模式根节点点击内容只切换右侧子树',
      'boolean',
      '—',
      'false',
    ],
    [
      'show-checkbox',
      '<strong>Vue 3 版新增（1.9.0）。</strong>复选框选择模式：节点内容前渲染复选框，父子联动半选态（<code>check-strictly</code> 可关闭）。键盘 Space 切换勾选、Enter 选中。OKR 模式左右两树勾选独立维护，方法按 key 对两树同时生效',
      'boolean',
      '—',
      'false',
    ],
    [
      'check-strictly',
      '<strong>Vue 3 版新增（1.9.0）。</strong>父子不联动：勾选只作用于自身，无半选传播（运行时切换后新交互按新模式执行）',
      'boolean',
      '—',
      'false',
    ],
    [
      'default-checked-keys',
      '<strong>Vue 3 版新增（1.9.0）。</strong>初始勾选的节点 key 数组（必须设置 node-key）。创建期生效；运行时变更会先清空再按新列表重新应用；data 重建后不恢复（与 default-expanded-keys 一致）',
      'array',
      '—',
      '—',
    ],
    [
      'show-node-num',
      '折叠时在圆形按钮内显示子节点数（只计未被 <code>filter</code> 隐藏的可见子节点）',
      'boolean',
      '—',
      'false',
    ],
    [
      'default-expand-all',
      '默认展开全部，仅在 show-collapsable 为 true 时有意义',
      'boolean',
      '—',
      'false',
    ],
    [
      'render-content',
      '树节点内容区的渲染 Function。<code>h</code> 由组件从 vue 导入后传入；<code>node</code> 为内部 Node 实例（源数据在 <code>node.data</code>，文本在 <code>node.label</code>），与 element-ui 的 <code>(h, { data })</code> 不同',
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
    [
      'animate',
      '是否开启节点展开的过渡动画。系统开启「减弱动态效果」（<code>prefers-reduced-motion: reduce</code>）时自动按关闭处理',
      'boolean',
      '—',
      'false',
    ],
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
      '<strong>Vue 3 版新增。</strong>内置主题：default / feishu / dark / auto / minimal / colorful，或自定义名字（自行编写 <code>.okr-theme-{name}</code> 变量，名字不在内置清单里会输出开发期警告）。全部外观取值可通过 <code>--okr-*</code> CSS 变量覆盖',
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
      '<strong>Vue 3 版新增（1.4.0）。</strong>懒加载子节点：初始 data 中没有 children（或为空数组）的节点视为未加载，首次展开时调用 <code>load</code>',
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
    [
      'deep-watch',
      '<strong>Vue 3 版新增（1.5.0，创建期生效）。</strong>data 深度侦听开关：默认 true（原地变更触发增量更新）；false 只响应 data 引用变化，超大数据量且不依赖原地变更时降低 watch 开销',
      'boolean',
      '—',
      'true',
    ],
  ],
}

export const propsSection: ApiSection = {
  id: 'api-props',
  title: 'Props（props 属性的字段映射配置）',
  intro: '通过 <code>props</code> 属性传入的字段映射配置。',
  columns: ['参数', '说明', '类型', '默认值'],
  rows: [
    [
      'label',
      '指定节点文本为节点对象的某个属性值，或由函数返回',
      'string / function(data, node)',
      'label',
    ],
    ['children', '指定子树为节点对象的某个属性值', 'string', 'children'],
    [
      'disabled',
      '指定禁用字段（Vue 3 版实现真实禁用：禁用节点带 <code>is-disabled</code> 类，点击不选中、不触发 node-click）',
      'string / function(data, node)',
      'disabled',
    ],
    [
      'isLeaf',
      '指定叶子字段（Vue 3 版新增）：lazy 模式下未加载节点的 isLeaf 取该字段，标记为叶子的节点不显示展开按钮、不触发 load',
      'string / function(data, node)',
      '—',
    ],
  ],
}

export const eventsSection: ApiSection = {
  id: 'api-events',
  title: 'Events',
  intro: '<code>node</code> 均为内部 Node 实例，<code>nodeComponent</code> 为递归节点组件实例。',
  columns: ['事件名称', '说明', '回调参数'],
  rows: [
    ['node-click', '节点被点击时的回调（同时设置当前选中态）', '(data, node, nodeComponent)'],
    ['node-expand', '节点被展开时触发的事件', '(data, node, nodeComponent)'],
    ['node-collapse', '节点被关闭时触发的事件', '(data, node, nodeComponent)'],
    [
      'node-contextmenu',
      '当某一节点被鼠标右键点击时会触发该事件。仅当外部绑定了该事件时才阻止浏览器默认右键菜单',
      '(event, data, node, nodeComponent)',
    ],
    [
      'update:expandedKeys',
      '<strong>Vue 3 版新增。</strong>受控展开态变化时触发（仅传入 expanded-keys 时）',
      '(keys: TreeKey[])',
    ],
    [
      'update:currentKey',
      '<strong>Vue 3 版新增。</strong>受控选中态变化时触发（仅传入 current-key 时）',
      '(key: TreeKey | null)',
    ],
    [
      'check',
      '<strong>Vue 3 版新增（1.9.0）。</strong>复选框被点击时触发（仅 show-checkbox；程序化 setCheckedKeys 不触发）',
      '(data, { checkedNodes, checkedKeys, halfCheckedNodes, halfCheckedKeys })',
    ],
    [
      'check-change',
      '<strong>Vue 3 版新增（1.9.0）。</strong>节点勾选状态变化时触发（仅 show-checkbox；每个受影响节点各触发一次，含联动与 setCheckedKeys 批量变更）',
      '(data, checked, indeterminate)',
    ],
  ],
}

export const methodsSection: ApiSection = {
  id: 'api-methods',
  title: 'Methods（通过 ref 调用）',
  intro:
    '通过组件 <code>ref</code> 调用。增删类方法会同步修改传入的源数据（与 vue-okr-tree 一致）。',
  columns: ['方法名', '说明', '参数'],
  rows: [
    [
      'filter',
      '对树节点进行筛选操作；onlyBothTree 模式下同时过滤左右子树。未设置 filter-node-method 时抛错',
      '(value) 在 filter-node-method 中作为第一个参数',
    ],
    [
      'updateKeyChildren',
      '通过 key 设置节点的子元素，使用此方法必须设置 node-key 属性（缺失抛错）',
      '(key, data) 1. 节点的 key 2. 子节点数据',
    ],
    [
      'getNode',
      '根据 data / key / Node 实例获取内部 Node。OKR 模式下右树优先，右树不存在时回退到左树',
      '(data) 要获得 node 的 key、data 对象或 Node 实例',
    ],
    [
      'setCurrentNode',
      '通过 node 设置某个节点的当前选中状态，必须设置 node-key（缺失抛错）',
      '(node) 待被选节点的 Node 实例',
    ],
    [
      'setCurrentKey',
      '通过 key 设置某个节点的当前选中状态，必须设置 node-key（缺失抛错）',
      '(key) 待被选节点的 key，若为 null 则取消当前高亮',
    ],
    [
      'getCurrentKey',
      '获取当前被选中节点的 key，若没有节点被选中则返回 null。必须设置 node-key（缺失抛错）',
      '—',
    ],
    ['getCurrentNode', '获取当前被选中节点的 data，若没有节点被选中则返回 null', '—'],
    [
      'remove',
      '删除 Tree 中的一个节点，使用此方法必须设置 node-key（未设置时静默无效）。会同步删除源数据中的对应项',
      '(data) 要删除的节点的 data、key 或 Node 实例',
    ],
    [
      'append',
      '为 Tree 中的一个节点追加一个子节点。会同步写入源数据的 children',
      '(data, parentNode) 1. 要追加的子节点的 data 2. 父节点的 data、key 或 Node 实例（省略则追加为根）',
    ],
    [
      'insertBefore',
      '为 Tree 的一个节点的前面增加一个节点。会同步写入源数据',
      '(data, refNode) 1. 要增加的节点的 data 2. 参考节点的 data、key 或 Node 实例',
    ],
    [
      'insertAfter',
      '为 Tree 的一个节点的后面增加一个节点。会同步写入源数据',
      '(data, refNode) 1. 要增加的节点的 data 2. 参考节点的 data、key 或 Node 实例',
    ],
    [
      'expandAll',
      '<strong>Vue 3 版新增。</strong>展开全部节点（OKR 模式含左右两树）；lazy 模式下未加载节点先触发加载、完成后再展开',
      '—',
    ],
    ['collapseAll', '<strong>Vue 3 版新增。</strong>收起全部节点', '—'],
    [
      'expandNode',
      '<strong>Vue 3 版新增。</strong>展开指定节点，默认连同祖先一起展开；OKR 根节点会同时展开左右两侧；lazy 下先加载再展开。返回 Node 或 null',
      '(data, expandParent = true) data 为 key、data 对象或 Node 实例',
    ],
    [
      'collapseNode',
      '<strong>Vue 3 版新增。</strong>收起指定节点；OKR 根节点会同时收起左右两侧',
      '(data)',
    ],
    [
      'scrollToNode',
      '<strong>Vue 3 版新增。</strong>滚动到指定节点：默认先展开其全部祖先使其可见，再 <code>scrollIntoView</code>（居中、平滑）。返回 Promise&lt;boolean&gt;；lazy 下等待路径上的节点加载完成后再滚动',
      '(data, options?) options 为 ScrollIntoViewOptions，另含 <code>expand</code>（默认 true）',
    ],
    [
      'getNodeEl',
      '<strong>Vue 3 版新增（1.4.0）。</strong>按 Node / key / data 获取节点对应的 DOM 元素（OkrTreeViewport 的 centerNode 也基于它定位）',
      '(data)',
    ],
    [
      'getCheckedKeys',
      '<strong>Vue 3 版新增（1.9.0）。</strong>获取勾选节点 key 列表（需 node-key；OKR 模式左右两树合并去重）',
      '(leafOnly = false) leafOnly 为 true 时只计叶子节点',
    ],
    [
      'getCheckedNodes',
      '<strong>Vue 3 版新增（1.9.0）。</strong>获取勾选节点 Node 实例列表',
      '(leafOnly = false)',
    ],
    [
      'setCheckedKeys',
      '<strong>Vue 3 版新增（1.9.0）。</strong>以 key 列表整体设置勾选态（先清空再勾选；非 checkStrictly 时带父子联动，OKR 模式左右同 key 同时生效）',
      '(keys, leafOnly = false)',
    ],
    [
      'getHalfCheckedKeys',
      '<strong>Vue 3 版新增（1.9.0）。</strong>获取半选节点 key 列表（子树部分选中的父节点）',
      '—',
    ],
    [
      'getHalfCheckedNodes',
      '<strong>Vue 3 版新增（1.9.0）。</strong>获取半选节点 Node 实例列表',
      '—',
    ],
    [
      'isChecked',
      '<strong>Vue 3 版新增（1.9.0）。</strong>判断节点当前是否被勾选',
      '(data) key、data 对象或 Node 实例',
    ],
  ],
}

export const slotsSection: ApiSection = {
  id: 'api-slots',
  title: 'Slots',
  intro:
    'Vue 3 版新增的插槽。<code>#default</code> 与 <code>render-content</code>、<code>#expand-btn</code> 与 <code>node-btn-content</code> 二者任选其一，插槽优先。',
  columns: ['插槽名', '说明', '作用域参数'],
  rows: [
    ['default', '节点内容', '<code>{ node, data }</code>，node 为内部 Node 实例'],
    [
      'expand-btn',
      '展开按钮内容；<code>show-node-num</code> 开启时折叠态的数字优先于该插槽',
      '<code>{ node, data, expanded, side, loading }</code>，side 为 <code>right</code>（常规/右子树）或 <code>left</code>（OKR 左子树），loading 为懒加载进行中',
    ],
    ['empty', '<code>data</code> 为空数组时在容器内渲染', '—'],
  ],
}

export const groupSection: ApiSection = {
  id: 'api-group',
  title: 'OkrTreeGroup 与键盘导航',
  intro:
    'Vue 3 版新增。<code>OkrTreeGroup</code> 包裹多棵 OKR 模式的树，使组内根节点水平坐标一致（原版需在业务层手动测量 DOM）；需成员树开启 <code>align-root</code>（默认）。键盘导航为所有树内置。',
  columns: ['名称', '类型', '说明'],
  rows: [
    ['align（prop）', 'boolean，默认 true', '是否对齐；为 false 时各树独立排布'],
    ['default（slot）', '—', '放置若干 <code>&lt;vue-okr-tree only-both-tree&gt;</code>'],
    [
      'refresh()（method）',
      '—',
      '手动重新测量（字体加载完成、外部样式变化等场景；组件已自动响应成员挂载/更新与尺寸变化）',
    ],
    [
      '键盘导航',
      '—',
      'Tab 进入，↑/↓ 在可见节点间移动，→ 展开或进入子节点，← 收起或回到父节点，Enter/Space 选中，Home/End 首尾；OKR 根节点 ← 进入左子树，左树节点镜像。节点带 <code>role=treeitem</code> / <code>aria-expanded</code> / <code>aria-selected</code> / <code>aria-level</code>，焦点环可用 <code>--okr-focus-color</code> / <code>--okr-focus-width</code> 定制',
    ],
  ],
}

/** 全部 API 表（顺序即文档展示顺序） */
export const apiSections: ApiSection[] = [
  attributesSection,
  propsSection,
  eventsSection,
  methodsSection,
  slotsSection,
  groupSection,
]
