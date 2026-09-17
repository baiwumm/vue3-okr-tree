import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist/**', 'playground/dist/**', 'node_modules/**', 'coverage/**', '*.tgz'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
    },
  },
  {
    files: ['**/*.{ts,vue,js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      // Demo 用例组件名（Base01 等）与原 Demo 对齐，不强制多词
      'vue/multi-word-component-names': 'off',
      // 组件属性顺序与原 Vue 2 模板保持一致，不强制重排
      'vue/attributes-order': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      // 排版交给 Prettier，关闭与其冲突的 vue 排版规则
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/require-default-prop': 'off',
      'vue/no-v-html': 'off',
      // 移植代码中大量运行时松散类型（原 JS 实现），允许 any
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-this-alias': 'off',
    },
  },
  {
    // Demo 用例内嵌的示例源码字符串需要 <\/script> 转义以避免提前闭合 SFC 的 script 块
    files: ['playground/**/*.vue'],
    rules: {
      'no-useless-escape': 'off',
    },
  },
  {
    files: ['tests/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },
    rules: {
      // 测试里常用 defineComponent 内联多个父组件
      'vue/one-component-per-file': 'off',
    },
  }
)
