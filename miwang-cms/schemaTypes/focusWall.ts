<<<<<<< Updated upstream
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
=======
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'focusWall',
  title: '📌 单元主题墙',
  type: 'document',
  fields: [
    defineField({
      name: 'unit_num',
      title: '单元编号',
      type: 'number',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: '单元名称',
      type: 'string',
    }),
    defineField({
      name: 'status',
      title: '上线状态',
      type: 'string',
      options: {
        list: ['建设中', '已上线'],
        layout: 'radio', // 让它变成好看的单选按钮
      },
    }),
    defineField({
      name: 'learning_targets',
      title: '🎯 学习目标 (我会说)',
      type: 'array',
      of: [{type: 'string'}],
    }),
    defineField({
      name: 'vocab_words',
      title: '🔤 单元字词',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        layout: 'tags', // 会渲染成像 Notion 一样的标签胶囊！
      }
    }),
    defineField({
      name: 'student_works',
      title: '🖼️ 学生作业展示',
      type: 'array',
      of: [{type: 'image'}],
      options: {
        layout: 'grid', // 像画廊一样网格展示图片
      }
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'status',
      media: 'student_works.0', // 拿第一张学生作业当封面
    },
    prepare(selection) {
      const {title, subtitle, media} = selection
      return {
        title: `单元: ${title || '未命名'}`,
        subtitle: subtitle === '已上线' ? '✅ 已上线' : '⏳ 建设中',
        media: media
      }
    }
  }
>>>>>>> Stashed changes
})