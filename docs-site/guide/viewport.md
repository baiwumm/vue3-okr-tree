# 画布缩放：OkrTreeViewport

大树在固定视口里放不下时，用 `<OkrTreeViewport>` 包裹树即可获得缩放与平移能力——它只做外层变换，不侵入树本体，也不改变树的任何 API。

<DemoBlock>

<Base11 />

</DemoBlock>

## Props

| prop                    | 说明                                                                                                        | 默认值      |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- | ----------- |
| `min-zoom` / `max-zoom` | 缩放范围                                                                                                    | `0.2` / `4` |
| `zoom-step`             | 每次 zoomIn / zoomOut / 滚轮一格的缩放系数（乘除）                                                          | `1.2`       |
| `zoom`                  | 受控缩放（`v-model:zoom`），未传时内部维护                                                                  | —           |
| `offset`                | 受控平移偏移 `{ x, y }`（`v-model:offset`），未传时内部维护                                                 | —           |
| `wheel-behavior`        | 滚轮行为：`ctrl-zoom`（默认，按住 Ctrl/⌘ 才缩放，不劫持页面滚动）/ `zoom`（始终缩放）/ `scroll`（从不缩放） | `ctrl-zoom` |
| `toolbar`               | 是否显示默认工具栏；传入 `#toolbar` 插槽时无需开启                                                          | `false`     |

## 方法（通过 ref 调用）

| 方法                     | 说明                                              |
| ------------------------ | ------------------------------------------------- |
| `zoomIn()` / `zoomOut()` | 以视口中心为锚放大 / 缩小（受 min/max 钳制）      |
| `reset()`                | 复位到缩放 1、偏移 0（双击画布同样触发）          |
| `fitToScreen(padding?)`  | 适应窗口：内容完整可见并居中，默认四周留 20px     |
| `centerNode(key)`        | 先展开目标节点的祖先，再把视口中心对准该节点      |
| `exportImage(options?)`  | 导出画布内容为 PNG / SVG 并触发下载，返回 dataURL |

## 导出

`exportImage` 基于 [html-to-image](https://github.com/bubkoo/html-to-image)：默认按需 `import('html-to-image')`（未安装时抛出带安装指引的错误）；在打包器下动态导入裸包名不可靠时，可通过 `options.toPng / toSvg` 直接传入渲染函数（签名与 html-to-image 一致）。选项：`type`（`'png' | 'svg'`，默认 png）、`scale`（像素密度，默认 2）、`background`（背景色）。

## 与 OkrTreeGroup 组合

`<OkrTreeGroup>` 可以放在 `<OkrTreeViewport>` 内组合使用；树的方法 `getNodeEl(key)` 返回节点 DOM 元素，供外部定位。

<script setup lang="ts">
import DemoBlock from '../components/DemoBlock.vue'
import Base11 from '../../playground/components/demos/Base11.vue'
</script>
