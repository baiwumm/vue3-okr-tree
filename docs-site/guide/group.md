# 多棵树根对齐：OkrTreeGroup

`align-root` 让每棵树的根节点在**自身容器内**居中。多棵 OKR 树并排对比、而容器宽度装不下最深的一侧时，各树"各自居中"的坐标就不一致——这正是原版需要"结合业务层手动测量 DOM"的场景。`<OkrTreeGroup>` 把它收进组件：

```vue
<okr-tree-group>
  <vue-okr-tree :data="a" :left-data="leftA" only-both-tree direction="horizontal" node-key="id" />
  <vue-okr-tree :data="b" :left-data="leftB" only-both-tree direction="horizontal" node-key="id" />
</okr-tree-group>
```

| 名称        | 说明                                                       |
| ----------- | ---------------------------------------------------------- |
| `align`     | prop，boolean，默认 `true`；`false` 时各树独立排布         |
| `refresh()` | 方法，手动重新测量（字体加载完成、外部样式变化等特殊场景） |

成员树需开启 `align-root`（默认已开）。

## 测量机制

组读取每个成员**左子树容器的自然宽度**取最大值，统一写回容器上的 `--okr-group-left-width`，于是各树根节点落在同一条竖线上。测量期间组根带 `is-measuring`、完成后带 `is-measured`（可用于自己加过渡样式）。

自动重测的触发点：成员挂载 / 更新、`ResizeObserver` 观察到的组内尺寸变化、以及 `document.fonts.ready`（字体落地后文字宽度会变）。所以 `refresh()` 只在极少数外部样式绕过这些信号时才需要手动调——比如异步注入的样式表改了节点内边距。

## 与画布、SSR 的组合

- 可以放进 [`<OkrTreeViewport>`](/guide/viewport) 内一起用；缩放平移不影响对齐结果（测量读的是布局宽度，不含 transform）。
- SSR 下服务端渲染的是**未测量**状态（没有 `--okr-group-left-width`），首屏各树按自身容器居中，挂载后测量完成才对齐。这是浏览器 API 依赖，不是缺陷；若首屏对齐对你是硬需求，把整组包在客户端组件里或预留等宽容器。

<DemoBlock>

<OkrGroupDemo />

</DemoBlock>

<script setup lang="ts">
import DemoBlock from '../components/DemoBlock.vue'
import OkrGroupDemo from '../../playground/components/demos/Base07.vue'
</script>
