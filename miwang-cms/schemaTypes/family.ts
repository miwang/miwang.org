import { defineField, defineType } from 'sanity'

export const family = defineType({
  name: 'familyMember',
  title: '👨‍👩‍👧‍👦 家人称呼',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: '称呼 (如: 爷爷)',
      type: 'string',
    }),
    defineField({
      name: 'image',
      title: '人物配图',
      type: 'image',
    }),
    defineField({
      name: 'audio',
      title: '专属发音',
      type: 'file',
      options: { accept: 'audio/*' }
    })
  ]
})