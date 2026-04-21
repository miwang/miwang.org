import { defineField, defineType } from 'sanity'

export const extraPhrase = defineType({
  name: 'extraPhrase',
  title: '📚 补充词汇',
  type: 'document',
  fields: [
    defineField({
      name: 'text',
      title: '词汇',
      type: 'string',
      validation: Rule => Rule.required().error('必须填写词汇内容')
    }),
    defineField({
      name: 'image',
      title: '配图',
      type: 'image',
      validation: Rule => Rule.required().error('必须上传配图')
    }),
    defineField({
      name: 'audio',
      title: '发音 (选填)',
      type: 'file',
      options: { accept: 'audio/*' }
    })
  ]
})