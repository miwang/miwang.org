import { defineField, defineType } from 'sanity'

export const word = defineType({
  name: 'word',
  title: '🔤 高频四会字',
  type: 'document',
  fields: [
    defineField({
      name: 'char',
      title: '中心汉字',
      type: 'string',
    }),
    defineField({
      name: 'image',
      title: '中心字配图',
      type: 'image',
    }),
    defineField({
      name: 'audio',
      title: '中心字发音',
      type: 'file',
      options: { accept: 'audio/*' }
    }),
    defineField({
      name: 'month',
      title: '教学月份',
      type: 'string',
    }),
    defineField({
      name: 'phrase_list',
      title: '扩展词语及配图 (扇形分支)',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            // 👇 核心修复：把 phrase 改成了 text，精准对齐旧数据！
            { name: 'text', title: '词语/句子', type: 'string' },
            { name: 'image', title: '配图', type: 'image' },
            { name: 'audio', title: '发音', type: 'file', options: { accept: 'audio/*' } }
          ]
        }
      ],
      options: {
        layout: 'grid'
      }
    })
  ]
})