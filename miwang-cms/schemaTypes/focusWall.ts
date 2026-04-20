import { defineField, defineType } from 'sanity'

export const focusWall = defineType({
  name: 'focusWall',
  title: '✨ Focus Wall',
  type: 'document',
  fields: [
    defineField({
      name: 'month',
      title: '教学月份',
      type: 'string',
    }),
    defineField({
      name: 'theme',
      title: '月度主题',
      type: 'string',
    }),
    defineField({
      name: 'targetWords',
      title: '本月目标字词',
      type: 'string',
    }),
    defineField({
      name: 'image',
      title: '主题墙展示图',
      type: 'image',
    })
  ]
})