# 受控状态与方法

`expanded-keys` / `current-key` 传入后即为受控模式（需 `node-key`）：列表内节点展开、其余收起；用户点击 +/- 或调用展开/收起方法都会触发 `update:expandedKeys` / `update:currentKey` 回写。不传时保持原版的非受控行为。

内置方法：`expandAll` / `collapseAll` / `expandNode` / `collapseNode` / `scrollToNode` / `getNodeEl` 等，完整列表见 [API](/api/)。

<DemoBlock>

<Base09 />

</DemoBlock>

<script setup lang="ts">
import DemoBlock from '../components/DemoBlock.vue'
import Base09 from '../../playground/components/demos/Base09.vue'
</script>
