import { defineField, defineType } from 'sanity'

export const song = defineType({
  name: 'song',
  title: '🎵 唱儿歌',
  type: 'document',
  fields: [
    defineField({
      name: 'id',
      title: '专属ID',
      type: 'string',
    }),
    defineField({
      name: 'title',
      title: '歌曲名称',
      type: 'string',
    }),
    defineField({
      name: 'cover',
      title: '封面配图',
      type: 'image',
    }),
    defineField({
      name: 'audio',
      title: '歌曲音频',
      type: 'file',
      options: { accept: 'audio/*' }
    }),
    defineField({
      name: 'youtubeId',
      title: 'YouTube 视频 ID (如: YCGVuC_629E)',
      type: 'string',
    }),
    defineField({
      name: 'startTime',
      title: '歌曲开始时间 (秒)',
      type: 'number',
    }),
    defineField({
      name: 'lyrics',
      title: '歌词文本',
      type: 'text',
    })
  ]
})