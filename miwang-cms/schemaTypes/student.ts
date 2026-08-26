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
      validation: Rule =>
        Rule.custom((value, context) =>
          value || context.document?.nameEn ? true : '中文名或英文名至少填写一个'
        )
    }),
    defineField({
      name: 'nameEn',
      title: '学生英文名',
      type: 'string',
      validation: Rule =>
        Rule.custom((value, context) =>
          value || context.document?.nameZh ? true : '中文名或英文名至少填写一个'
        ),
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
          // 23-24 and 24-25 were added when historical rosters were imported.
          // Without them those documents show a validation error in Studio
          // even though the data itself is correct.
          { title: '2023-2024 学年', value: '23-24' },
          { title: '2024-2025 学年', value: '24-25' },
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
    }),
    defineField({
      name: 'studentNumber',
      title: '座号 (Seat No.)',
      type: 'number',
      description:
        '名牌与点名用的班内序号。按英文姓氏字母序自动生成，转学或改名后可手动调整；' +
        '不是学校学籍号。',
      validation: Rule => Rule.integer().min(1).max(99),
    }),
    defineField({
      name: 'homeroomCode',
      title: 'Homeroom 编号 (原始)',
      type: 'string',
      description: '来自 roster 的原始班级编号，如 "15"（大象班）或 "17"（老虎班）',
    }),
    defineField({
      name: 'status',
      title: '学生状态',
      type: 'string',
      options: {
        list: [
          {title: '✅ 在读 (Active)', value: 'active'},
          {title: '�� 已离校 (Inactive)', value: 'inactive'},
          {title: '🎓 已毕业 (Graduated)', value: 'graduated'},
        ],
        layout: 'radio',
      },
      initialValue: 'active',
    }),
    defineField({
      name: 'notes',
      title: '内部备注 (仅教师可见)',
      type: 'text',
      rows: 2,
      description: '如特殊情况、饮食过敏等内部备注，不对外公开显示',
    }),
    defineField({
      name: 'importSource',
      title: '导入来源 (自动填写)',
      type: 'string',
      description: '批量导入时自动填写，如 "roster-import-2025-08-01"；手动录入时留空',
      readOnly: true,
    }),
    defineField({
      name: 'lastImportedAt',
      title: '最后导入时间 (自动填写)',
      type: 'datetime',
      readOnly: true,
    }),
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
