import {defineField, defineType} from 'sanity'

const YEAR_OPTIONS = [
  {title: '2025-2026 学年', value: '25-26'},
  {title: '2026-2027 学年', value: '26-27'},
  {title: '2027-2028 学年', value: '27-28'},
]

const CLASS_OPTIONS = [
  {title: '🐘 大象班 (Elephants)', value: 'elephant'},
  {title: '🐯 老虎班 (Tigers)', value: 'tiger'},
]

const GROUP_OPTIONS = [
  {title: '➕ 数学组', value: 'math'},
  {title: '👨‍🏫 王老师组', value: 'wang'},
  {title: '👩‍🏫 张老师组', value: 'zhang'},
  {title: '💻 电脑组', value: 'computer'},
]

export const centerRotation = defineType({
  name: 'centerRotation',
  title: '🎯 小组轮换进度',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: '记录名称',
      type: 'string',
      description: '建议格式：25-26 学年｜大象班（可自定义）',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'academicYear',
      title: '学年',
      type: 'string',
      options: {
        list: YEAR_OPTIONS,
        layout: 'dropdown',
      },
      initialValue: '25-26',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'className',
      title: '班级',
      type: 'string',
      options: {
        list: CLASS_OPTIONS,
        layout: 'radio',
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'step',
      title: '当前轮次',
      type: 'number',
      initialValue: 0,
      validation: Rule => Rule.required().min(0).integer(),
    }),
    defineField({
      name: 'groups',
      title: '当前分组（按学生引用，不按名字）',
      type: 'array',
      of: [
        defineField({
          name: 'group',
          title: '分组',
          type: 'object',
          fields: [
            defineField({
              name: 'groupCode',
              title: '分组类型',
              type: 'string',
              options: {
                list: GROUP_OPTIONS,
                layout: 'dropdown',
              },
              validation: Rule => Rule.required(),
            }),
            defineField({
              name: 'students',
              title: '学生名单',
              type: 'array',
              of: [
                defineField({
                  name: 'studentRef',
                  title: '学生',
                  type: 'reference',
                  to: [{type: 'student'}],
                  options: {
                    filter: ({document}) => {
                      const year = document?.academicYear || '25-26'
                      const className = document?.className || ''
                      return {
                        filter: '_type == "student" && academicYear == $year && className == $className',
                        params: {year, className},
                      }
                    },
                  },
                }),
              ],
              validation: Rule =>
                Rule.custom((value: any[] | undefined) => {
                  if (!Array.isArray(value)) return true
                  const seen = new Set<string>()
                  for (const item of value) {
                    const ref = item?._ref
                    if (!ref) continue
                    if (seen.has(ref)) return '同一分组内有重复学生'
                    seen.add(ref)
                  }
                  return true
                }),
            }),
          ],
          preview: {
            select: {
              code: 'groupCode',
              students: 'students',
            },
            prepare(selection) {
              const labels: Record<string, string> = {
                math: '➕ 数学组',
                wang: '👨‍🏫 王老师组',
                zhang: '👩‍🏫 张老师组',
                computer: '💻 电脑组',
              }
              const count = Array.isArray(selection.students) ? selection.students.length : 0
              return {
                title: labels[selection.code] || '未命名分组',
                subtitle: `${count} 位学生`,
              }
            },
          },
        }),
      ],
      validation: Rule =>
        Rule.custom((value: any[] | undefined) => {
          if (!Array.isArray(value)) return true
          const seen = new Set<string>()
          for (const group of value) {
            const students = Array.isArray(group?.students) ? group.students : []
            for (const item of students) {
              const ref = item?._ref
              if (!ref) continue
              if (seen.has(ref)) return '同一条轮换记录中，学生不能重复出现在多个小组'
              seen.add(ref)
            }
          }
          return true
        }),
    }),
    defineField({
      name: 'progressSnapshots',
      title: '进度备份照片',
      type: 'array',
      description: '每次轮换后可上传一张现场照片，后续可按照片重新回填进度',
      of: [
        defineField({
          name: 'snapshot',
          title: '备份照片',
          type: 'object',
          fields: [
            defineField({
              name: 'image',
              title: '照片',
              type: 'image',
              options: {hotspot: true},
            }),
            defineField({
              name: 'capturedAt',
              title: '拍摄时间',
              type: 'datetime',
            }),
            defineField({
              name: 'note',
              title: '备注',
              type: 'string',
            }),
          ],
          preview: {
            select: {
              title: 'note',
              subtitle: 'capturedAt',
              media: 'image',
            },
            prepare(selection) {
              return {
                title: selection.title || '进度备份',
                subtitle: selection.subtitle || '未填写时间',
                media: selection.media,
              }
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'resetNote',
      title: '重建说明',
      type: 'text',
      rows: 2,
      description: '如需“全清空重来”，直接新建一条本记录，旧记录可留作历史备查',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      year: 'academicYear',
      className: 'className',
      step: 'step',
    },
    prepare(selection) {
      const classLabel = selection.className === 'elephant' ? '🐘 大象班' : '🐯 老虎班'
      return {
        title: selection.title || '小组轮换进度',
        subtitle: `${classLabel}｜${selection.year || '25-26'}｜第 ${selection.step || 0} 轮`,
      }
    },
  },
})
