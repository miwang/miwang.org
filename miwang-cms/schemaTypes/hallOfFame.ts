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
      to: [{ type: 'student' }], // 关联到您的学生管理模型
      validation: Rule => Rule.required(),
      description: '直接从现有的学生名单中选择'
      // ⚠️ 注意：这里绝对不能有 initialValue 属性
    }),
    defineField({
      name: 'awardTitle',
      title: '奖项名称',
      type: 'string',
      initialValue: '本月中文之星', // 只有字符串类型可以有这个属性
      description: '例如：本月中文之星、识字小达人'
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
    })
  ],
  preview: {
    select: {
      title: 'studentRef.name',
      subtitle: 'awardMonth',
      media: 'studentRef.avatar'
    }
  }
})