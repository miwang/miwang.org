import { defineField, defineType } from 'sanity'

export const gameAudio = defineType({
  name: 'gameAudio',
  title: '🎵 游戏全局音效',
  type: 'document',
  fields: [
    defineField({ name: 'doorbell', title: '门铃声 (Doorbell)', type: 'file', options: { accept: 'audio/*' } }),
    defineField({ name: 'correct', title: '答对音效 (Correct)', type: 'file', options: { accept: 'audio/*' } }),
    defineField({ name: 'wrong', title: '答错音效 (Wrong)', type: 'file', options: { accept: 'audio/*' } })
  ],
  // 🌟 核心修复：强制接管后台列表的显示外观
  preview: {
    prepare() {
      return {
        title: '🎵 全局音效配置',
        subtitle: '点击进入修改门铃与答对答错声音'
      }
    }
  }
})