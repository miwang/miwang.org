<<<<<<< Updated upstream
import { defineField, defineType } from 'sanity'

export const book = defineType({
  name: 'book',
  title: '📚 分级绘本',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: '书名',
      type: 'string',
    }),
    defineField({
      name: 'level',
      title: '难度级别',
      type: 'string',
    }),
    defineField({
      name: 'topic',
      title: '话题',
      type: 'string',
    }),
    defineField({
      name: 'vocab_tags',
      title: '词汇标签',
      type: 'string',
    }),
    defineField({
      name: 'coverImage',
      title: '封面图片',
      type: 'image',
    }),
    defineField({
      name: 'pages',
      title: '绘本内容 (分页)',
=======
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'book',
  title: '📚 分级绘本馆',
  type: 'document',
  fields: [
    defineField({name: 'title', title: '绘本名称', type: 'string'}),
    defineField({
      name: 'level',
      title: '阅读级别',
      type: 'string',
      options: {list: ['Novice Low (L1)', 'Novice Mid (L2)', 'Novice High (L3)']}
    }),
    defineField({
      name: 'topic',
      title: '话题分类',
      type: 'string',
      options: {list: ['动物与自然', '家庭与朋友', '节日与文化', '学校生活', '食物与购物']}
    }),
    defineField({name: 'vocab_tags', title: '核心词汇', type: 'string', description: '用逗号隔开'}),
    defineField({name: 'coverImage', title: '封面图片', type: 'image', options: {hotspot: true}}),
    defineField({
      name: 'pages',
      title: '绘本页面内容',
>>>>>>> Stashed changes
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
<<<<<<< Updated upstream
            { name: 'image', title: '本页插图', type: 'image' },
            { name: 'text', title: '本页文字内容', type: 'text' }
          ]
        }
      ]
    })
  ]
=======
            {name: 'image', title: '本页插图', type: 'image'},
            {name: 'text', title: '中文句子', type: 'string'}
          ]
        }
      ]
    }),
  ],
>>>>>>> Stashed changes
})