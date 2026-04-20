import {defineField, defineType} from 'sanity'

export const centerConfig = defineType({
  name: 'centerConfig',
  title: '🎯 小组背景图',
  type: 'document',
  preview: {
    prepare() {
      return { title: '小组背景图' }
    }
  },
  fields: [
    defineField({
      name: 'mathBg',
      title: '➕ 数学组背景 (Math Center)',
      type: 'image',
    }),
    defineField({
      name: 'wangBg',
      title: '👨‍🏫 王老师组背景 (Wang Laoshi)',
      type: 'image',
    }),
    defineField({
      name: 'zhangBg',
      title: '👩‍🏫 张老师组背景 (Zhang Laoshi)',
      type: 'image',
    }),
    defineField({
      name: 'computerBg',
      title: '💻 电脑组背景 (Computer Center)',
      type: 'image',
    })
  ]
})