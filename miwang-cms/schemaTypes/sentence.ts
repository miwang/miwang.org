import { defineField, defineType } from 'sanity'

export const sentence = defineType({
  name: 'sentence',
  title: '🧩 句子排排队',
  type: 'document',
  fields: [
    defineField({
      name: 'words',
      title: '句子词组（用逗号、顿号或空格隔开）',
      type: 'string',
    }),
    defineField({
      name: 'punctuation',
      title: '标点符号',
      type: 'string',
    }),
    defineField({
      name: 'image',
      title: '情境配图',
      type: 'image',
    }),
    defineField({
      name: 'video',
      title: '完成后播放视频（MP4）',
      type: 'file',
      options: {
        accept: 'video/mp4',
      },
    }),
    defineField({
      name: 'tags',
      title: '标签分类',
      type: 'string',
    })
  ]
})