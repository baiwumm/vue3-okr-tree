# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## Unreleased

- **新增 `virtual` 虚拟滚动**：同层可见兄弟数 ≥ 50 的行只渲染视口内窗口，DOM 数量与滚动流畅度不再随总数增长（1 父 + 10000 平铺子节点实测渲染节点 10001 → 13）。实现要点：未渲染兄弟的位置由**等尺寸占位块**顶住（float 行总宽与每个渲染节点的坐标和全量渲染逐像素一致），占位块自带连线段续接横线，行首 / 行末的边界帽（`:first-child` / `:last-child` 的去线与圆角）语义由占位块自然继承；展开行的子容器按**宽度模型**显式定宽（float 的 shrink-to-fit 取 `min(max(min-content, 可用宽), max-content)`，单个巨宽占位块会把容器钉在 min-content 上、把渲染节点挤到第二行折断连线）；折叠行不渲染占位块，折叠宽度与全量渲染一致。aria（`aria-setsize` / `aria-posinset`）、`show-node-num` 计数、`getVisibleNodes()` 全部按全量可见列表输出；`scrollToNode` 与键盘漫游对窗口外目标**先揭示再定位**（逐条推进不跳焦）。要求数字型 `label-width`（horizontal 布局还要求 `label-height`），auto 尺寸下达标行退回全量渲染并警告；创建期快照，运行时变更输出警告。已知边界：万级数据首帧成本主要在 **store 构建**（1 万节点约 2.9s，与 virtual 无关、全量渲染同样存在），virtual 消除的是 DOM 数量与滚动 / 展开时的渲染卡顿；压缩后产物 +2.1 kB gzip（ESM / UMD 预算上调至 21 kB）。姊妹包 react-okr-tree 同批同形。

## 1.15.0（2026-09-26）

一个功能 minor：**Vue Devtools 面板**（dev only，roadmap #16 最后一项，做完 #16 整项清空）与 **`DEFAULT_PROPS` 导出补齐**（两仓导出面最后一个不对称清零）。两项都是纯增量，无任何行为变化。姊妹包 react-okr-tree 同号跟随（`DEFAULT_PROPS` 侧早已导出、Devtools 面板无对等物，详见其 CHANGELOG）。

- **新增 Vue Devtools 面板（dev only）**：开发环境自动向 Vue Devtools 注册 **OkrTree** 面板——树实例列表（根节点文案 + 注册表节点数 tag，OKR 模式带标记）、概要（节点数 / 展开数 / 当前节点 / 勾选与半选计数）与右树 / 左树的**节点注册表全量转储**（文案 / 层级 / 展开 / 可见 / 勾选 / 半选 / 子节点数），数据按需拉取、不占渲染路径。实现**零依赖**：不引 `@vue/devtools-api`，直接按其 v6 线协议与 `window.__VUE_DEVTOOLS_GLOBAL_HOOK__` 握手（`devtools-plugin:setup` 事件与 `__VUE_DEVTOOLS_PLUGINS__` 排队条目形状逐字同源，api 由 Devtools 后端回调传入）。门控与开发期警告同一套（运行时 `process.env.NODE_ENV`，使用方打包器替换后整段消除，SSR 与无 `process` 的 UMD 场景视为生产环境不注册）——**npm 产物增大约 1.5 kB gzip（ESM 16.31 → 17.81 / 预算 19），不会进入消费方的生产包**，与 Pinia / Vue Router 内置 Devtools 集成同一模型。姊妹包 react-okr-tree 无对应物（React DevTools 不提供第三方自定义面板 API）。
- **补导出 `DEFAULT_PROPS`**：字段映射的默认值常量（`{ children: 'children', label: 'label', disabled: 'disabled' }`）此前只在内部使用，而姊妹包 react-okr-tree 侧已导出——这是两仓导出面审计记录的最后一个不对称，本次清零。宿主自定义字段映射时可以 `{ ...DEFAULT_PROPS, label: 'name' }` 而不必写全所有字段。纯增量，无任何行为变化。

## 1.14.2（2026-09-25）

四条修复的一批：Demo 交互层批次（G8）实测出来的三处库语义缺口 + 一处画布交互卡死。对外 API 形状零变化，按「修复 +1 patch」定档。**其中 `default-checked-keys` 一条改的是可观察行为**（运行时重放的判据从按引用改成按内容），唯一会感知到差异的用法是「传一个等值新数组来强制清空勾选」——那等于依赖每次渲染回滚用户操作，故仍按 patch 走，但如果你确实这么写，请改用 `setCheckedKeys()`。姊妹包 react-okr-tree 同号跟随。

### 修复

- **`node-drag-end` 在成功放置后不再报 null 载荷**：`handleDrop` 先清掉 `dragOverNode` / `dragOverType`（指示线不能留在屏幕上），而 `node-drag-end` 是 drop 之后才派发的，于是这条事件的 `dropNode` / `dropType` 恒为 null——文档站的拖拽用例每次成功拖动都记一句「未完成放置」。现在改为**在 drop 里就地发出 `node-drag-end` 并收尾手势**（同时清 `draggingNode`，让真到达的那次 dragend 被守卫短路，不会补一条重复事件），载荷与 `node-drop` 一致；取消或被拒的拖拽仍按语义报 null。选这条路线而不是「在 dragend 里读落点备份」：跨父级移动会把源元素卸载重建，浏览器那次 dragend 落在已脱离文档的节点上，宿主侧收不到（react 侧正是这种形态）。
- **过滤词只命中 OKR 左子树时，整棵树不再从 DOM 消失**：共用的根节点自身不匹配、右树侧零命中时被判不可见，而节点根元素是 `v-if="node.visible"`——刚命中的左子树跟着被卸载，页面空掉（`getVisibleNodes()` 读 0）。Q1「父节点保持可见」当年只修通了右树这一侧；现在左树命中也会把根保住（OKR 下 `filter` 先右后左的调用顺序是承重的，已写进注释）。
- **`default-checked-keys` 运行时按内容比较，不再按引用重放**：宿主每次渲染新建一个等值数组（计算属性、漏了 `useMemo` 的派生表达式都会这样），原先被当成「默认勾选变了」，先清空全部勾选再重放列表，把用户刚勾掉的、刚勾上的整片抹回去。现在只有列表**内容**真的变了才重放（`String(key)` 归一去重后比对，与 `getCheckedKeys` 同口径），`undefined` 与 `[]` 视作同一份「没有默认勾选」。API 表与文档站措辞同步更正。
- **画布平移把手势甩出画布边界再松手，会卡住平移态并让悬停继续拖动画布**：`OkrTreeViewport` 的 `pointerup` / `pointercancel` 只挂在画布根元素上（既没有 `setPointerCapture`，也没有 window 级监听），指针在画布外松开时这两个处理器根本不执行——`is-panning` 留在原地、`panStart` 也不清，于是之后**不带按键**的悬停移动仍按 `panStart` 继续改写偏移（实测从 `translate(125px, -379.5px)` 一路走到 `translate(290px, 0px)`）。现在由一个挂载期注册、卸载时摘掉的常驻 window 监听收尾（常驻而不是按次添加，免得 1.14.1 修掉的监听堆叠换个形式回来）；这条收尾**不**武装「吞掉一次 click」——松手在画布外时浏览器不会在画布里派发那次 click，武装了就会吃掉用户回到画布里的第一次正常点击。姊妹包 react-okr-tree 同批同形。

## 1.14.1（2026-09-24）

对外 API 零变化的一批：修掉 7 个真实缺陷（组对齐宽度被首量钉死、`contains` 未递归左子树导致可成环、换绑 `data` 把整棵后代摘出注册表、`zoomIn` / `zoomOut` 锚点取错、平移后吞点击堆积监听、产物丢失三家打包器的 ignore 注释、`connector="svg"` 稳态自持重排），另有 3 项性能收敛、10 条门禁补强与两站文档对齐。姊妹包 react-okr-tree 同号跟随。

### 性能

- **`aria-setsize` / `aria-posinset` 改为按层算一次下发**：旧实现是每个节点一个 computed，各自读 `parent.childNodes` 做 `filter` + `indexOf` ⇒ 同层 s 个节点扫两遍、O(s²)。新增 `src/lib/okr-tree/aria-set.ts` 的 `setPositions(list)`，由父节点（含根层的 `OkrTree`）在渲染子列表时算好 `{size,pos}` 作为 props 传下去；不可见节点仍不输出这两个属性（props 为 `undefined`），左右两树各自成组，口径与旧实现一致。react 侧本就是父下发形状，同批把其 `map` 内的 `indexOf` 换成同一套单遍计算。
- **复选框一次点击从 4 次全树遍历降到 1 次**：`check` 事件的 payload 原先由 `getCheckedNodes()` / `getCheckedKeys()` / `getHalfCheckedNodes()` / `getHalfCheckedKeys()` 四次调用拼成，而两个 key 版内部各自还要再调一次节点版 ⇒ 一次点击要走 4 遍全树（含整棵 OKR 左树）。新增 `collectCheckState(leafOnly)` 一次遍历算齐四份，四个公开方法原样保留。语义逐字不变：`String(key)` 去重、遍历顺序、跳过空 key、checked 的节点不进半选列表。
- **同层整批换引用时 `updateChildren` 的 key 回退降为线性**：回退原本是 `oldNodes.find(n => !used.has(n) && n.key === k)`，同层 s 项全部换引用时第 i 项平均要扫 i 次 ⇒ 该层退化到 O(s²)。现改成一次建好的 `Map<key, TreeNode[]>` 索引。实测（把 `key` getter 包住计数）：`s=3200` 整轮换引用时 key 访问 **16,005 次（=5s）**，而旧实现按公式是 **5,121,600 次（s(s+1)/2）**，`setData` 耗时从 35.9ms 降到 15.0ms。两处语义刻意保住——键不做 `String` 归一（原判断是 `===`，`11` 与 `'11'` 不该互配）、桶存数组而非单值（同层重复 key 时第二项要能命中第二个旧节点），各有一条用例钉住，换成朴素的 `Map<string, TreeNode>` 就当场红。

### 修复

- **`zoomIn` / `zoomOut` 的锚点改用可视区尺寸**：原先取 `getBoundingClientRect().width / 2`，而 `fitToScreen` 与 react 侧都取 `clientWidth / 2`——视口内出现滚动条时两者相差半条滚动条宽，同一个包的两条路径与姊妹包之间会各偏一点。现统一走新增的 `viewportCenter()`（`clientWidth / clientHeight`），与 react 侧的 `center()` 同形。
- **`contains` 把 OKR 左子树算进子树范围**：`moveNode` 的自环硬守卫与 `dropValid` 都靠 `TreeStore.contains()` 回答「目标是不是被拖节点的后代」，但它只递归 `childNodes`，而 OKR 左子树挂在 `leftChildNodes` 上——于是 `moveNode(OKR 根, 其左子树内的节点, 'inner')` 放行，根与左子树互相指向，`getVisibleNodes` 这类同时走两侧的遍历不再收敛。现一并递归 `leftChildNodes`；同时钉一条「右树节点仍可移进左子树」的用例，防止把 `reassignSide` 那条合法的跨侧路径一起堵死。
- **`connector="svg"` 稳态不再自持重排**：`redrawConnectors` 结尾原先无条件把新数组写进 `connectorEdges`，于是「写 ref → 重渲染 → `onUpdated` 再排一帧 → 再写」闭成环——空载页面也以每秒一帧的节奏重排全树、逐节点读一遍 `getBoundingClientRect`（react 版实测同规模约 10,400 次/秒）。现改为逐条比对 `d`，完全相同就保持原引用，与 react 版的 `sameEdges` 短路同形。**顺带补上这条环原先兜着的缺口**：`onUpdated` 其实指望不上——节点的 `expanded` 只被 `OkrTreeNode` 读，父组件不重渲染就不触发它，所以展开态变更改走新增的 `onExpansionChanged()`（同步受控 keys + 显式排一帧重绘），同时覆盖节点点击与 `expandNode` / `collapseNode` 两条路径；实测空闲 12 帧之后再收起节点，实体边仍会正确替换成收起残枝。
- **换绑 data 引用不再把整棵后代摘出注册表**：`data` 数组引用保持不变、只把某一层对象换成同 key 的新对象（轮询接口的典型局部更新）时，`TreeNode.updateChildren()` 的换绑分支原先调递归版 `store.deregisterNode()`——它连带删掉该节点全部后代在 `nodesMap` 里的登记，而复用路径不会重新登记，于是这些后代的 `getNode` / `getNodePath` / `setCurrentKey` / `remove` / `moveNode` 等按 key 的公开方法一律静默失效，而节点仍照常渲染、仍可点击。改用新增的 `deregisterNodeSelf()`（只摘本节点）：该分支的匹配条件本就是 key 相等，后代的实例与 key 都没变，留在注册表里才是正确状态；真正被移除的节点仍由尾部注销循环递归清理。姊妹包 react-okr-tree 同批同形修复。
- **平移后吞点击不再往视口元素上堆监听**：`handlePointerUp` 原先每次平移结束都 `addEventListener('click', …, { capture: true, once: true })`，而触摸平移压根不派发 click——监听于是按平移次数累积挂在元素上，直到某一次真出现 click 才被一次性摘掉（组件卸载时仍挂着）。现改记一个 `swallowNextClick` 标志，由模板上常驻的 `@click.capture` 处理判断并消费；对外语义与改动前逐字一致（平移后紧跟的那一次 click 被吞，第二次照常送到节点），只是不再残留注册。两条新用例分别钉「吞一次且只吞一次」与「平移过程中元素上 `click` 注册数为 0」——把实现还原成 once 监听、或把标志赋值摘掉，各打红其中一条。与姊妹包 react-okr-tree 同批同形。
- **产物真的保住 html-to-image 的三条 ignore 注释（并把压缩器换成 Terser）**：可选 peer 靠「变量说明符的动态 import」避开打包，但消费者的打包器只认**注释**——`@vite-ignore` 管 Vite/Rollup，Next 16 的 Turbopack 只认 `webpackIgnore` / `turbopackIgnore`，缺了就是下游**构建期** Module not found（本包能发出去、对面装不上；文档站是第一个撞上的真实消费者）。此前源码只有 `@vite-ignore` 一条，而且就算补齐也没用：`scripts/post-build.mjs` 会用 esbuild 把 ES 产物补压一次，连注释一起吃掉。实测 esbuild 四档压缩（`minifyWhitespace` 单开 / `legalComments: 'inline'` / 把注释写成 legal 形态 / 全量压缩）**没有一档保留**这三条。现改 `build.minify: 'terser'` + `format.comments: /vite-ignore|webpackIgnore|turbopackIgnore/`，并删掉 post-build 那道补压（顺带 ES 的 `.map` 不再被删，与产物行号对齐）。体积不升反降：ESM gzip 16.77 → **16.12 kB**、UMD 16.64 → **16.23 kB**（Terser 比 esbuild 更小），三项预算余量一起变宽。`scripts/verify-dist.mjs` 补 7 条门禁：ESM / `.cjs` / `.umd` 各断「未静态引入可选 peer」+「三条注释齐全」，另断 ESM 仍有 `import(` 调用点——verify:dist 34 → **41** 条。回归验证（把历史形态装回去）：重新加上 post-build 的 esbuild 补压后，门禁当场红 `FAILED: ESM 保留可选 peer 的三家打包器 ignore 注释`。新增 devDependency `terser`。

- **组对齐宽度不再被首量钉死（`is-measuring` 此前从未落到 DOM 上）**：`OkrTreeGroup.measure()` 原先在同一个同步块里「`measuring = true` → 读 rect → `false`」，而这个类是绑在响应式状态上的、DOM 要到下一个 tick 才更新，于是临时测量态压根没生效，读到的一直是当前分配宽度；偏偏 `.is-measured` 又把左容器宽度钉成 `var(--okr-group-left-width)`，结果**首量之后再也涨不上去**——实测 320px 容器里首量得 140px，放宽到 1280px 仍是 140px；组里先放一棵窄树、再加入一棵左子树宽得多的成员，var 仍停在首量值（`refresh()` 走同一条 measure，救不了）。现改为测量期间直接操作 DOM `classList`：摘 `is-measured` → 加 `is-measuring` → 读 → 复原。两条缺一不可：只加不摘等于没加，因为 `style.css` 里 `.is-measured` 的钉宽规则排在 `.is-measuring` 的 `max-content` **之后**且特异度相同（这条是踩出来的——先只做「加类」时新增的浏览器用例在变异下仍然全绿）。刻意不走 `await nextTick()`：那会让测量跨帧，真被渲染出来的测量态触发一次组件更新 → 子树 `onUpdated` 再请求测量，容易绕回自持环；同步 add → 读（读 rect 自带强制布局）→ 复原全程在一个任务内，浏览器不会绘制中间态，也不闪。回归两条：`a11y-group.spec.ts` 的测量用例新增「读 rect 那一刻 `is-measuring` 必须在 DOM 上」（摘掉类操作 → `expected [false, false] to equal [true, true]`）；新增浏览器级 `tests/visual/group-align.spec.ts` 断「后加入更宽成员时对齐宽度要涨」（同一变异当场红）。视觉基线 17 → 18 条全过、无需重拍。与姊妹包 react-okr-tree 同批同形。

### 工程化（无对外行为变更）

- **CSS 几何常量钉进 `verify:dist`（与 react 侧 G17 同批同形）**：连接线的几何值全是相互咬合的硬编码，改一个就错位，而组件层没有任何断言能发现它。新增 **21** 条断言：六个变量（`--okr-gap-level:20px` / `--okr-gap-sibling:5px` / `--okr-line-width:1px` / `--okr-line-radius:5px` / `--okr-btn-size:20px` / `--okr-gap-node-y:10px`）各断「每处使用都带兜底」+「兜底值处处同值」；左子树短头 `width:12px` / `height:10px` / `left:calc(100% - 11px)` 与两处 `-1px` / `!important` 修正各断**恰好出现一次**（两次＝有人复制规则没删原件，同特异度下后者说了算）；`okr-unstyled` 的中和规则断为**五类**选择器且基础 + `:hover` 共两处；再断 `.is-measuring` 排在 `.is-measured` **之前**——组对齐修复的承重前提正是这条同特异度顺序，颠倒之后 `measure()` 无论怎么改都会读回被钉住的宽度。匹配前先归一两种形态：声明体抹掉全部空白（绕开压缩器「逗号后有无空格」的差异），选择器只把空白折成单空格（`.a b` 压成 `.ab` 就走形了）。**顺带说明为什么不做「两仓 CSS 逐字 diff」**：两仓 `src` 的 style.css 实测只差头注释与 `@import` 路径两处、`transition.css` 全等，但产物由两套压缩器各写一遍（本仓 esbuild、react 走 rolldown 内置那套），会合并同声明体的相邻规则、重排声明、`transparent`→`0 0`、`.3s height`→`height .3s`、颜色折成 `#fffffff0`，逐字比必然假红。五条变异在两仓各跑一遍、全部打红（兜底值 `20px→24px`、规则顺序颠倒、五类降四类、`-11px→-12px`、`12px→14px`）。CSS 段现两端各 33 条、逐条同序同字面（此前两端各缺一条：本仓少「含打印与减弱动效块」、react 少「连接线颜色无残留硬编码」，现已补齐）。`verify:dist` 41 → **62** 条 ok。
- **缺 node-key 的受控 prop 警告族补齐三条断言（与 react 侧 G4 同批同形）**：`OkrTree.vue:312-321` 有四条「需要同时设置 node-key」的开发期警告，`controlled.spec.ts` 此前只在一次 pooled 断言里命中了 `expanded-keys` 与 `current-key` 两条文案，`default-expanded-keys` / `default-checked-keys` 两支**从未被断过**，`currentNodeKey` 那一支也只是顺带过的——它的消息写着「current-key / current-node-key」，只传 `currentNodeKey` 时靠子串也能命中，把源码里的 `|| props.currentNodeKey !== undefined` 摘掉都不会红。现新增一条用例：三个 prop 各单独挂载一次、每次都断「这一次的消息集合」，另加一条反向守卫（补齐 node-key 后三条都不许出现）。反向守卫一开始是**永真**的：`warn()` 默认按文案去重，第四次挂载前没清表，消息被前三次吃掉，实测把 `if (!props.nodeKey)` 改成无条件警告后这条守卫照样绿（红的只是文件里另一条老用例）——现每次挂载前 `resetWarnings()`，改无条件后两条用例一起红。三条变异全部实测只红新用例（驱动 `_scratch/probe-warn-mutation.mjs`，自带未变异基线、锚点存在性自检与 finally 还原）。单测 257 → **258** 条。
- **受控锁定态补用例（与 react 侧 G8 同批同形）**：requirements 与第 1 轮报告都把「传值但不传回调」写成一种**锁定**，react 侧给的判据是「点 +/- 后断言视图不变」。**照写会得到一条红用例**——本包实测并不冻结视图：展开态的渲染源是 store，`expanded-keys` 只在创建期与宿主传入值变化时回灌，宿主不回写就没有第二次同步，点击照常折叠（react 侧同样三种写法逐字测过，结论一致，所以这不是复刻偏差而是两仓共同语义）。现按真实语义钉两条：① 只传 prop 不接 `update:expanded-keys` → 不报错不警告、点击生效；② 接了监听但监听什么都不做 → 监听照样收到新值（收起根节点即 `[]`）、视图不被拉回。三条变异验证判据有牙：V1 摘掉 emit 红 ②；V2 在 emit 后以 prop 为准 `setExpandedKeys` 拉回（＝真冻结）红这两条；V3 去掉 node-key 守卫让锁定态也警告红 ①。**V3 一开始是白断的**：`warn()` 按文案去重、去重表是模块级的，本文件前面的用例已经把那条文案发掉，不自己 `resetWarnings()` 的话 `not.toHaveBeenCalled()` 恒真（实测改无条件警告时它照样绿）。单测 258 → **260** 条。
- **拖拽悬停的 DOM 写入落点判据（与 react 侧 G9 同批）**：「拖拽指示只更新相关节点」这句承诺两仓都只是实现、没有断言——把 `handleDragEnter` 改成顺手写 `dragOverNode`、`dragend` 不清指示、或给每个 label 都挂一个「正在拖拽」的类，`draggable.spec.ts` 的 11 条功能用例照样全绿。新增 `tests/components/local-update.spec.ts`（与 react 同名文件对称），用 `MutationObserver` 按事件顺序断「被写了 class 的元素」恰好是谁：dragstart 0 处 → 首次悬停 1 处（`label:branch-1#drop-inner`）→ 同节点同分区重复 dragover 0 处 → 换目标 2 处（旧 label 清空 + 新 label 挂上）→ 同节点换分区 1 处 → dragEnter 0 处 → dragend 1 处。**判据落点与 react 不同是机制决定的，不是偷懒**：react 每个节点订阅自己的版本号，断「谁被 bump」；本包的 `dragOverNode` 是 `OkrTree.vue` provide 下来的 `shallowRef`，18 个节点的 `labelWrapperClass` 都读它，实测换一次目标全部重新求值（计数探针 `_scratch/probe-recompute-count.mjs`），但只有值真变了的 2 个元素被写入 DOM——所以这里钉的是 DOM 写入落点。五条变异逐个跑过、全部只红这条（摘 dragend 的清理 / dragEnter 顺手挂指示 / dragstart 就标成放置目标 / 全员加 `is-hovered` / 把 `drop-*` 从 label 外层挪到节点元素上；驱动 `_scratch/probe-drag-mutation-vue3.mjs`，自带基线绿跑、锚点唯一性自检与 finally 还原）。**踩到一条 jsdom 陷阱**：`MutationObserver` 的回调按**微任务**派发，`await nextTick()` 之后直接 `takeRecords()` 会在「回调已经把记录取走」与「回调还没跑」之间随机拿到空数组——第一版探针因此把整棵树的 class 写入读成 0 条，看着像「实现本来就局部」的假绿。现收记录前先等一个宏任务边界，回调数组与 `takeRecords()` 两边都取。单测 260 → **261** 条。
- **OKR 根卡片「展开 / 收起不被推位」补几何断言（与 react 侧 G14 同批）**：`align-root` 的全部作用就是这一句，此前只有那条 CSS、`align-root` 类名与两张展开态的像素基线，收起这个动作序列本身没有几何断言守着。`tests/visual/visual.spec.ts` 新增一条：对 `#demo-10` 第一棵树的根卡片量 `getBoundingClientRect()`，右子树收起 → 重新展开 → 左子树收起 → 重新展开，四次 `toBeCloseTo(x, 0)` + 两次宽度比对，每步同时断 `-children` / `-left-children` 上 `is-hidden` 的确切出现与消失（否则「坐标没变」可能只是按钮没生效）。**量的是相对 `.org-chart-container` 的水平偏移而不是绝对 `left`**：点击时 Playwright 会把目标滚进视口，绝对坐标跟着滚动位置走（react 侧实测同一动作让绝对 `left` 从 962 跳到 591），拿绝对坐标只会得到一条与几何无关的红。**只加断言、没加截图基线**（png 仍是 28 张，视觉用例 18 → **19** 条）。本仓配置没有 react 那句 `reducedMotion: 'reduce'`，收起仍走 200ms 过渡（`animate-duration` 默认值），故每次切换后等 320ms 再量，避免一条只在机器慢时才红的用例。三条变异改的是 `playground/dist` 那份产物 CSS（gitignored，跑完逐字还原），射程按实测记：给 `.is-hidden` 追加 `display:none` → 本条红、两张 OKR 像素基线也红；`flex:1 1 0` → `0 0 auto` 与根节点 `width:100%` → `auto` → 本条与两张基线**都绿**，是 `group-align.spec.ts` 把它们打红的。即这条守的是「收起不推根节点」，不是 `align-root` 的静态形状。与姊妹包 react-okr-tree 同批同形。
- **焦点环补计算样式断言（与 react 侧 G13 的不依赖像素那一半同批）**：环此前只有类名与人眼看图，视觉套件里没有任何计算样式断言守着。新增一条：`page.keyboard.press('Tab')` 循环走到第一个 `.org-chart-node`（上限 80 次，走不到即判失败——否则后面的环断言全在空转），断该节点卡片本体的计算 `outlineStyle='solid'` / `outlineWidth='2px'` / 颜色非透明，并断焦点元素自身 `outlineStyle='none'`。**读的元素不是聚焦元素**：`style.css:686-695` 把 `.org-chart-node:focus` 清成 `outline: none`，真正的环挂在 `.org-chart-node:focus-visible > .org-chart-node-label > .org-chart-node-label-inner`，姊妹包探针实测读聚焦元素拿到的是 `none`，照直觉写会得到一条假红。四条变异两仓各跑一遍、全部打红：整条 `outline:none`、环宽兜底 `2px→0px`、**去掉 `:focus-visible` 限定让环常驻**（这条反自证——前三条断言它照样全绿，只有「Tab 走开之后环必须收掉」抓得住它）、把环挪回焦点元素自己身上。变异改的是 `playground/dist` 里的打包 CSS（gitignored，跑完逐字还原）；两份产物都没定义 `--okr-focus-width`，所以兜底值就是实际生效值，改它确实改渲染。视觉用例 19 → **20** 条，png 仍 28 张。
- **UMD 在真实浏览器 `<script>` 环境里挂载一次（收口本仓 G9）**：`verify:dist` 那三条只证明「UMD 能被 Node 执行 + 导出面对」，走的是 `require` / module 分支；**浏览器分支从来没被真实加载执行过**——依赖从全局 `window.Vue` 取、导出挂到 `window.VueOkrTree`、随包的 `dist/style.css` 是否真的能生效、挂载期排队的 rAF 与 ResizeObserver，都不在 Node 那条路径上，而文档站的 CDN 用法页整篇建立在这条路径上。新增 `tests/visual/umd.spec.ts`：`setContent` 内联 `dist/style.css`，再按序 `addScriptTag({ content })` 注入 `node_modules/vue/dist/vue.global.prod.js` 与 `dist/vue3-okr-tree.umd.js`，挂一棵 `connector="svg"` 的树，断具名导出含 `OkrTree` / `OkrTreeGroup` / `BUILT_IN_THEMES`、`[role="tree"]` 一个、`[role="treeitem"]` 与卡片各 4 个、`.okr-connector-svg path` 计数 > 0 且没有一条 `d` 是空串、`pageerror` 与 `console.error` 为空。**「CSS 生效」用一条确定的计算值取证**：主题选 feishu（它声明 `--okr-node-radius: 8px`），断卡片 `border-radius` 恰为 `8px`——注入 `<style>` 这件事本身不可信，渲染出来的值才可信。盒子尺寸显式钉 `labelWidth:200 / labelHeight:60`：默认的 `auto` 下卡片宽高由文字度量决定，换机器（Windows 开发机 ↔ Linux CI）字体不同，`d` 就会莫名红（同一处理由姊妹包的跨实现夹具先踩过）。缺产物判失败而不是 `test.skip`——visual.yml 在 `test:visual` 前有 `pnpm build`，skip 会让这条在漏了构建的步骤里安静消失，正好丢掉它要防的那类回归。五条变异改的是 **UMD 产物本身**（`dist/` gitignored，跑完逐字还原）：浏览器全局导出名改掉、具名 `OkrTree` 丢失（只剩 default）、`role="treeitem"` 改名、`.okr-connector-svg` 类名改掉、把 `dist/style.css` 挪走——五体全部以断言失败打红（驱动 `_scratch/probe-umd-mutation-vue3.mjs`）。视觉套件 20 → **21** 条，png 仍 28 张。姊妹包 react-okr-tree 的 UMD 仍只有 Node 层门禁（`verify:dist` 的 G10）加真实浏览器加载 **vue3** 产物的夹具脚本，本条是它没有的形态，未强行同形。
- **两种锁定强度实测分离并补三条用例（收口 G10）**：react 文档站受控页写着「`expandedKeys` 写成每次渲染新建的数组字面量 → 完全锁定；引用稳定的数组 → 交互结果保留到 prop 真的变化为止」，上一批想验没验成——宿主重渲染时 `data={makeData()}` 同时也换了引用，走整树重建那条路，两个分支的观测结果逐字相同（正是被整树重建主导的那种「相同」）。把 `data` 提成稳定引用后重测，**说法成立**，三条分支实测为：① 内联字面量 ⇒ 点完收起、宿主一重渲染就被拉回展开；② 引用稳定的普通数组 ⇒ 折叠结果保留，**原地 push 内容不算变化**（非响应式数组没有任何东西可通知 Vue，watcher 的 `deep: true` 挂不上依赖）；③ 数组由 `ref` 包着（响应式）⇒ 原地 push **算**变化、照样回灌。所以“变化”实际等价于「换引用，或由 `ref` 包着的数组改内容」。变异三条：摘掉受控 watcher（三条新用例全红，原有两条「不回写即不冻结」的用例保持绿）、摘 `deep: true`（只红第 ③ 条，那正是这个选项目的）、加一条「每次 `onUpdated` 无条件按 prop 回灌」——**第三条打不红，而且是结构性的**：prop 引用没变时子组件根本不被更新，库内任何生命周期钩子都轮不到执行，所以第 ② 条不是某行代码写对了，而是 Vue 的 prop 比较 + 更新跳过共同保证的（react 那边同一条变异可构造：把 `useEffect` 依赖换成 `[...expandedKeys]` 就按内容比，实测打红；驱动 `_scratch/probe-locked2-vue3.mjs` / `probe-locked2-react.mjs`）。姊妹包同批同测、观测逐字一致。本包文档没有这条表述，只补用例与 acceptance 结论，未改任何对外措辞。单测 261 → **264** 条。

- **补 `tests/components/okr-left-structure.spec.ts`**：OKR 左树顶层的 `remove` / `append` / `insertBefore` 三条 DOM 断言，与 react-okr-tree 同形。本包侧本就共用 `leftRoot.childNodes` 引用，三条用例不改一行源码直接通过——它是姊妹包修该缺陷时的基线，也反向证明这组断言测的是真行为。
- **稳态计数用例补「探针确实响过」的前置断言**：`tests/components/connector.spec.ts` 那条「静置 8 帧 rect 增量为 0」原先只断增量，探针若挂错地方就会以 `0 - 0 === 0` 假绿。现先断挂载后计数 `> 0`（实测此处为 10）。这条不是理论担忧——姊妹包 react-okr-tree 补同形用例时，同一种自增计数器在那边**一步都不动**：它的 `stubCards` 会对每个卡片做实例级 `vi.spyOn(el, 'getBoundingClientRect')`，而该方法在元素上是继承来的，实例级 spy 会把原型层那个 mock 的自定义实现作废（`mock.calls` 仍增长），那边只能改数 `spy.mock.calls.length`。两边写法看着同形，能响的东西并不相同。把桩改到不在链条上的原型做变异后，本仓新增这条当场红（`expected 0 to be greater than 0`），去掉这条则整条用例静默通过。

### 文档

- **README 由 642 行精简到 147 行**：只留定位、特性清单、安装、快速开始、OKR 模式、API 概览与「需要注意的行为」要点，完整用法一律指向在线文档站对应页面（新增一节「完整文档」按场景列指路表）。此前 README 与文档站是同一份内容两处维护，篇幅涨到没人读完，而文档站才是合适的承载位置——按页组织、内嵌可交互 Demo、API 表随 `shared/api.ts` 渲染。姊妹包 react-okr-tree 同批精简，两端章节顺序与措辞对齐。
- **删之前先把 README 独有的四块内容补进文档站**：新增[自定义节点内容](https://vue3-okr-tree.baiwumm.com/guide/node-content)（三种写法与优先级，内嵌 Base06 用例）与[需要注意的行为](https://vue3-okr-tree.baiwumm.com/guide/behavior)（回写源数据、`node-key` 缺失的内部 id 策略、冻结 / 只读边界、创建期快照 prop；后者此前只活在 README，而 `model/util.ts` 的只读数据警告文案正写着「详见 README『需要注意的行为』」）；主题页补无样式模式、打印、减弱动效与未知主题名提示；快速开始页补 CDN / UMD 用法与「UMD 下没有任何开发期警告」这条边界（`isDev()` 在 `<script>` 环境里必然为假）；键盘页补 `aria-setsize` / `aria-posinset` 的计数口径。

### 文档站

- **首页 Hero Logo 加投影**：`filter: drop-shadow()` 两层，跟随 SVG 圆角方块的 alpha，四角不会露出方形光晕（实测亮色底边下 6 / 16 / 30px 亮度差 −53 / −28 / −12，四角仅 −1 / −3）。暗色模式黑色投影等于看不见，改用冷白微光（同点位 +32 / +17 / +6）。
- **首页 7 个特性卡文案精简**：每条 details 从两三行压到一句（如「复选框、拖拽换父级、手风琴、点击节点展开。」），六套主题名与变量数这类清单不再堆在卡片里——它们本来就在主题页。
- **新增[复选框与拖拽](https://vue3-okr-tree.baiwumm.com/guide/interaction)页**：1.9.0 / 1.10.0 的这两块能力此前只有 API 表与可交互用例，正文零覆盖。联动含 `disabled` 后代、唯一子链选中即父全选、`check` 与 `check-change` 的触发差异、OKR 左右两树独立维护、25%/50%/25% 分区按 `direction` 换轴、防自嵌套硬规则、跨左右树默认禁止与放开后的注册表迁移，全部落到页面里。
- **主题页补「连接线：CSS 与 SVG 两种渲染模式」一节**：`connector` / `connector-shape` 三形状、锚点随模式镜像、布局零改动的实现口径，此前正文只在迁移页有一行。
- **对齐已发布实现修正五处**：`keyboard.md` 补 `aria-checked`（半选 `mixed`）并把 Space 拆行——`show-checkbox` 下 Space 是切换勾选而非选中（`OkrTreeNode.vue:543-546`）；`shared/api.ts` 的键盘导航行同步这条修正；`viewport.md` 方法表补 `getZoom()` / `getOffset()`（`OkrTreeViewport.vue:401-402` 早已暴露）；`migration.md` 补 1.14.0 的 `BUILT_IN_THEMES`；`getNodeKey` 的说明删掉「此前表格漏记」这类变更历史旁白，公开 API 表只写行为。
- **`playground/components/api/Group.vue` 改读 `shared/api.ts`**：这张表此前是手写副本，改单一来源不会传导（且已实际漂移到键盘导航那一行）。现在六个 API 表全部同源。
- README 的指路表补「复选框与拖拽」与「类型化」两行（后者此前整站有页、README 不指）。
- **与 react 文档站互扫后补齐三处**：画布页新增「交互契约」（3px 平移阈值、平移后吞掉随后一次 `click` 以免误触 `node-click`、以指针为锚缩放、双指捏合、只响应鼠标左键）与「工具栏」作用域参数表（`zoom` / `zoomIn()` / `zoomOut()` / `reset()` / `fit()`，前四个都不接参数）；快速开始页新增「SSR / 服务端渲染」一节（此前只有迁移页一行「SSR 可用」，而 `tests/ssr/render-to-string.spec.ts` 实打实覆盖了六种情形），并点明 `exportImage` / `scrollToNode` / ResizeObserver 重测属客户端专属；注意事项页补 `default-expanded-keys` 的运行时语义——**只追加展开、不收回**（`tree-store.ts:320-329` 只逐个 `expand`，没有反向收起），与 `default-checked-keys` 的「先清空再应用」是两回事。最后这条是两端各跑一条探针用例实测出来的，结果一致（`[1] → [3]` 都得到 `[true, true]`），探针文件用完即删。
- **文档站补上对姊妹包的指涉**：导航栏加「React 版」外链、快速开始页加一句锁步关系说明——此前 react 站多处讲与 vue3 的关系，而 vue3 站内对 `react-okr-tree` 零指涉，只在 GitHub README 里有。
- **首页标签标题与 react 站同格式**：`<title>` 原先只有 `vue3-okr-tree`，现在是「vue3-okr-tree — Vue 3 组织架构树 / OKR 树组件」（对齐 react 的 `react-okr-tree — 组织架构图 / OKR 树组件`），内页仍挂短名后缀（`快速开始 | vue3-okr-tree`）。踩到的坑记一下：VitePress 1.6 的 `titleTemplate` 占位符是 **`:title` 而不是文档里常见的 `%s`**（写 `%s` 会原样出现在标题里），且首页会被再拼一次后缀，需用 `index.md` 的 frontmatter `titleTemplate: ':title'` 单独关掉——两处都实测了 `document.title` 才定稿。导航「指南」入口改指新的总览页。
- **补齐互扫发现的最后四项**：新增[指南总览](https://vue3-okr-tree.baiwumm.com/guide/)（按「想做什么 → 用哪个 prop / 方法 → 去哪页」的三张速查表 + 子页清单）与[仓库与本地开发](https://vue3-okr-tree.baiwumm.com/guide/repo)（目录结构、三份真源表、命令、发布，此前这些只存在于仓库 README 与 `docs-site/README.md`）；`controlled` / `typed` / `group` / `keyboard` 四页补到能覆盖 react 对应页的全部事实——受控判定三态（含「只传值不监听 = 锁定态」、传空数组即全部收起）、导出类型与值的完整清单（按 `src/lib/index.ts` 核对）、`OkrTreeGroup` 的测量机制与 `is-measuring` / `is-measured` 及四个自动重测触发点、漫游 tabindex 的唯一性与「Tab 回来落在上次节点」的两种回落情形。**按精简原则写**：每条一句、能链接就不复述（`default-expanded-keys` 语义只留在注意事项页一处），四页合计约 130 行，不是 react 对应页的 540 行。
- README 与 react README 的指路表互相对齐（两边都补「指南总览」与「仓库与本地开发」两行）。

- **全站字体换成自托管的 Maple Mono CN**：与姊妹站 react-okr-tree 用同一份 woff2 子集（GB2312 + 常用标点，`unicode-range` 之外自然回退系统字体），文件放 `docs-site/public/fonts/` 随站点静态部署，不引外部 CDN；VitePress 的 `--vp-font-family-base` / `--vp-font-family-mono` 一并覆写。换字体后 VitePress 自带的 Inter 已无人引用却仍被预载，故加一条 `transformHtml` 在构建期摘掉这条 preload（实测每页少一次约 40KB 的白下载）。

### 工程化

- **`pnpm gen:readme` 改为只生成 API 分组概览**（分组 / 条数 / 成员名，数字由 `shared/api.ts` 统计），README 不再承载完整表格；`API-DOC-BEGIN/END` 标记与单一来源链路保留。顺带修掉一个 CI 陷阱：原脚本的输出不是 Prettier 规范形态，跑完 `gen:readme` 再跑 `format:check`（CI 有一步）必然报未格式化，现在生成 → 格式化 → 再生成往返为空。
- **`shared/api.ts` 两处行内代码由 Markdown 反引号改为 `<code>`**：文档站 `<ApiDoc>` 与 Playground `ApiTable` 都按 `v-html` 渲染单元格，反引号会露成字面字符（react 侧渲染器 split `<code>` 再剥标签，所以那边一直是对的）。该文件本就约定单元格用 HTML 片段，现已零反引号。
- 新增仓库根 `AGENTS.md`，固化「生成物不手改，改 `shared/api.ts` 与生成器后跑 `pnpm gen:readme`」这条约定。

## 1.14.0（2026-09-22）

对外只多一个导出（`BUILT_IN_THEMES`），其余全是发布前收口的测试与门禁断言。本版本同时是**第一个由 CI 通过 OIDC Trusted Publishing 真实发包**的版本。

### 新增

- **导出 `BUILT_IN_THEMES`**：内置主题名清单（`default / feishu / dark / auto / minimal / colorful`）。此前它只用于 `theme` prop 的校验告警、未从包入口导出，而姊妹包 react-okr-tree 已导出——本次补齐两端导出面对齐。需要枚举主题名的场景（主题选择器、设置面板）不再得硬编码字符串数组。

### 工程化

- `verify:dist` 补 3 条 `.cjs` 断言（对应验收表缺口 Q9 / G5）：本包是 `"type": "module"`，Node 会把 `.umd.js` 按 ESM 解析，`require()` 只能走 `.cjs` 这份产物，而这条路径此前全靠人工验证、构建端把 exports 条件写坏要到发包后才被发现。现在用 `createRequire` 真实加载产物，断言组件导出指向同一实现、`BUILT_IN_THEMES` 为 6 项、`createTypedOkrTree` / `TreeStore` 可取。
- **`shared/api.ts` 的 Methods 表补 `getNodeKey` 与 `store / root` 两行**，README 随之重新生成。`getNodeKey` 早在 `defineExpose` 里，但表上漏记，导致 README、文档站 API 页与 playground 三处同时查不到这个方法——react 侧审计的 §6.3 一度指出过，本包未修。
- 新增 `tests/api-surface.spec.ts`：API 表与 `defineExpose` 的双向防漂移（表→实例、实例→表、行数与成员数一致），与 react 侧 `tests/api-surface.spec.tsx` 同构。上面的漏记正是这条用例存在的理由。
- 新增 `tests/model/framework-boundary.spec.ts`：模型层无 Vue 2 残留写法（`new Vue(` / `eventBus` / `$on` `$emit` `$set` `$children` `$refs` / `Vue.prototype`），且从 `vue` 只引入响应式 API（收口 Q7）。与 react 侧同名文件命名一致但内容不同——react 断的是「模型层不引用框架」，本包的 `node.ts` 刻意用了 `shallowReactive`，照搬会写成假测试。
- 过渡相关补三组断言（收口 Q6 / Q8）：`transition-robustness.spec.ts` 用 `it.each` 逐个断六种内置 `animateName` 的 `okr-anim-<name>` 接线（此前只钉 `okr-fade-in` 一种），并新增「点击 +/- 收起时子容器切 `is-hidden` 而非卸载、再点恢复」的用例；`verify:dist` 的 CSS 侧由「只钉一组」改为六种逐个断 `enter-active` / `leave-active`。
- `theme.spec.ts` 补 `[vue3-okr-tree]` 警告前缀断言（此前只断文案，前缀本身零覆盖）。
- `vite.config.ts` 的 `test.include` 加 `tests/*.spec.ts`，使根级 `api-surface` 用例被收集。
- 门禁数字：单测 226 → **242**（21 → 23 个文件），覆盖率 90.85 / 81.81 / 88.94 / 93.56，`verify:dist` 实跑 34 条 `ok`。
- 新增 `docs/acceptance.md` 验收证据表，结构与 react-okr-tree 的同名文档对齐：§7 五条验收项与 Q1–Q9 逐条给到 `文件:行 + 用例名`，并记入与 react 侧的 props / 导出面双向差集实测结果。
- `docs/requirements.md` 与 `docs/development-plan.md` 的 Demo 用例数由 20 更正为 **24**（`playground/components/demos/` 实际文件数）。

## 1.13.0

### 新增

- **`unstyled` prop（2.x #13）**：去掉节点卡片的外观（背景 / 边框 / 圆角 / 阴影，含 `:hover` 态），只保留布局与连接线，供 Tailwind 或自有设计系统接管——此前唯一的退路是覆写全部 `--okr-node-*` 变量，而主题类会重新填回这些值。内边距、字号与文字色刻意不动：改 `padding` 会移动节点盒并牵动连接线的伪元素几何，需要调整请继续用 `--okr-node-*` 变量或 `label-class-name`。
  - 实现上是一个 `okr-unstyled` 容器类 + 一小段中和规则；选择器需要 5 个类才能压过方向专属规则（`.org-chart-container .vertical .org-chart-node-label .org-chart-node-label-inner` 同为特异度且位于其后，同特异度时后者胜）。Visual 套件补了一条计算样式断言同时校验「阴影被清掉」与「节点盒尺寸不变」——写第一版时正因漏了 `.org-chart-node` 一层而被该断言当场抓到。
  - 样式 gzip 3.83 → 3.88 kB（预算 4 kB，余量约 3%）。

### 变更

- **`html-to-image` 以可选 peerDependency 声明**（`^1.11.0` + `peerDependenciesMeta.optional`）：`exportImage` 的这项外部依赖此前只写在文档和运行时报错里，包管理器侧没有任何声明可循；仍不进 `dependencies`，用不到导出能力的消费者不会被拖进来。
- **视觉门禁端口可覆盖**（`OKR_VISUAL_PORT`，默认仍是 4173）：Windows 的 TCP 排除端口区间（`netsh int ipv4 show excludedportrange protocol=tcp`）会把 4173 整段保留，`vite preview` 直接 EACCES，此前在这类机器上无法本地复现视觉门禁。

## 1.12.0

### 新增

- **查询辅助方法（2.x #13）**：`getVisibleNodes()` 返回当前真正可见的节点实例——自身通过 `filter` 且各级祖先均已展开到它；折叠的子树仍挂载在 DOM 中（靠 `is-hidden` 收起），因此结果不等于 DOM 里的节点数，OKR 左子树按 `leftExpanded` 计入。`getNodePath(key | data | node)` 返回从顶层节点到目标节点的链路（含目标自身，不含虚拟根），未命中返回空数组；OKR 左树节点的链路留在左树内（顶层为根节点的左侧镜像），不跨接到右树根。两者均不依赖 `node-key` 之外的新配置。测试 +6。
- **`@media print` 打印样式（2.x #13）**：打印时隐藏展开按钮与画布工具栏（纸上点不动的交互件），并去掉节点卡片与画布的 `box-shadow`（部分打印引擎会把阴影渲染成灰块且费墨）。折叠的子树按屏幕原样输出，需要整树打印请先调 `expandAll`。Visual 套件补一条 `emulateMedia({ media: 'print' })` 的计算样式断言（不新增截图基线）——这是唯一能覆盖该规则的门禁，其余检查都只看屏幕媒体。

### 文档

- **node-key 缺失策略文档化（2.x #13）**：README 新增「需要注意的行为」一节——此前 `append` 等回写类方法的只读数据警告就指向该节名，但章节并不存在。现说明：未配 `node-key` 时组件只在源数据对象上写入不可枚举的 `$treeNodeId` 作为 `v-for` key，**节点注册表是空的**，所以 `getNode(data 对象)` 返回 `null`、`getExpandedKeys` / `getCheckedKeys` 返回空数组、受控与按 key 的方法均不生效，只有传 Node 实例以及 `getVisibleNodes` / `expandAll` / `filter` 这类不依赖注册表的接口可用；深拷贝源数据会丢掉该标记、被当作不同节点。同时补写冻结 / 只读源数据下回写类方法的行为。

### 修复

- 视觉回归门禁的半像素误报（`39d8b08`）与 CI Linux 基线缺失（`be50ee0`）：demo 导航 `.demo-nav` 显式取整行高，`tests/visual/snap.ts` 在截图尺寸不符时补出可定位真因的提示，并补齐 20 张 `*-chromium-linux.png` 基线使 Visual job 首次转绿。仅测试与 CI 侧，无运行时影响。

## 1.11.0

### 新增

- **SVG 连接线模式（2.x #11）**：`connector: 'css' | 'svg'`（默认 css）+ `connector-shape: 'curve' | 'orthogonal' | 'straight'`（仅 svg 模式生效，默认 curve）。要点——
  - **布局零改动**：svg 模式只中和连线伪元素的边框（保留其占位盒，垂直模式 is-leaf 的间隔伪元素不受影响），线条改由 OkrTree 内的覆盖层 `<svg>` 按可见父子边绘制；展开按钮的 +/− 符号同为伪元素边框，已明确排除在中和范围外；
  - **路径形状**：curve 三次贝塞尔（控制点随主轴延伸，最长 40px）、orthogonal 中点直角折线、straight 两点直线；线色/线宽继续走 `--okr-line-color` / `--okr-line-width`，全部主题与自定义变量零配置适配；
  - **锚点随模式镜像**：vertical 出底入顶；horizontal 右树出右入左、OKR 左树出左入右；根节点到 OKR 左树顶层节点绘制镜像连线，收起时与 CSS 模式同形的残枝线（垂直向下 20 / 水平侧向 10 / OKR 根左侧 20）；
  - **无残影重绘**：onUpdated + ResizeObserver + animate 过渡期 rAF 连续重绘三重触发，展开/收起动画期间路径持续贴合布局；测量批量读取一次成形，≤500 节点与 CSS 模式同量级；
  - 运行时切换 `connector` / `connector-shape` 即时生效；非法值输出开发期警告并回退。
- **ESM 产物压缩（构建修复）**：Vite lib 多格式构建中 `es` 输出不经过压缩（cjs/umd 正常，es 带完整缩进换行，gzip 体积高出约 40%），`post-build` 补一次 `transformWithEsbuild` 压缩——ESM gzip 从 24.2 kB 降至 16.2 kB，三种格式首次同量级；压缩后与构建期 sourcemap 错位，`es.js.map` 随之移除（cjs/umd 的 map 不受影响）。size-limit 的 ESM 预算回到 19 kB。
- 测试 +12（模式切换、三形状、残枝、filter 重算、OKR 左树镜像），全量 219 通过；Demo / 文档站新增「SVG 连接线」交互用例（模式与形状实时切换）。

## 1.10.0

### 新增

- **拖拽调整层级（2.x #10）**：`draggable` / `allow-drag(node)` / `allow-drop(draggingNode, dropNode, type)` 三 prop + `node-drag-start / enter / leave / over / end / drop` 六事件 + `moveNode(data, target, type)` 方法。要点——
  - 放置分区对齐 el-tree 的 25%/50%/25%，并按布局方向换轴：horizontal（同级上下排列）按 Y 轴 prev 上 / inner 中 / next 下；vertical（同级左右排列）按 X 轴 prev 左 / inner 中 / next 右。指示线画在节点卡片上（prev/next 指示线、inner 虚线描边），颜色用 `--okr-drop-color`（默认取 `--okr-current-bg`）定制；
  - `moveNode` 同步修改源数据 children（与 append / remove 语义一致，冻结数据下跳过写入并警告）；跨节点移动后修正整棵子树的 `level` 并重注册节点注册表；inner 放置目标自动展开（懒加载目标视为已加载）；
  - 硬性规则：不可拖放到自身或自己的子树内（`contains` 校验，`allow-drop` 不能越过）；disabled 节点不可拖；
  - OKR 模式跨左右树拖动默认禁止，`allow-drop` 明确返回 true 放开——放开后整棵子树的 `isLeftChild` 标记与 nodesMap / leftNodesMap 注册表随之迁移；
  - 事件签名：`node-drag-start(node, event)`、`node-drag-enter/leave/over(draggingNode, dropNode, event)`、`node-drag-end(draggingNode, dropNode | null, dropType | null, event)`、`node-drop(draggingNode, dropNode, dropType, event)`；未完成放置时 `node-drop` 不触发、`node-drag-end` 的后两参为 null。
- 测试 +11（三种放置与源数据同步、防自嵌套、allow 钩子、moveNode 层级修正、OKR 默认禁止与放开后的注册表迁移），全量 207 通过；Demo / 文档站新增「拖拽」交互用例。

## 1.9.0

### 新增

- **复选框选择模式（2.x #14）**：`show-checkbox` / `check-strictly` / `default-checked-keys` 三 prop + `check` / `check-change` 两事件 + `getCheckedKeys` / `getCheckedNodes` / `setCheckedKeys` / `getHalfCheckedKeys` / `getHalfCheckedNodes` / `isChecked` 六方法。交互与 el-tree 习惯一致——
  - 勾选父节点向下联动全部后代（**含 disabled 节点**，disabled 仅阻止直接点击）、祖先按子树重算全选/半选；「全部子节点选中 ⇒ 父选中」，唯一子链选中会让父节点直接全选；
  - `check-strictly` 关闭联动，勾选只作用于自身；`default-checked-keys` 创建期生效（需 node-key），运行时变更先清空再应用，data 重建后不恢复；
  - `check` 只在点击复选框时触发（携带全量勾选信息）；`check-change` 在每个状态变化的节点各触发一次（联动、批量 setCheckedKeys、增删子节点级联均覆盖）；
  - 键盘：Space 切换勾选、Enter 选中（`show-checkbox` 开启时）；treeitem 输出 `aria-checked`（half → `mixed`）；
  - OKR 模式：左右两树勾选**独立维护**（点击只作用于所在树），`setCheckedKeys` / `getCheckedKeys` 等按 key 对左右同时生效 / 合并去重（与 `setCurrentNodeKey` 的既有语义一致）；
  - 样式复用既有 `--okr-*` 变量（边框 `--okr-line-color`、填充 `--okr-current-bg` 等），六套主题与自定义主题零配置适配；勾选状态在增删子节点、懒加载、`updateChildren` 增量重建后自动重算祖先。
- Demo / 文档站新增「复选框」交互用例（check-strictly 切换、事件日志、方法演示）；API 表（`shared/api.ts`）补 Attributes 3 行、Events 2 行、Methods 6 行。

## 1.8.0

### 新增

- **`accordion` 手风琴模式**：用户展开某节点时自动收起同级兄弟，交互入口含 +/- 按钮、点击节点内容（需 `expand-on-click-node`）与键盘方向键。语义与 el-tree 对齐——只作用于**交互展开**，`expandNode` 等程序化方法与受控 `expanded-keys` 不经互斥（受控列表始终是唯一事实来源，传多个同级 key 全部生效）。
- **`expand-on-click-node`**：点击节点内容切换该节点展开 / 收起（默认 false 保持原版）。叶子节点点击只选中不切换；选中态与 `node-click` 照常触发。与 el-tree 一致：先切换展开、再触发 node-click。OKR 模式根节点点击内容只切换右侧子树，左侧仍由左侧按钮控制。
- **SSR 兼容坐实**：新增 `tests/ssr` 冒烟测试（Node 环境无 DOM，`vue/server-renderer`），覆盖三种模式、OKR 左树、受控 props、`#default` / `#empty` 插槽与 OkrTreeGroup / OkrTreeViewport 包裹；确认 setup 与渲染阶段不访问 `window` / `document`，浏览器专属能力均在挂载后且带 `typeof` 守卫。
- **peer 范围实测收紧：`vue >= 3.3.0`**（此前声明 `>=3.0.0`）。`defineSlots` 是 3.3 引入的编译宏，3.0–3.2 的 SFC 编译器无法构建使用本库的项目。CI 新增 `peer-matrix` job：用 pnpm overrides 在 vue 3.3 / 3.4 / 3.5 三档跑全量单测（183 用例，实测三档全部通过）。矩阵腿需成对钉 `@vue/test-utils`——test-utils ≥2.4 依赖 vue 3.5 的 `app.onUnmount`，vue <3.5 的腿配 `~2.3.2`，该组合下「缺 leftData 抛错」用例改为同时接受同步抛错与 `handleError` 打印两种 harness 行为。
- Demo / 文档站新增「手风琴」「点击节点内容展开」两个交互用例；API 表（`shared/api.ts` 单一来源）补两行。

## 1.7.0

### 新增

- **`prefers-reduced-motion` 支持**：系统开启「减弱动态效果」时，展开/收起过渡与 `scrollToNode` 的平滑滚动自动关闭。不止是 CSS 媒体查询掐掉过渡——组件同时把 `animate` 视为关闭（撤掉撑容器高度的延迟），否则收起后会留下一段空白，做不到状态直切。
- **`aria-setsize` / `aria-posinset`**：`role="treeitem"` 补齐在兄弟组内的序号与总数，按**可见**节点计数，被 `filter` 隐藏的项不再被读屏播报。
- **未知 `theme` 值的开发期警告**：`theme` 允许任意自定义名字（用于挂用户自己的 `.okr-theme-{name}`），因此不收紧类型，只在名字不在内置六套清单时提示，避免拼错主题名时毫无视觉变化却找不到原因。内置清单收敛为 `BUILT_IN_THEMES`，`TreeTheme` 类型由它派生。
- **品牌 Logo 与站点图标**：定稿 Logo，接入 README / 文档站（favicon、apple-touch-icon、`og:image` / `twitter:image`）与 Playground。
- **文档站部署目标改为 Cloudflare Pages/Workers**：删除原 GitHub Pages workflow（1.5.0 条目里写的「push main 后自动部署到 GitHub Pages」是当时的事实，此后被本条取代），`docs:build:full` 合并 Playground 为 `/playground/` 子路径，域名定为 `vue3-okr-tree.baiwumm.com` 并落地到 README 与 `package.json` 的 `homepage`。
- **`snapshot-bootstrap.yml`**：手动触发，在真实 runner 上生成 Linux 视觉基线（`*-chromium-linux.png`）并以 artifact 上传，供下载提交。

### 修复

- **`show-node-num` 过滤后计数错误**：数字此前直接取 `childNodes.length`，把被 `filter` 隐藏的节点也算进去，与展开后实际看到的子节点数不符；右侧按钮与 OKR 左树按钮一并改为只计可见子节点。
- **main 上 CI 与视觉回归两条 workflow 长期红灯**：CI 的 Node 20 矩阵项在 `setup-node` 步骤崩溃（pnpm 11 依赖 `node:sqlite`，要求 Node ≥ 22.13）；视觉回归因仓库只有 win32 基线、Linux 缺失基线必判失败。矩阵改为 22 / 24 并加 `fail-fast: false`，视觉回归 runner 固定 `ubuntu-24.04`（`ubuntu-latest` 将于 2026-10-19 迁移 Ubuntu 26，届时系统字体变化会使基线集体失配）。

### 变更

- **`TreeNode.expand()` 去掉 `callback` 形参**：该回调是同步立即调用的，等价于调用方自己的下一行。签名为 `expand(expandParent?: boolean)`。`TreeNode` 虽有导出，但 README 与 API 表未收录该方法，常规用法不受影响。
- 清理无调用方的死代码：`util.objectAssign`、`TreeNode.hasLeftChild()`。

## 1.6.0

### 新增

- **冻结 / 只读源数据兼容**：传入 `Object.freeze` 数据（或外部 store 的 readonly 数据）不再抛 TypeError——内部 id 标记自动降级为 WeakMap 兜底（`v-for` key 与按 data 查找不受影响）；渲染、展开/收起、选中、过滤等只读操作完全正常。需要回写源数据的操作（`append` / `insertBefore` / `insertAfter` / `remove` / `updateKeyChildren` / 懒加载 resolve）在冻结数据上自动跳过写入并输出开发期警告，不再静默失败（README 已标注该语义）。
- **运行时 props 同步策略**：运行时改 prop 要么生效、要么有警告，不存在静默失效——
  - 即时生效：`filterNodeMethod` / `labelClassName` / `animate*`（1.2.0 起）、`showCollapsable`、`defaultExpandAll`（影响后续新建节点）、`props` 字段映射（`label` 动态读取即时生效；`children` 字段变更触发增量重建并恢复受控态）；
  - 创建期快照 + 开发期警告：`nodeKey` / `direction` / `onlyBothTree` 运行时变更提示「请为组件绑定 `:key` 重建实例」（README 已标注）。
- **OKR 左树受控态恢复**：`leftData` 变更重建左树后，按 `expanded-keys` / `current-key` 恢复左树展开与选中状态（此前 `data` 重建只恢复右树）。

## 1.5.0

### 新增

- **VitePress 文档站**（`docs-site/`）：按「指南 / 主题 / API / 迁移 / 更新日志」组织，20+ 用例直接复用 Playground 组件源码可交互；`pnpm docs:dev` / `docs:build`，push main 后自动部署到 GitHub Pages（Playground 同步发布到 `/playground/` 子路径）。API 表单一来源化：`shared/api.ts` 同时驱动 Playground 表格、文档站与 README（`pnpm gen:readme` 生成）。
- **性能基线**（详见 `docs/perf.md`）：2000 节点基准脚本（`pnpm bench`，jsdom）与浏览器实测（Playwright，首渲染 ≈ 137ms，达标 < 300ms）；`updateChildren` 逐层脏检查——原地变更只重建受影响路径，未受影响节点实例保持复用；**`deep-watch: false`** prop（创建期生效）关闭深度侦听、只响应 `data` 引用变化。
- **工程化**：vitest 覆盖率阈值（statements/lines/functions ≥ 80%）；size-limit 体积预算（es 19kB / style 3.6kB / umd 19.5kB gzip，超限 CI 失败）；publint + attw 包体检（`pnpm verify:package`，双 🌟 零错误）；Renovate 自动依赖更新；CJS 类型修复（新增 `dist/index.d.cts`，require 条件不再 "Masquerading as ESM"）。
- **发布流程**：`release.yml`——推送 `v*` tag 自动校验版本、跑全部门禁、`npm publish --provenance` 并创建 GitHub Release；`publishConfig.access: public`。
- **Playwright 视觉回归**（`tests/visual/`，独立 `visual.yml` workflow，失败上传 diff）：三模式、OKR 对齐（含 OkrTreeGroup 实况 Demo）、六套主题、动画落定态、懒加载、画布缩放共 14 个快照用例。

### 修复

- CJS require 的类型解析：`exports["."].require` 指向 `index.d.cts`（此前与 ESM 共用 `index.d.ts`，被 attw 判为类型格式不符）。

### 变更

- Playground 样式拆分：`style-base.css`（全局 reset，仅 Playground）与 `style.css`（类作用域，文档站复用）。
- 开发依赖新增：vitepress、@playwright/test、@vitest/coverage-v8、size-limit、@size-limit/file、publint、@arethetypeswrong/cli、html-to-image（Demo 导出用例用；库本体保持零运行时依赖）。

## 1.4.0

### 新增

- **懒加载子节点**：`lazy` + `load(node, resolve, reject)` props。初始 data 中没有 `children`（或为空数组）的节点视为未加载，首次展开时调用 `load`；resolve 后子节点同步写入源数据 `children`（与 `append` 语义一致）并展开，之后不重复请求；`reject` / 抛错时回到折叠态、可重试。未加载节点：`isLeaf` 由 `props.isLeaf` 字段（或函数）决定，默认视为有子节点；展开按钮出现 `is-loading` 加载中态（`#expand-btn` 作用域新增 `loading`）；`show-node-num` 不显示数字；`expandAll` / `expandNode` / `scrollToNode` / `default-expanded-keys` / `v-model:expanded-keys` 触发时先加载、完成后再展开；OKR 左树节点经 `node.isLeftChild` 区分；`filter` 不触发未加载节点的请求。
- **`<OkrTreeViewport>` 画布组件**：包裹树即可缩放平移——滚轮以指针为中心缩放、按住拖拽平移（3px 阈值不影响节点点击）、双击复位、触控双指捏合。props：`min-zoom` / `max-zoom` / `zoom-step` / `v-model:zoom` / `v-model:offset` / `wheel-behavior`（`ctrl-zoom`（默认，按住 Ctrl/⌘ 才缩放不劫持页面滚动）/ `zoom` / `scroll`）/ `toolbar`。方法：`zoomIn` / `zoomOut` / `reset` / `fitToScreen(padding)` / `centerNode(key)`（先展开祖先再居中）/ `exportImage({ type: 'png' | 'svg', scale, background, toPng?, toSvg? })`（基于 html-to-image 按需动态 import，未安装时给出明确错误；可直接传入渲染函数）。工具栏插槽 `#toolbar="{ zoom, zoomIn, zoomOut, reset, fit }"` 与默认工具栏；可与 `OkrTreeGroup` 组合。
- **`getNodeEl(data)` 方法**（OkrTree）：按 Node / key / data 获取节点 DOM 元素。
- 开发期警告：`lazy` 缺 `load`、传 `load` 未开 `lazy`。
- Demo 新增「懒加载」「画布缩放」两个用例；插件注册 `<okr-tree-viewport>`。

### 依赖

- devDependencies 新增 `html-to-image`（仅供 Demo 导出用例使用；库本体保持零依赖，运行时按需动态 import）。

## 1.3.0

### 新增

- **`<OkrTreeGroup>`**：包裹多棵 OKR 树，测量组内左子树容器的最大自然宽度并统一，使各树根节点水平坐标完全一致；自动响应成员挂载/更新/尺寸变化，`align` prop 与 `refresh()` 方法。替代原版"业务层手动测量 DOM"方案。
- **键盘可访问性**：`role="tree" / "treeitem" / "group"`、`aria-level` / `aria-expanded` / `aria-selected` / `aria-disabled`、漫游 tabindex；`↑↓` 移动、`→` 展开/进入、`←` 收起/返回父节点、`Enter`/`Space` 选中、`Home`/`End`；OKR 左树方向键镜像；焦点环变量 `--okr-focus-color` / `--okr-focus-width`。
- **`node-component` prop**：以 `{ node, data }` 为 props 渲染任意组件。
- **`createTypedOkrTree<T>()`**：类型收窄 `data` / `leftData` 与插槽作用域中的 `data`。
- 插件方式注册时同时注册 `<okr-tree-group>`。

### 变更

- 节点内容渲染优先级调整为 `#default` 插槽 > `node-component` > `render-content`（此前 `render-content` 高于插槽，与文档不一致）。
- 左子树容器补齐与右子树一致的 `is-hidden` / 动画状态类。

## 1.2.0

### 新增

- **受控状态**：`v-model:expanded-keys`（`expanded-keys` prop + `update:expandedKeys` 事件）与 `v-model:current-key`（`current-key` prop + `update:currentKey` 事件），需 `node-key`。未传时保持原版非受控行为。
- **方法**：`expandAll()`、`collapseAll()`、`expandNode(data, expandParent = true)`、`collapseNode(data)`、`scrollToNode(data, options?)`（先展开祖先再 `scrollIntoView`）。
- **插槽**：`#expand-btn="{ node, data, expanded, side }"`（替代 `node-btn-content`，`show-node-num` 优先）、`#empty`（`data` 为空时渲染）。
- **开发期警告**（仅非 production，UMD/CDN 下不输出）：重复 `node-key`；`onlyBothTree` 但 `direction` 非 `horizontal`；传 `leftData` 未开 `onlyBothTree`；受控 prop / `default-expanded-keys` 缺 `node-key`。
- GitHub Actions CI（lint / typecheck / test / build / verify-dist / pack）。

### 内部

- `TreeStore` 新增 `forEachNode` / `expandAll` / `collapseAll` / `expandNode` / `collapseNode` / `getExpandedKeys` / `setExpandedKeys`。
- 节点根元素登记到树上下文，供 `scrollToNode` 定位。

## 1.1.0

### 新增

- **CSS 变量主题化**：全部外观取值通过 `var(--okr-*, 默认值)` 暴露（连接线 / 节点卡片 / 按钮 / 选中态 / 禁用态 共 23 个变量），默认值内联在使用点，主题类可放在根容器或任意祖先。
- **`theme` prop** 与内置主题 `default` / `feishu` / `dark` / `auto`（跟随 `prefers-color-scheme`）/ `minimal` / `colorful`（按 `data-level` 层级着色）；支持自定义主题名。
- 节点根元素新增 `data-level` 属性。
- Demo 站顶部全局主题切换器。

### 兼容性说明

- 节点背景 / 文字色 / 边框 / 圆角以 `:where()` 零优先级声明，主题选中态只设变量，用户通过 `current-lable-class-name` 传入的单类样式仍可覆盖；`default` 主题外观与 1.0.0 完全一致。

## 1.0.0

- 基于 Vue 3 完整复刻 [vue-okr-tree](https://github.com/qq449245884/vue-okr-tree) v1.0.17：全部 props / events / methods 对齐，三种布局（垂直 / 水平 / OKR 左右双向），纯 CSS 连接线。
- 相对原版的修复（详见 `docs/requirements.md` 第 6 节）：多根数据过滤、OKR 左右树同 key 覆盖、`data` 原地变更增量更新、`animate` / `animate-duration` 真实生效、内建 `align-root` 根对齐、`props.disabled` 真实禁用、开放 `#default` 插槽、移除全局 `* {}` 样式污染。
- 产物：ESM / CJS / UMD + `style.css` + 单文件 `index.d.ts`。
