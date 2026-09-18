// VitePress 主题：默认主题 + Demo 复用样式
import DefaultTheme from 'vitepress/theme'
// playground 的排版样式（类作用域，全部挂在 .vue-okr-tree-demo 下，不污染文档主题）
import '../../../playground/style.css'
// 代码高亮（playground CodeBlock 用 prismjs）
import 'prismjs/themes/prism.css'
import './custom.css'

export default DefaultTheme
