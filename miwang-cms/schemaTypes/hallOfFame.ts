import { defineField, defineType } from 'sanity'

export const hallOfFame = defineType({
  name: 'hallOfFame',
  title: '🏆 荣誉殿堂 (Hall of Fame)',
  type: 'document',
  fields: [
    defineField({
      name: 'studentRef',
      title: '选择获奖学生',
      type: 'reference',
      to: [{ type: 'student' }],
      validation: Rule => Rule.required(),
      description: '直接从现有的学生名单中选择'
    }),
    defineField({
      name: 'awardType',
      title: '奖项类型',
      type: 'string',
      options: {
        list: [
          { title: '🏆 四会字大师奖', value: 'chinese_words' },
          { title: '📐 数学大师奖', value: 'mathematics' },
          { title: '🌟 最佳进步奖', value: 'progression' },
        ],
        layout: 'radio',
      },
      initialValue: 'chinese_words',
      validation: Rule => Rule.required(),
      description: '获奖类型，对应荣誉殿堂页面上的勋章颜色'
    }),
    defineField({
      name: 'awardTitle',
      title: '奖项名称（可选覆盖）',
      type: 'string',
      description: '留空则使用奖项类型的默认名称'
    }),
    defineField({
      name: 'awardMonth',
      title: '获奖月份',
      type: 'date',
      options: {
        dateFormat: 'YYYY-MM',
      },
      validation: Rule => Rule.required(),
      description: '选择月份，网页会自动只显示该月的勋章'
    }),
    defineField({
      name: 'sightWordScore',
      title: '四会字得分',
      type: 'number',
      description: '当月四会字测试最新得分（仅四会字大师奖使用，由管理工具自动填入）'
    }),
  ],
  preview: {
    select: {
      title: 'studentRef.name',
      subtitle: 'awardMonth',
      media: 'studentRef.avatar'
    }
  }
})