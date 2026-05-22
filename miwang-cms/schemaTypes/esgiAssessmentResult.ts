import {defineField, defineType} from 'sanity'

export const esgiAssessmentResult = defineType({
  name: 'esgiAssessmentResult',
  title: '📊 ESGI Assessment Result',
  type: 'document',
  fields: [
    defineField({name: 'student', title: 'Student', type: 'reference', to: [{type: 'student'}]}),
    defineField({name: 'studentName', title: 'Student Name from ESGI', type: 'string', validation: Rule => Rule.required()}),
    defineField({name: 'matched', title: 'Matched to Sanity Student', type: 'boolean', initialValue: false}),
    defineField({name: 'needsReview', title: 'Needs Review', type: 'boolean', initialValue: false}),
    defineField({name: 'academicYear', title: 'Academic Year', type: 'string'}),
    defineField({name: 'className', title: 'Class', type: 'string'}),
    defineField({name: 'markingPeriod', title: 'MP / Quarter Imported', type: 'string'}),
    defineField({name: 'reportDate', title: 'ESGI Report Date', type: 'date'}),
    defineField({name: 'sourceFileName', title: 'Source File Name', type: 'string'}),
    defineField({
      name: 'assessments',
      title: 'Assessments',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({name: 'testName', title: 'Test Name', type: 'string'}),
          defineField({name: 'baseline', title: 'Baseline', type: 'number'}),
          defineField({name: 'q1', title: '1st Quarter', type: 'number'}),
          defineField({name: 'q2', title: '2nd Quarter', type: 'number'}),
          defineField({name: 'q3', title: '3rd Quarter', type: 'number'}),
          defineField({name: 'q4', title: '4th Quarter', type: 'number'}),
          defineField({name: 'latestScore', title: 'Latest Score', type: 'number'}),
          defineField({name: 'totalPossible', title: 'Total Possible', type: 'number'}),
          defineField({name: 'percent', title: 'Percent', type: 'number'}),
        ],
        preview: {
          select: {title: 'testName', score: 'latestScore', total: 'totalPossible'},
          prepare(sel) {
            return {title: sel.title || 'Assessment', subtitle: `${sel.score ?? ''}/${sel.total ?? ''}`}
          },
        },
      }],
    }),
    defineField({name: 'rawTextPreview', title: 'Raw Text Preview', type: 'text', rows: 3, readOnly: true}),
    defineField({name: 'importedAt', title: 'Imported At', type: 'datetime', readOnly: true}),
  ],
  preview: {
    select: {studentName: 'studentName', matched: 'matched', needsReview: 'needsReview', year: 'academicYear'},
    prepare(sel) {
      const status = sel.needsReview ? '⚠️ Review' : sel.matched ? '✅ Matched' : '❓ Unmatched'
      return {title: `${status} ${sel.studentName || 'Unknown Student'}`, subtitle: sel.year || ''}
    },
  },
})
