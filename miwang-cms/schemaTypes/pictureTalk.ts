import { defineField, defineType } from 'sanity'

export const pictureTalk = defineType({
  name: 'pictureTalk',
  title: '🖼️ 看图说话',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: '图片标题 (内部备注用)',
      type: 'string',
      description: '例如：猫咪穿西装、外星人买菜，仅供后台识别，不会显示在前台',
      validation: Rule => Rule.required().error('必须填写标题，方便管理')
    }),
    defineField({
      name: 'image',
      title: '搞笑图片',
      type: 'image',
      options: { hotspot: true },
      validation: Rule => Rule.required().error('必须上传图片')
    }),
    defineField({
      name: 'hint',
      title: '提示语 (选填)',
      type: 'string',
      description: '可选：给小朋友一点提示，如「这个人在做什么？」',
    }),
    defineField({
      name: 'isActive',
      title: '是否启用',
      type: 'boolean',
      initialValue: true,
      description: '关闭后该图片不会出现在前台随机抽取中'
    })
  ],
  preview: {
    select: {
      title: 'title',
      media: 'image',
      active: 'isActive'
    },
    prepare({ title, media, active }) {
      return {
        title: `${active === false ? '🚫 ' : '✅ '}${title || '未命名图片'}`,
        media
      }
    }
  }
})
