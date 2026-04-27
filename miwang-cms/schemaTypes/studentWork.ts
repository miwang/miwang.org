import { defineField, defineType } from 'sanity'

export const studentWork = defineType({
  name: 'studentWork',
  title: '📝 学生习作展示',
  type: 'document',
  fields: [
    // 🌟 新增：直观的展示模式单选按钮
    defineField({
      name: 'displayMode',
      title: '展示模式 (Display Mode)',
      type: 'string',
      options: {
        list: [
          { title: '📄 单页/单话题展示 (全班针对某一页/话题的合集)', value: 'singleTopic' },
          { title: '📚 整本书展示 (全书的完整作品合集)', value: 'wholeBook' }
        ],
        layout: 'radio' // 在后台显示为两个清晰的圆圈选项
      },
      initialValue: 'singleTopic',
      description: '请选择这份 PDF 属于哪种类型的展示'
      
    }),
    // 在 fields 数组中添加这一段
defineField({
  name: 'author',
  title: '作者 (Author)',
  type: 'reference', // 🌟 建立关联
  to: [{ type: 'student' }], // 🌟 指向您已有的 student 库
  description: '如果是整本书作品，请选择对应的学生'
}),
    defineField({ 
      name: 'unit', 
      title: '单元 (Unit)', 
      type: 'string' 
    }),
    
    // 🌟 优化：扩大了“话题”字段的适用范围
    defineField({ 
      name: 'topic', 
      title: '话题 / 详细描述 (Topic / Description)', 
      type: 'string',
      description: '单页展示可填：“我喜欢学校”。整本展示可填：“期末完整绘本创作”或直接留空。'
    }),
    
    defineField({ 
      name: 'book', 
      title: '书名 (Book)', 
      type: 'string' 
    }),
    
    defineField({ 
      name: 'pdfFile', 
      title: '习作扫描件 (PDF)', 
      type: 'file', 
      options: { accept: 'application/pdf' } 
    })
  ],
  
  // 🌟 奖励加成：让您的 Sanity 列表页更漂亮
  preview: {
    select: {
      title: 'unit',
      subtitle: 'topic',
      mode: 'displayMode'
    },
    prepare(selection) {
      const { title, subtitle, mode } = selection
      // 在后台列表里自动加上书本或单页的小图标
      const icon = mode === 'wholeBook' ? '📚 [整本]' : '📄 [单页]'
      return {
        title: `${icon} ${title || '未命名单元'}`,
        subtitle: subtitle || '无具体描述'
      }
    }
  }
})