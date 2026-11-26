// DO-NOT-EDIT：本文件由 `node scripts/gen-changelog-entries.mjs` 从仓库根 CHANGELOG.md 生成（docs:build 会自动重跑），要改请改 CHANGELOG.md 或生成脚本。
export interface ChangelogEntry {
  version: string
  date: string
  summary: string
}

export const changelogEntries: ChangelogEntry[] = [
  {
    "version": "1.17.1",
    "date": "2026-11-26",
    "summary": "本批对外 API 形状与 peer 支持面零变化（peerDependencies.vue 仍为 >=3.5.2，运行时依赖仍为空），全部改动落在依赖基线、CI 与文档上。"
  },
  {
    "version": "1.17.0",
    "date": "2026-11-04",
    "summary": "- ⚠️ 支持面收紧：peerDependencies.vue 由 >=3.3.0 改为 >=3.5.2（2026-11-04，1.16.0 之后的下限变更）：发布产物的 dist/index.d.ts 由 vue-tsc 按 Vue 3.5 的类型形状生成，依赖 CreateComponentPublicInstanceWithMixins / PublicProps / GlobalDirectives 等 3.5 才有的公开类型。实测 3.3.13 / 3.4.38 报缺少这些导出，3.5.0 / 3.5.1 仍因 DefineComponent 泛型参数个数不足而无法通过 verify:peer-types，3.5.2 是能编译的最低补丁，因此把运行时与类型支持面统一到同一条口径。Vue 3.3 / 3.4（以及 3.5.0 / 3.5.1）的用户请继续使用 1.16.0，本版不提供兼容层。CI 的 peer-matrix 由 3.3 / 3.4 / 3.5 三腿改为「3.5.2 下限（单测 + build + 消费者 d.ts）」与「dev 当前（单测）」两腿，verify:peer-types 从默认 verify 作业移入下限腿——声明的下限就是类型能编译的下限。"
  },
  {
    "version": "1.16.0",
    "date": "2026-09-26",
    "summary": "- 新增 virtual 虚拟滚动：同层可见兄弟数 ≥ 50 的行只渲染视口内窗口，DOM 数量与滚动流畅度不再随总数增长（1 父 + 10000 平铺子节点实测渲染节点 10001 → 13）。实现要点：未渲染兄弟的位置由等尺寸占位块顶住（float 行总宽与每个渲染节点的坐标和全量渲染逐像素一致），占位块自带连线段续接横线，行首 / 行末的边界帽（:first-child / :last-child 的去线与圆角）语义由占位块自然继承；展开行的子容器按宽度模型显式定宽（float 的 shrink-to-fit 取 min(max(min-content, 可用宽), max-content)，单个巨宽占位块会把容器钉在 min-content 上、把渲染节点挤到第二行折断连线）；折叠行不渲染占位块，折叠宽度与全量渲染一致。aria（aria-setsize / aria-posinset）、show-node-num 计数、getVisibleNodes() 全部按全量可见列表输出；scrollToNode 与键盘漫游对窗口外目标先揭示再定位（逐条推进不跳焦）。要求数字型 label-width（horizontal 布局还要求 label-height），auto 尺寸下达标行退回全量渲染并警告；创建期快照，运行时变更输出警告。已知边界：万级数据首帧成本主要在 store 构建（1 万节点约 2.9s，与 virtual 无关、全量渲染同样存在），virtual 消除的是 DOM 数量与滚动 / 展开时的渲染卡顿；压缩后产物 +2.1 kB gzip（ESM / UMD 预算上调至 21 kB）。姊妹包 react-okr-tree 同批同形。"
  },
  {
    "version": "1.15.0",
    "date": "2026-09-26",
    "summary": "一个功能 minor：Vue Devtools 面板（dev only，roadmap #16 最后一项，做完 #16 整项清空）与 DEFAULT_PROPS 导出补齐（两仓导出面最后一个不对称清零）。两项都是纯增量，无任何行为变化。姊妹包 react-okr-tree 同号跟随（DEFAULT_PROPS 侧早已导出、Devtools 面板无对等物，详见其 CHANGELOG）。"
  },
  {
    "version": "1.14.2",
    "date": "2026-09-25",
    "summary": "四条修复的一批：Demo 交互层批次（G8）实测出来的三处库语义缺口 + 一处画布交互卡死。对外 API 形状零变化，按「修复 +1 patch」定档。其中 default-checked-keys 一条改的是可观察行为（运行时重放的判据从按引用改成按内容），唯一会感知到差异的用法是「传一个等值新数组来强制清空勾选」——那等于依赖每次渲染回滚用户操作，故仍按 patch 走，但如果你确实这么写，请改用 setCheckedKeys()。姊妹包 react-okr-tree 同号跟随。"
  }
]
