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
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'image', title: '本页插图', type: 'image' },
            { name: 'text', title: '本页文字内容', type: 'text' }
          ]
        }
      ]
    })
  ]
})