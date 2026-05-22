import {defineField, defineType} from 'sanity'

export const reportCard = defineType({
  name: 'reportCard',
  title: '📄 Report Card',
  type: 'document',
  fields: [
    defineField({
      name: 'student',
      title: 'Student',
      type: 'reference',
      to: [{type: 'student'}],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'academicYear',
      title: 'Academic Year',
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
      name: 'className',
      title: 'Class',
      type: 'string',
      options: {
        list: [
          {title: '🐘 大象班 (Elephants)', value: 'elephant'},
          {title: '🐯 老虎班 (Tigers)', value: 'tiger'},
        ],
        layout: 'radio',
      },
    }),
    defineField({name: 'school', title: 'School', type: 'string', initialValue: 'McIlvaine Early Childhood Center'}),
    defineField({name: 'grade', title: 'Grade', type: 'string', initialValue: 'Kindergarten'}),
    defineField({name: 'teacher', title: 'Teacher', type: 'string', initialValue: 'Wang Laoshi'}),
    defineField({name: 'reportDate', title: 'Report Date', type: 'date'}),
    defineField({name: 'markingPeriod', title: 'MP', type: 'string', initialValue: '2'}),
    defineField({name: 'sightWordsScore', title: 'Sight Words Score', type: 'string', description: 'Example: 48/50'}),
    defineField({
      name: 'ratings',
      title: 'Can-Do Ratings',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({name: 'key', title: 'Key', type: 'string', readOnly: true}),
          defineField({name: 'domain', title: 'Domain', type: 'string', readOnly: true}),
          defineField({name: 'statement', title: 'Statement', type: 'text', rows: 2, readOnly: true}),
          defineField({
            name: 'rating',
            title: 'Rating',
            type: 'string',
            options: {
              list: [
                {title: 'ES - Exceeds the standard', value: 'ES'},
                {title: 'MS - Meets the standard', value: 'MS'},
                {title: 'AS - Approaches the standard', value: 'AS'},
              ],
              layout: 'radio',
            },
            initialValue: 'MS',
          }),
        ],
        preview: {
          select: {title: 'statement', subtitle: 'rating'},
          prepare(sel) {
            return {title: sel.title, subtitle: sel.subtitle || 'Not rated'}
          },
        },
      }],
    }),
    defineField({name: 'teacherComments', title: 'Teacher Comments', type: 'text', rows: 4}),
    defineField({name: 'lastSavedAt', title: 'Last Saved At', type: 'datetime', readOnly: true}),
  ],
  preview: {
    select: {
      studentNameZh: 'student.nameZh',
      studentNameEn: 'student.nameEn',
      legacyName: 'student.name',
      academicYear: 'academicYear',
      markingPeriod: 'markingPeriod',
      className: 'className',
      media: 'student.avatar',
    },
    prepare(sel) {
      const name = [sel.studentNameEn, sel.studentNameZh].filter(Boolean).join(' ') || sel.legacyName || 'Unnamed Student'
      const classEmoji = sel.className === 'elephant' ? '🐘' : sel.className === 'tiger' ? '🐯' : '📄'
      return {
        title: `${classEmoji} ${name}`,
        subtitle: `${sel.academicYear || ''} MP ${sel.markingPeriod || ''}`,
        media: sel.media,
      }
    },
  },
})
