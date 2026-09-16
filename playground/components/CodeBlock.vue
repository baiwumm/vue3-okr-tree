<template>
  <pre class="code-block language-markup"><code v-html="html"></code></pre>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Prism from 'prismjs'

const props = defineProps<{ code: string; lang?: 'markup' | 'javascript' | 'css' }>()

const html = computed(() => {
  const lang = props.lang ?? 'markup'
  const grammar = Prism.languages[lang] ?? Prism.languages.markup
  return Prism.highlight(props.code.trim(), grammar, lang)
})
</script>

<style scoped>
.code-block {
  margin: 0;
  padding: 16px 20px;
  background: #f5f2f0;
  overflow: auto;
  text-align: left;
  border-radius: 0;
}
</style>
