import {defineField, defineType} from 'sanity'

export const sentenceConfig = defineType({
  name: 'sentenceConfig',
  title: '🧩 句子排排队配置 (颜色/标签)',
  type: 'document',
  preview: { prepare() { return { title: '全局句子游戏配置' } } },
  fields: [
    defineField({
      name: 'tags',
      title: '🏷️ 主题标签定义 (中英双语)',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'zh', title: '中文标签 (如: 家人)', type: 'string' },
          { name: 'en', title: '英文翻译 (如: Family)', type: 'string' }
        ]
      }]
    }),
    defineField({
      name: 'keywords',
      title: '🔑 关键词提取标签',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'zh', title: '中文关键词 (如: 喜欢)', type: 'string' },
          { name: 'en', title: '英文翻译 (如: like)', type: 'string' },
          { name: 'match', title: '包含词语 (用英文逗号隔开，如: 喜欢,不喜欢)', type: 'string' }
        ]
      }]
    }),
    defineField({
      name: 'colors',
      title: '🎨 词性颜色字典',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'colorHex', title: '颜色代码 (如: #ff7675)', type: 'string' },
          { name: 'words', title: '应用该颜色的词语 (用英文逗号隔开，如: 去,有,吃,要)', type: 'text' }
        ]
      }]
    })
  ]
})