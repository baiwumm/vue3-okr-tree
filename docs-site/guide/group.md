# 多棵树根对齐：OkrTreeGroup

`align-root` 让每棵树的根节点在自身容器内居中。多棵 OKR 树并排对比、且宽度不足以容纳最深的一侧时，各树"各自居中"的位置会不同。用 `<OkrTreeGroup>` 包裹即可：它测量组内所有左子树容器的最大自然宽度并统一设置，使各树根节点水平坐标完全一致，并自动响应成员的挂载 / 更新 / 尺寸变化。

<DemoBlock>

<OkrGroupDemo />

</DemoBlock>

| 名称        | 说明                                                       |
| ----------- | ---------------------------------------------------------- |
| `align`     | prop，boolean，默认 `true`；`false` 时各树独立排布         |
| `refresh()` | 方法，手动重新测量（字体加载完成、外部样式变化等特殊场景） |

`OkrTreeGroup` 可以放在 `<OkrTreeViewport>` 内组合使用（见[画布缩放](/guide/viewport)）。

<script setup lang="ts">
import DemoBlock from '../components/DemoBlock.vue'
import OkrGroupDemo from '../../playground/components/api/Group.vue'
</script>
