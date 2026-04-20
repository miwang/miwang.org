import { defineField, defineType } from 'sanity'

export const poem = defineType({
  name: 'poem',
  title: '📜 读古诗',
  type: 'document',
  fields: [
    defineField({
      name: 'id',
      title: '专属ID',
      type: 'string',
    }),
    defineField({
      name: 'title',
      title: '标题',
      type: 'string',
    }),
    defineField({
      name: 'author',
      title: '作者及朝代 (可选)',
      type: 'string',
    }),
    defineField({
      name: 'cover',
      title: '封面配图',
      type: 'image',
    }),
    defineField({
      name: 'audio',
      title: '朗读音频',
      type: 'file',
      options: { accept: 'audio/*' }
    }),
    defineField({
      name: 'lyrics',
      title: '诗句/童谣内容',
      type: 'text',
    })
  ]
})