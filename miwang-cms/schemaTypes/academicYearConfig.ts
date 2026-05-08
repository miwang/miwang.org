import {defineField, defineType} from 'sanity'

export const academicYearConfig = defineType({
  name: 'academicYearConfig',
  title: '🗓️ 当前学年设置',
  type: 'document',
  fields: [
    defineField({
      name: 'currentAcademicYear',
      title: '当前学年 (Current Academic Year)',
      type: 'string',
      options: {
        list: [
          {title: '2025-2026 学年', value: '25-26'},
          {title: '2026-2027 学年', value: '26-27'},
          {title: '2027-2028 学年', value: '27-28'},
        ],
        layout: 'dropdown',
      },
      initialValue: '25-26',
      validation: Rule => Rule.required(),
    }),
  ],
  preview: {
    select: {
      year: 'currentAcademicYear',
    },
    prepare(selection) {
      return {
        title: '当前学年设置',
        subtitle: `当前学年：${selection.year || '25-26'}`,
      }
    },
  },
})
