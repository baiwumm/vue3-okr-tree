<p align="center">
  <!-- Absolute URL: the logo is not shipped inside the npm package (files only contains dist and the docs),
       a relative path would 404 on the npm project page -->
  <img src="https://vue3-okr-tree.baiwumm.com/logo-512.png" width="112" height="112" alt="vue3-okr-tree Logo" />
</p>

<h1 align="center">vue3-okr-tree</h1>

<p align="center"><a href="./README.md">中文</a> · English</p>

[![npm version](https://img.shields.io/npm/v/vue3-okr-tree.svg)](https://www.npmjs.com/package/vue3-okr-tree)
[![npm downloads](https://img.shields.io/npm/dm/vue3-okr-tree.svg)](https://www.npmjs.com/package/vue3-okr-tree)
[![CI](https://github.com/baiwumm/vue3-okr-tree/actions/workflows/ci.yml/badge.svg)](https://github.com/baiwumm/vue3-okr-tree/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/baiwumm/vue3-okr-tree/graph/badge.svg)](https://codecov.io/gh/baiwumm/vue3-okr-tree)
[![license](https://img.shields.io/npm/l/vue3-okr-tree.svg)](./LICENSE)

📚 **[Documentation site](https://vue3-okr-tree.baiwumm.com)** (currently Chinese only) · [Playground](https://vue3-okr-tree.baiwumm.com/playground/) · [Changelog](./CHANGELOG.md)

An organization chart / OKR tree component for Vue 3, and a full Vue 3 port of [vue-okr-tree](https://github.com/qq449245884/vue-okr-tree) (Vue 2). Its signature feature is the Feishu-style **root node that expands in both directions**, and every connector line is drawn with pure CSS.

- Public API (props / events / methods) matches `vue-okr-tree`, so migrating is a drop-in change
- `<script setup>` + TypeScript, complete `.d.ts` shipped
- Bundles: ESM / CJS / UMD + `style.css`
- Built-in `align-root`: expanding or collapsing in OKR mode no longer shifts the layout, and you never have to measure DOM by hand
- Every visual token is exposed as a `--okr-*` CSS variable; six built-in themes via the `theme` prop (`default / feishu / dark / auto / minimal / colorful`), plus custom themes
- Controlled state with `v-model:expanded-keys` / `v-model:current-key`, `expandAll` / `collapseAll` / `expandNode` / `collapseNode` / `scrollToNode` methods, and `#expand-btn` / `#empty` slots
- `lazy` + `load` for on-demand children (only the expanded path is fetched), `<OkrTreeViewport>` for canvas zoom/pan and PNG/SVG export, `<OkrTreeGroup>` for root alignment across instances, WAI-ARIA keyboard navigation, the `node-component` prop, and the `createTypedOkrTree<T>()` typing helper
- Fixes several upstream bugs: `filter` only covering the first root, left/right trees overwriting the same key, and `animate` / `animate-duration` doing nothing (see [Differences from vue-okr-tree](#differences-from-vue-okr-tree-migration-notes))

## Installation

```bash
pnpm add vue3-okr-tree
# or
npm i vue3-okr-tree
```

Peer dependency: `vue >= 3.3.0` (CI runs the full unit suite against vue 3.3 / 3.4 / 3.5).

## Quick start

```vue
<template>
  <vue-okr-tree :data="data" direction="horizontal" show-collapsable default-expand-all />
</template>

<script setup>
import { ref } from 'vue'
import { VueOkrTree } from 'vue3-okr-tree'
import 'vue3-okr-tree/dist/style.css'

const data = ref([
  {
    label: 'xxx科技有限公司',
    children: [
      { label: '产品研发部', children: [{ label: '研发-前端' }, { label: '研发-后端' }] },
      { label: '销售部', children: [{ label: '销售一部' }] },
      { label: '财务部' },
    ],
  },
])
</script>
```

Global registration (optional):

```ts
import { createApp } from 'vue'
import VueOkrTreePlugin from 'vue3-okr-tree'
import 'vue3-okr-tree/dist/style.css'

createApp(App).use(VueOkrTreePlugin) // registers <vue-okr-tree> and <okr-tree>
```

CDN (UMD, global variable `VueOkrTree`):

```html
<link rel="stylesheet" href="https://unpkg.com/vue3-okr-tree/dist/style.css" />
<script src="https://unpkg.com/vue"></script>
<script src="https://unpkg.com/vue3-okr-tree"></script>
<script>
  const { VueOkrTree } = window.VueOkrTree
</script>
```

## OKR mode (children on both sides of the root)

```vue
<vue-okr-tree
  :data="data"
  :left-data="leftData"
  only-both-tree
  direction="horizontal"
  show-collapsable
  node-key="id"
  default-expand-all
/>
```

- `onlyBothTree` only takes effect with `direction="horizontal"` and requires `leftData`; otherwise it throws `[Tree] leftData is required in onlyBothTree`.
- `leftData[0].children` is attached to the left side of the first root node of the right tree. Both trees may contain the same `id`.
- `align-root` (default `true`) centers the root inside its container, so expanding or collapsing either side never moves it; when several trees sit side by side their roots line up by themselves. Set it to `false` to get the original content-width layout back.

## Custom node content

`render-content` and `node-btn-content` share the signature `(h, node)`: `h` is Vue's render function passed in by the component, and `node` is the **internal Node instance** (source data in `node.data`, text in `node.label`, plus `isCurrent` / `expanded` / `leftExpanded` / `isLeftChild` / `level` / `childNodes` and so on). This differs from element-ui's `(h, { data })` and stays consistent with vue-okr-tree.

```ts
function renderContent(h, node) {
  return h('div', { class: ['diy', node.isCurrent && 'is-current', node.isLeftChild && 'left'] }, [
    h('div', node.data.label),
    h('small', node.data.content),
  ])
}
```

You can also pass a component (`node-component`, new in the Vue 3 version), which is rendered with `{ node, data }` as props:

```vue
<vue-okr-tree :data="data" :node-component="DeptCard" />
```

Or use the scoped slot (also new in the Vue 3 version — the original slots were unreachable). Precedence of the three: `#default` slot > `node-component` > `render-content`.

```vue
<vue-okr-tree :data="data">
  <template #default="{ node, data }">
    <b>{{ data.label }}</b>
    <small v-if="node.isCurrent">（已选中）</small>
  </template>
</vue-okr-tree>
```

## Calling methods through a ref

```vue
<template>
  <input v-model="keyword" />
  <vue-okr-tree ref="tree" :data="data" node-key="id" :filter-node-method="filterNode" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { VueOkrTree, type VueOkrTreeInstance } from 'vue3-okr-tree'

const tree = ref<VueOkrTreeInstance | null>(null)
const keyword = ref('')
watch(keyword, (v) => tree.value?.filter(v))

// The method is called even for an empty value: return true to restore every node
const filterNode = (value: string, data: any) => (!value ? true : data.label.includes(value))

tree.value?.append({ id: 10, label: '销售三部' }, 6)
tree.value?.setCurrentKey(7)
</script>
```

## Controlled state (v-model)

Passing `expanded-keys` / `current-key` switches the component to controlled mode (requires `node-key`): nodes in the list are expanded, all others collapsed; clicking a +/- button or calling an expand/collapse method emits `update:expandedKeys` / `update:currentKey` so you can write the state back. When neither is passed, the original uncontrolled behavior applies.

```vue
<template>
  <button @click="tree?.expandAll()">全部展开</button>
  <button @click="tree?.collapseAll()">全部收起</button>
  <button @click="tree?.scrollToNode(8)">滚动到 id=8</button>

  <vue-okr-tree
    ref="tree"
    v-model:expanded-keys="expandedKeys"
    v-model:current-key="currentKey"
    :data="data"
    node-key="id"
    show-collapsable
  >
    <template #expand-btn="{ expanded, side }">
      <span class="org-chart-node-btn-text">{{ expanded ? '−' : '＋' }}</span>
    </template>
    <template #empty>暂无数据</template>
  </vue-okr-tree>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VueOkrTree, type TreeKey, type VueOkrTreeInstance } from 'vue3-okr-tree'

const tree = ref<VueOkrTreeInstance | null>(null)
const expandedKeys = ref<TreeKey[]>([1]) // only the node with id 1 is expanded
const currentKey = ref<TreeKey | null>(null) // null means nothing is selected
</script>
```

## Lazy loading children

With a large tree (an organization of a few thousand nodes, say) you can start with top-level nodes only and fetch children on first expand through the `load` function:

```vue
<template>
  <vue-okr-tree :data="data" node-key="id" show-collapsable lazy :load="loadNode" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VueOkrTree, type TreeNodeData } from 'vue3-okr-tree'

const data = ref<TreeNodeData[]>([{ id: 1, label: '总部' }])

function loadNode(
  node: TreeNodeData & { level: number },
  resolve: (children: TreeNodeData[]) => void,
  reject?: () => void
) {
  // node is the internal Node instance: node.data is the source data,
  // node.isLeftChild tells OKR left-tree nodes apart
  fetchChildren(node.data.id)
    .then(resolve)
    .catch(() => reject?.())
}
</script>
```

Contract:

- **Unloaded nodes**: a node whose initial `data` has no `children` field (or an empty array) counts as unloaded. Once `load` resolves, the children are written into the source data's `children` (same semantics as `append`) and the node is marked as loaded, so it is never requested again.
- **Driven by expansion**: clicking +/-, `expandAll` / `expandNode` / `scrollToNode`, `default-expanded-keys` and `v-model:expanded-keys` all call `load` first when they hit an unloaded node, and expand it afterwards.
- **Failure and retry**: calling `reject()` or throwing inside `load` leaves the node collapsed and clears the `is-loading` state on the button; the next expand retries the request.
- **Leaf nodes**: declare the leaf field with `props: { isLeaf: 'leaf' }` (a function works too). An unloaded node marked as a leaf shows no expand button and never triggers a request; without it, unloaded nodes are assumed to have children.
- **Loading state**: the button gets an `is-loading` class (built-in spinner), the `#expand-btn` slot scope gains `loading: boolean`, and `show-node-num` shows no number while the node is unloaded.
- **Filtering**: `filter` never triggers `load` for unloaded nodes — their subtree content is unknown.

## Canvas component: OkrTreeViewport

When a large tree (dozens of departments, hundreds of nodes) will not fit into a fixed viewport, wrap it in `<OkrTreeViewport>` to get zooming and panning: the component only applies an outer transform, never reaches into the tree, and changes none of its API.

```vue
<template>
  <okr-tree-viewport ref="vp" toolbar :min-zoom="0.2" :max-zoom="4">
    <vue-okr-tree :data="orgData" node-key="id" direction="horizontal" show-collapsable />
    <template #toolbar="{ zoom, zoomIn, zoomOut, reset, fit }">
      <button @click="zoomOut()">−</button>
      <span>{{ Math.round(zoom * 100) }}%</span>
      <button @click="zoomIn()">＋</button>
      <button @click="reset()">重置</button>
      <button @click="fit()">适应窗口</button>
    </template>
  </okr-tree-viewport>
</template>
```

| Prop                    | Description                                                                                                                                               | Default     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `min-zoom` / `max-zoom` | Zoom range                                                                                                                                                | `0.2` / `4` |
| `zoom-step`             | Factor multiplied/divided per zoomIn / zoomOut / wheel notch                                                                                              | `1.2`       |
| `zoom`                  | Controlled zoom (`v-model:zoom`); kept internally when not provided                                                                                       | —           |
| `offset`                | Controlled pan offset `{ x, y }` (`v-model:offset`); kept internally when not provided                                                                    | —           |
| `wheel-behavior`        | Wheel behavior: `ctrl-zoom` (default, zoom only while Ctrl/⌘ is held, so page scrolling is never hijacked) / `zoom` (always zoom) / `scroll` (never zoom) | `ctrl-zoom` |
| `toolbar`               | Show the default toolbar; not needed when you provide the `#toolbar` slot                                                                                 | `false`     |

Interactions: wheel zoom is anchored at the pointer; press and drag to pan (movement only counts as panning past 3px, so node clicks still work); double-click resets; pinch to zoom on touch.

| Method (through a ref)   | Description                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| `zoomIn()` / `zoomOut()` | Zoom around the viewport center (clamped to min/max)                                             |
| `reset()`                | Back to zoom 1 / offset 0 (double-clicking the canvas does the same)                             |
| `fitToScreen(padding?)`  | Fit to window: content fully visible and centered, 20px padding on each side by default          |
| `centerNode(key)`        | Expands the target's ancestors first, then centers the viewport on that node (key / data / Node) |
| `exportImage(options?)`  | Export the canvas as PNG / SVG, trigger the download and return the dataURL                      |

`exportImage` builds on [html-to-image](https://github.com/bubkoo/html-to-image): by default it imports the package lazily (`import('html-to-image')`) and throws with installation instructions when it is not installed. When dynamic imports of bare specifiers are unreliable in your bundler, pass your own render functions through `options.toPng / toSvg` (same signature as html-to-image). Options: `type` (`'png' | 'svg'`, png by default), `scale` (pixel density, default 2), `background` (background color, e.g. `'#ffffff'`).

`OkrTreeGroup` can be used inside a Viewport, and the tree's `getNodeEl(key)` method gives you a node's DOM element.

## Aligning roots across trees: OkrTreeGroup

`align-root` centers each tree's root inside its own container. When several OKR trees are placed side by side and the available width cannot hold the deepest side, those "individually centered" roots end up at different x positions — precisely the case where the original README tells you to measure DOM in your business layer. Wrap the trees in `<OkrTreeGroup>` instead: it measures the largest natural left-subtree width in the group and applies it to all of them, so every root shares the same horizontal coordinate, and it re-measures automatically on member mount / update / resize.

```vue
<okr-tree-group>
  <vue-okr-tree :data="a" :left-data="leftA" only-both-tree direction="horizontal" node-key="id" />
  <vue-okr-tree :data="b" :left-data="leftB" only-both-tree direction="horizontal" node-key="id" />
</okr-tree-group>
```

| Name        | Description                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------------- |
| `align`     | Prop, boolean, default `true`; `false` lets each tree lay out independently                         |
| `refresh()` | Method, re-measure by hand (fonts finishing loading, external style changes and similar edge cases) |

## Keyboard navigation and accessibility

The tree container is `role="tree"`, nodes are `role="treeitem"` with `aria-level` / `aria-expanded` / `aria-selected` / `aria-disabled` / `aria-setsize` / `aria-posinset` (the last two are counted among visible siblings, so nodes hidden by `filter` are not counted), and child containers are `role="group"`. Roving tabindex is used: at any moment exactly one node is reachable with Tab.

When the OS requests reduced motion (`prefers-reduced-motion: reduce`), expand/collapse transitions and the smooth scrolling of `scrollToNode` turn themselves off and states switch instantly.

| Key               | Behavior                                                                      |
| ----------------- | ----------------------------------------------------------------------------- |
| `Tab`             | Enter / leave the tree                                                        |
| `↑` / `↓`         | Move focus between visible nodes (document order, collapsed subtrees skipped) |
| `→`               | Expand the current node; if already expanded, step into its first child       |
| `←`               | Collapse the current node; if already collapsed, go to its parent             |
| `Enter` / `Space` | Select the node (fires `node-click`)                                          |
| `Home` / `End`    | Jump to the first / last visible node                                         |

In OKR mode: `←` on the root acts on the left subtree (expand or step into it), and the left tree's `←` / `→` are mirrored (`←` expands/enters, `→` collapses/returns to the root). Keys are not intercepted while focus is inside an input control within a node. Style the focus ring with `--okr-focus-color` (default `#409eff`) and `--okr-focus-width` (default `2px`).

## Typing: createTypedOkrTree<T>

At runtime this returns plain `VueOkrTree`; it only narrows types, so `data` / `leftData` and the slot scope's `data` carry your node type:

```ts
import { createTypedOkrTree } from 'vue3-okr-tree'

interface Dept {
  id: number
  label: string
  leader?: string
}
const DeptTree = createTypedOkrTree<Dept>()
```

```vue
<DeptTree :data="depts" node-key="id">
  <template #default="{ data }">
    {{ data.label }} — {{ data.leader }}   <!-- data: Dept, fully typed -->
  </template>
</DeptTree>
```

## Theming and style customization

Every customizable visual token is exposed as a CSS variable and consumed at the use site as `var(--okr-*, fallback)`, which means:

- Without `theme`, the look is identical to vue-okr-tree;
- Variables can be declared on the component's root element (the `theme` prop adds an `okr-theme-{name}` class), on any ancestor, on `:root`, or inline: `style="--okr-line-color: red"`;
- Selected-state styling is only provided by themes, and at deliberately low specificity, so a class passed through `current-lable-class-name` always wins.

### Built-in themes

```vue
<vue-okr-tree :data="data" theme="feishu" />
```

| Theme      | Built for                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| `default`  | Same as vue-okr-tree: gray lines, white cards, square corners, soft shadow (no class at all)         |
| `feishu`   | The Feishu OKR look: 8px radii, light gray lines, `#3370ff` selected state                           |
| `dark`     | Dark pages: deep background, light gray lines, bright selected state                                 |
| `auto`     | Follows the OS: like `default` in light mode, like `dark` under `prefers-color-scheme: dark`         |
| `minimal`  | Presentations / print: no shadows, thin borders, small radii, selected state with a thin blue border |
| `colorful` | Color per level (nodes carry a `data-level` attribute), good for org charts                          |

Passing a name outside these six is allowed — that is how you hook up your own `.okr-theme-{name}` class. A development-mode hint is logged so a typo in a theme name never fails silently.

### Custom themes / overriding variables

```css
/* Option 1: a custom theme name, used as theme="brand" */
.okr-theme-brand {
  --okr-line-color: #409eff;
  --okr-node-radius: 8px;
  --okr-current-bg: #409eff;
  --okr-current-color: #fff;
}
.okr-theme-brand :where(.org-chart-node-label-inner.is-current) {
  --okr-node-bg: var(--okr-current-bg);
  --okr-node-color: var(--okr-current-color);
}

/* Option 2: override individual variables on any ancestor (layers on top of a built-in theme) */
.my-page {
  --okr-gap-level: 32px;
  --okr-node-font-size: 14px;
}
```

### Variable reference

All layout and paint tokens are exposed as `--okr-*` variables (lines, gaps, node card, expand buttons, selected/disabled state, animation, focus ring); the table of names, descriptions and defaults is maintained in the Chinese README's [变量一览 (variable reference)](./README.md#%E5%8F%98%E9%87%8F%E4%B8%80%E8%A7%88) section, which is its single source.

### Unstyled mode, and why the CSS is hand-written

Tailwind belongs to the consuming app, not to the component itself, and that is a deliberate decision: the connectors are pseudo-element pixel geometry that utility classes cannot express, Preflight would reintroduce exactly the global style pollution the Vue 2 version leaked onto host pages, and every theming need is already covered by the variables above.

When you do bring your own styling system, `unstyled` (new in 1.13.0) removes the card appearance — background, border, radius and shadow, including the `:hover` state — and keeps layout and connectors, so Tailwind or your own design system can take the nodes over. Before it existed the only way out was overriding every `--okr-node-*` variable, which theme classes would then refill. Padding, font size and text color are intentionally untouched: changing `padding` moves the node box and drags the connector geometry along with it, so keep using `--okr-node-*` or `label-class-name` for that.

### Print

The stylesheet also carries an `@media print` block (new in 1.12.0) that hides expand buttons and the canvas toolbar — controls nobody can click on paper — and drops node and canvas `box-shadow`, which some print engines render as gray smudges. Collapsed subtrees print exactly as they look on screen; call `expandAll()` first if you need the whole tree on paper.

## API Reference

The complete attribute / props-mapping / event / method / slot tables are maintained in one place only, generated from `shared/api.ts` by `pnpm gen:readme`: the [API section of the Chinese README](./README.md#api) and the [API page on the documentation site](https://vue3-okr-tree.baiwumm.com/api/). Names, types and defaults are identical for readers of any language, so this file does not duplicate them; a translated copy would immediately drift out of sync with the source of truth.

## Behaviors to be aware of

### The default key strategy when node-key is not set

Rendering and interaction work fine without `node-key`: the component writes a **non-enumerable** `$treeNodeId` internal id onto each node's source data object and uses it as the `v-for` key. If the source data is frozen or otherwise read-only so the write fails, the same id is tracked in an internal WeakMap instead and nothing changes for you (no error is thrown).

The cost is this: **without `node-key`, the node registry stays empty**, so any argument that identifies a node by key or by data object finds nothing — `getNode(dataObject)` returns `null`, `getCheckedKeys` / `getHalfCheckedKeys` return empty arrays, and controlled state plus every key-based method (`v-model:expanded-keys`, `default-expanded-keys`, `current-key`, `default-checked-keys`, `updateKeyChildren`, `setCheckedKeys`) does nothing (development mode warns you about it). What keeps working is **passing Node instances**: the `node` in the `#default` slot scope, the node arguments of the event callbacks, and everything that does not need the registry — `getVisibleNodes()`, `expandAll` / `collapseAll`, `filter`, and friends.

Also note that deep-copying the source data (`JSON.parse(JSON.stringify(data))`, snapshot restore in some state libraries) drops the non-enumerable marker: the clones get fresh internal ids, are treated as different nodes, and expanded state goes with them. Configure `node-key` if you need persistence, locating nodes across copies, or any key-based capability.

### Frozen / read-only source data

Read-only operations — rendering, expand/collapse, filtering, checking — work normally on `Object.freeze`d data and on readonly data from an external store. But `append` / `insertBefore` / `insertAfter` / `remove` / `updateKeyChildren` and lazy `resolve` mutate the source data's `children` array; on frozen data these operations are skipped and log a development-mode warning rather than failing silently. To add or remove nodes on such data, update the state above them and let the component rebuild when the `data` reference changes.

## Differences from vue-okr-tree (migration notes)

API names and semantics are aligned: swap `import { VueOkrTree } from 'vue-okr-tree'` for `vue3-okr-tree`, import `dist/style.css`, and you are done. The remaining differences are all deliberate — bug fixes, or capabilities the original never actually had:

| Item                           | vue-okr-tree (Vue 2)                                                   | vue3-okr-tree                                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `h` in `render-content`        | Vue 2 `createElement`                                                  | Vue 3 `h` (props written the Vue 3 way: `{ class, style, onClick }`)                                              |
| `filter` scope                 | Only the first root's subtree; first-level nodes never hidden          | Whole tree; a parent stays visible while it has visible descendants (element-ui semantics)                        |
| Same key in both OKR trees     | One shared registry, sides overwrite each other                        | Separate registries, `getNode` prefers the right tree; `default-expanded-keys` / `current-node-key` apply to both |
| `animate` / `animate-duration` | Clicking +/- produced no transition; `animate-duration` never worked   | Real expand/collapse transitions, all three animation props honored                                               |
| Root alignment                 | Manual DOM measurement in your business layer                          | Built-in `align-root` (can be turned off)                                                                         |
| Slots                          | Slot code existed internally but was unusable from outside             | `#default="{ node, data }"` is open                                                                               |
| `props.disabled`               | Declared, never used                                                   | Real disabling                                                                                                    |
| Global styles                  | `* { margin:0; padding:0 }` leaked onto the host page                  | Everything scoped inside `.org-chart-container`                                                                   |
| Dead code                      | `selectedKey` / `orkstyle` / `props.leftChildren` etc. declared unused | Not ported                                                                                                        |

## Development

Documentation site: <https://vue3-okr-tree.baiwumm.com> (source in [docs-site/](./docs-site/), `pnpm docs:dev` for local work; deployed to Cloudflare Pages/Workers, see [docs-site/README.md](./docs-site/README.md), `pnpm docs:build:full` for the full build). Upcoming work is tracked as a checkable list in [docs/roadmap.md](./docs/roadmap.md); requirements and decisions in [docs/requirements.md](./docs/requirements.md).

```bash
pnpm install
pnpm dev              # Demo site (runs against src)
pnpm test             # Vitest: model unit tests + component smoke tests
pnpm typecheck        # vue-tsc
pnpm lint             # ESLint
pnpm build            # Library build -> dist/ (includes index.d.cts post-processing)
pnpm verify:dist      # Mount smoke test against the built dist output
pnpm verify:package   # publint + attw packaging checks
pnpm size             # size-limit budget
pnpm test:coverage    # Coverage (thresholds in vite.config.ts)
pnpm build:playground # Demo site build (references dist when PLAYGROUND_USE_DIST=1)
pnpm test:visual      # Playwright visual regression + in-browser performance baselines (run build and build:playground first)
pnpm bench            # 2000-node performance benchmark (jsdom, run build first)
pnpm gen:readme       # Regenerate the README API section from shared/api.ts
```

### Release workflow

Full instructions: [docs/release-guide.md](./docs/release-guide.md).

1. Bump `version` in `package.json` and update `CHANGELOG.md`, commit;
2. `git tag v1.x.x && git push origin v1.x.x`;
3. `release.yml` runs automatically: verifies that tag and version match → lint/typecheck/test → build + verify:dist + publint/attw + size-limit → `npm publish --provenance` → creates the GitHub Release;
4. One-time prerequisite: add `NPM_TOKEN` (an npm Automation token) to the repository Secrets.

## License

MIT
