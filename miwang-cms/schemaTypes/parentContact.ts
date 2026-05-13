import {defineField, defineType} from 'sanity'

export const parentContact = defineType({
  name: 'parentContact',
  title: '📞 家长联系方式 (私密)',
  type: 'document',
  // ⚠️ 这些数据通过服务端接口 /api/contacts-data 访问，不会直接暴露在前端页面。
  fields: [
    defineField({
      name: 'student',
      title: '关联学生',
      type: 'reference',
      to: [{type: 'student'}],
      validation: Rule => Rule.required(),
      description: '从学生名单中选择对应的学生',
    }),
    defineField({
      name: 'academicYear',
      title: '学年',
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
    defineField({
      name: 'contacts',
      title: '联系人信息列表',
      type: 'array',
      description: '可添加多个联系人（爸爸、妈妈、爷爷奶奶等），支持多种联系方式',
      of: [
        {
          type: 'object',
          title: '联系人',
          fields: [
            defineField({
              name: 'contactName',
              title: '联系人称呼',
              type: 'string',
              description: '如：Mary Smith、妈妈、爷爷',
            }),
            defineField({
              name: 'relationship',
              title: '与学生的关系',
              type: 'string',
              options: {
                list: [
                  {title: '👩 妈妈 Mom', value: 'mom'},
                  {title: '👨 爸爸 Dad', value: 'dad'},
                  {title: '👴 祖父母 Grandparent', value: 'grandparent'},
                  {title: '🧑 监护人 Guardian', value: 'guardian'},
                  {title: '其他 Other', value: 'other'},
                ],
                layout: 'dropdown',
              },
            }),
            defineField({
              name: 'type',
              title: '联系方式类型',
              type: 'string',
              options: {
                list: [
                  {title: '📞 电话/手机 Phone', value: 'phone'},
                  {title: '✉️ 邮箱 Email', value: 'email'},
                  {title: '💬 微信 WeChat', value: 'wechat'},
                  {title: '其他 Other', value: 'other'},
                ],
                layout: 'dropdown',
              },
              initialValue: 'phone',
            }),
            defineField({
              name: 'value',
              title: '联系方式内容',
              type: 'string',
              description: '电话号码、邮箱地址或微信号',
              validation: Rule => Rule.required(),
            }),
            defineField({
              name: 'isPrimary',
              title: '首选联系方式',
              type: 'boolean',
              description: '标记为首选，方便快速拨打',
              initialValue: false,
            }),
            defineField({
              name: 'notes',
              title: '备注',
              type: 'string',
              description: '如：仅工作日可接、紧急联系等',
            }),
          ],
          preview: {
            select: {
              type: 'type',
              value: 'value',
              name: 'contactName',
              isPrimary: 'isPrimary',
            },
            prepare(sel) {
              const icons: Record<string, string> = {phone: '📞', email: '✉️', wechat: '💬', other: '📋'}
              const icon = icons[sel.type] || '📋'
              const star = sel.isPrimary ? ' ⭐' : ''
              return {
                title: `${icon} ${sel.value || ''}${star}`,
                subtitle: sel.name || '',
              }
            },
          },
        },
      ],
    }),
    defineField({
      name: 'needsReview',
      title: '⚠️ 需要人工核对',
      type: 'boolean',
      description: '由 PDF 解析器自动标记，表示本条记录置信度低，请手动核对后取消标记',
      initialValue: false,
    }),
    defineField({
      name: 'rawImportText',
      title: '原始导入文本 (仅供核对)',
      type: 'text',
      rows: 3,
      description: '从 roster PDF 提取的原始文本行，仅用于人工核对，不对外展示',
      readOnly: true,
    }),
    defineField({
      name: 'importSource',
      title: '导入来源 (自动填写)',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'importedAt',
      title: '导入时间 (自动填写)',
      type: 'datetime',
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      studentNameZh: 'student.nameZh',
      studentNameEn: 'student.nameEn',
      studentName: 'student.name',
      className: 'student.className',
      year: 'academicYear',
      needsReview: 'needsReview',
      media: 'student.avatar',
    },
    prepare(sel) {
      const name = sel.studentNameZh || sel.studentNameEn || sel.studentName || '未知学生'
      const classEmoji = sel.className === 'elephant' ? '🐘' : sel.className === 'tiger' ? '🐯' : '👤'
      const reviewFlag = sel.needsReview ? ' ⚠️' : ''
      return {
        title: `${name}${reviewFlag}`,
        subtitle: `${classEmoji} ${sel.year || ''} 学年`,
        media: sel.media,
      }
    },
  },
})
