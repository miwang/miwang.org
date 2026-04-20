<<<<<<< Updated upstream
import { defineField, defineType } from 'sanity'

export const word = defineType({
=======
import {defineField, defineType} from 'sanity'

export default defineType({
>>>>>>> Stashed changes
  name: 'word',
  title: '🔤 高频四会字',
  type: 'document',
  fields: [
<<<<<<< Updated upstream
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
=======
    defineField({name: 'char', title: '中心汉字', type: 'string'}),
    defineField({name: 'image', title: '中心字配图 (如: 兔子)', type: 'image'}),
    // 👇 新增：中心汉字的发音
    defineField({
      name: 'audio',
      title: '🔊 中心字发音',
>>>>>>> Stashed changes
      type: 'file',
      options: { accept: 'audio/*' }
    }),
    defineField({
<<<<<<< Updated upstream
      name: 'month',
      title: '教学月份',
      type: 'string',
=======
      name: 'week',
      title: '教学月份',
      type: 'string',
      options: {list: ['September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June']}
>>>>>>> Stashed changes
    }),
    defineField({
      name: 'phrase_list',
      title: '扩展词语及配图 (扇形分支)',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
<<<<<<< Updated upstream
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
=======
            { name: 'text', title: '词语 (如: 小狗)', type: 'string' },
            { name: 'image', title: '词语配图', type: 'image' },
            // 👇 新增：每个扩展词语独立的发音
            {
              name: 'audio',
              title: '🔊 词语发音',
              type: 'file',
              options: { accept: 'audio/*' }
            }
          ]
        }
      ],
      options: { layout: 'grid' }
    }),
  ],
>>>>>>> Stashed changes
})