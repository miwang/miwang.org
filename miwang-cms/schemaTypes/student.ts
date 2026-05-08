import { defineField, defineType } from 'sanity'

export const student = defineType({
  name: 'student',
  title: '👶 学生管理',
  type: 'document',
  fields: [
    defineField({
      name: 'nameZh',
      title: '学生中文名',
      type: 'string',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'nameEn',
      title: '学生英文名',
      type: 'string',
    }),
    defineField({
      name: 'birthday',
      title: '生日',
      type: 'date',
      options: {
        dateFormat: 'MM-DD',
      },
      description: '仅用于月/日展示（示例：2019-09-24）',
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
    }),
    defineField({
      name: 'name',
      title: '兼容旧字段：学生姓名 (Legacy)',
      type: 'string',
      description: '旧页面兼容字段；新数据请优先填写“学生中文名/学生英文名”',
    })
  ],
  preview: {
    select: {
      nameZh: 'nameZh',
      nameEn: 'nameEn',
      legacyName: 'name',
      className: 'className',
      year: 'academicYear',
      media: 'avatar'
    },
    prepare(selection) {
      const { nameZh, nameEn, legacyName, className, year, media } = selection
      const classEmoji = className === 'elephant' ? '🐘 大象班' : '🐯 老虎班'
      return {
        title: nameZh || nameEn || legacyName || '未命名学生',
        subtitle: `${classEmoji} (${year || '25-26'} 学年)`,
        media: media
      }
    }
  }
})
