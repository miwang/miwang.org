import { defineField, defineType } from 'sanity'

export const student = defineType({
  name: 'student',
  title: '👶 学生管理',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: '学生姓名',
      type: 'string',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'academicYear',
      title: '学年 (Academic Year)',
      type: 'string',
      options: {
        list: [
          { title: '2025-2026 学年', value: '25-26' },
          { title: '2026-2027 学年', value: '26-27' },
          { title: '2027-2028 学年', value: '27-28' }
        ],
        layout: 'dropdown'
      },
      initialValue: '25-26',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'className',
      title: '所属班级',
      type: 'string',
      options: {
        list: [
          { title: '🐘 大象班 (Elephants)', value: 'elephant' },
          { title: '🐯 老虎班 (Tigers)', value: 'tiger' }
        ],
        layout: 'radio'
      },
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'avatar',
      title: '学生头像',
      type: 'image',
      options: { hotspot: true }
    })
  ],
  preview: {
    select: {
      title: 'name',
      className: 'className',
      year: 'academicYear',
      media: 'avatar'
    },
    prepare(selection) {
      const { title, className, year, media } = selection
      const classEmoji = className === 'elephant' ? '🐘 大象班' : '🐯 老虎班'
      return {
        title: title,
        subtitle: `${classEmoji} (${year || '25-26'} 学年)`,
        media: media
      }
    }
  }
})