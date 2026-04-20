<<<<<<< Updated upstream
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
=======
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'poem',
  title: '📜 古诗与顺口溜',
  type: 'document',
  fields: [
    defineField({name: 'id', title: '唯一ID', type: 'string'}),
    defineField({name: 'title', title: '标题', type: 'string'}),
    defineField({name: 'cover', title: '封面图片', type: 'image'}),
    defineField({name: 'youtubeId', title: 'YouTube ID', type: 'string'}),
    defineField({name: 'startTime', title: '开始时间(秒)', type: 'number'}),
    defineField({name: 'lyrics', title: '诗词内容', type: 'text'}),
  ],
>>>>>>> Stashed changes
})