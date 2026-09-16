/**
 * Demo 共享数据（对应原 mixins.js 与各用例内的 testData / testLeftData）。
 * 每次调用返回新副本，避免不同用例之间通过 append/remove 相互影响。
 */
import type { TreeNodeData } from 'vue3-okr-tree'

/** 原 mixins.js 的基础数据（无 id） */
export const baseData = (): TreeNodeData[] => [
  {
    label: 'xxx科技有有限公司',
    children: [
      {
        label: '产品研发部',
        children: [{ label: '研发-前端' }, { label: '研发-后端' }, { label: 'UI 设计' }],
      },
      {
        label: '销售部',
        children: [{ label: '销售一部' }, { label: '销售二部' }],
      },
      { label: '财务部' },
    ],
  },
]

/** 带 id 的数据（Base041 / Base07 / Filter / Events 等） */
export const keyedData = (): TreeNodeData[] => [
  {
    id: 1,
    label: 'xxx科技有有限公司',
    children: [
      {
        id: 2,
        label: '产品研发部',
        children: [
          { id: 3, label: '研发-前端' },
          { id: 4, label: '研发-后端' },
          { id: 5, label: 'UI 设计' },
        ],
      },
      {
        id: 6,
        label: '销售部',
        children: [
          { id: 7, label: '销售一部' },
          { id: 8, label: '销售二部' },
        ],
      },
      { id: 9, label: '财务部' },
    ],
  },
]

/** 带 content 字段的数据（Base06 / Base062 自定义内容） */
export const contentData = (): TreeNodeData[] => [
  {
    label: 'xxx科技有有限公司',
    content: '这是一个有活力的公司',
    children: [
      {
        label: '产品研发部',
        content: '这是一个有活力的产品研发部',
        children: [
          { label: '研发-前端', content: '这是一个有活力的研发-前端' },
          { label: '研发-后端', content: '这是一个有活力的研发-后端' },
          { label: 'UI 设计', content: '这是一个有活力的UI 设计' },
        ],
      },
      {
        label: '销售部',
        content: '这是一个有活力的销售部',
        children: [
          { label: '销售一部', content: '这是一个有活力的销售一部' },
          { label: '销售二部', content: '这是一个有活力的销售二部' },
        ],
      },
      { label: '财务部', content: '这是一个有活力的财务部' },
    ],
  },
]

/** OKR 模式左子树数据（Base07 / Filter OKR / Events OKR） */
export const leftData = (): TreeNodeData[] => [
  {
    id: 1,
    label: 'xxx科技有有限公司',
    children: [
      {
        id: 12,
        label: '(左)产品研发部',
        children: [
          { id: 13, label: '(左)研发-前端' },
          { id: 14, label: '(左)研发-后端' },
          { id: 15, label: '(左)UI 设计' },
        ],
      },
      {
        id: 16,
        label: '(左)销售部',
        children: [
          { id: 17, label: '(左)销售一部' },
          { id: 18, label: '(左)销售二部' },
        ],
      },
      { id: 19, label: '(左)财务部' },
    ],
  },
]

/** OKR 模式左子树数据 2：左侧深度更深，用于根对齐对比（Base07 第二棵树） */
export const leftData2 = (): TreeNodeData[] => [
  {
    id: 1,
    label: 'xxx科技有有限公司',
    children: [
      {
        id: 12,
        label: '(左)产品研发部',
        children: [
          {
            id: 13,
            label: '(左)研发-前端',
            children: [
              { id: 131, label: '(左)前端一部' },
              { id: 132, label: '(左)前端二部' },
            ],
          },
          { id: 14, label: '(左)研发-后端' },
          { id: 15, label: '(左)UI 设计' },
        ],
      },
      {
        id: 16,
        label: '(左)销售部',
        children: [
          { id: 17, label: '(左)销售一部' },
          { id: 18, label: '(左)销售二部' },
        ],
      },
      { id: 19, label: '(左)财务部' },
    ],
  },
]

/** OKR 自定义内容：带 id + content 的右树（Base08 / Base081） */
export const okrContentData = (): TreeNodeData[] => [
  {
    id: 1,
    label: 'xxx科技有有限公司',
    content: '这是一个有活力的公司',
    children: [
      {
        id: 2,
        label: '产品研发部',
        content: '这是一个有活力的产品研发部',
        children: [
          { id: 3, label: '研发-前端', content: '这是一个有活力的研发-前端' },
          { id: 4, label: '研发-后端', content: '这是一个有活力的研发-后端' },
          { id: 5, label: 'UI 设计', content: '这是一个有活力的UI 设计' },
        ],
      },
      {
        id: 6,
        label: '销售部',
        content: '这是一个有活力的销售部',
        children: [
          { id: 7, label: '销售一部', content: '这是一个有活力的销售一部' },
          { id: 8, label: '销售二部', content: '这是一个有活力的销售二部' },
        ],
      },
      { id: 9, label: '财务部', content: '这是一个有活力的财务部' },
    ],
  },
]

/** OKR 自定义内容：带 id + content 的左树（Base08 / Base081） */
export const okrContentLeftData = (): TreeNodeData[] => [
  {
    id: 1,
    label: 'xxx科技有有限公司',
    content: '这是一个有活力的公司',
    children: [
      {
        id: 12,
        label: '(左)产品研发部',
        content: '这是一个有活力的产品研发部',
        children: [
          { id: 13, label: '(左)研发-前端', content: '这是一个有活力的研发-前端' },
          { id: 14, label: '(左)研发-后端', content: '这是一个有活力的研发-后端' },
          { id: 15, label: '(左)UI 设计', content: '这是一个有活力的UI 设计' },
        ],
      },
      {
        id: 16,
        label: '(左)销售部',
        content: '这是一个有活力的销售部',
        children: [
          { id: 17, label: '(左)销售一部', content: '这是一个有活力的销售一部' },
          { id: 18, label: '(左)销售二部', content: '这是一个有活力的销售二部' },
        ],
      },
      { id: 19, label: '(左)财务部', content: '这是一个有活力的财务部' },
    ],
  },
]

/** 代码片段里复用的数据字面量文本 */
export const baseDataSnippet = `testData: [{
  label: 'xxx科技有有限公司',
  children: [{
    label: '产品研发部',
    children: [{ label: '研发-前端' }, { label: '研发-后端' }, { label: 'UI 设计' }]
  }, {
    label: '销售部',
    children: [{ label: '销售一部' }, { label: '销售二部' }]
  }, {
    label: '财务部'
  }]
}]`

export const keyedDataSnippet = `testData: [{
  id: 1, label: 'xxx科技有有限公司',
  children: [{
    id: 2, label: '产品研发部',
    children: [{ id: 3, label: '研发-前端' }, { id: 4, label: '研发-后端' }, { id: 5, label: 'UI 设计' }]
  }, {
    id: 6, label: '销售部',
    children: [{ id: 7, label: '销售一部' }, { id: 8, label: '销售二部' }]
  }, {
    id: 9, label: '财务部'
  }]
}]`

export const leftDataSnippet = `testLeftData: [{
  id: 1, label: 'xxx科技有有限公司',
  children: [{
    id: 12, label: '(左)产品研发部',
    children: [{ id: 13, label: '(左)研发-前端' }, { id: 14, label: '(左)研发-后端' }, { id: 15, label: '(左)UI 设计' }]
  }, {
    id: 16, label: '(左)销售部',
    children: [{ id: 17, label: '(左)销售一部' }, { id: 18, label: '(左)销售二部' }]
  }, {
    id: 19, label: '(左)财务部'
  }]
}]`
