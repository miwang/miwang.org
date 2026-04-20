<<<<<<< Updated upstream
// 引入你所有的图纸文件
import { book } from './book'
import { word } from './word'
import { sentence } from './sentence'
import { song } from './song'
import { poem } from './poem'
import { family } from './family'
import { gameAudio } from './gameAudio'
import { focusWall } from './focusWall'
import { student } from './student'
import { centerConfig } from './centerConfig'
import { sentenceConfig } from './sentenceConfig' // 🌟 全局句子颜色/标签配置

// 将它们统一导出
export const schemaTypes = [
  book,
  word,
  sentence,
  song,
  poem,
  family,
  gameAudio,
  focusWall,
  student,
  centerConfig,
  sentenceConfig, // 🌟 注册进系统
=======
import focusWall from './focusWall'
import book from './book'
import sentence from './sentence'
import song from './song'
import word from './word'
import poem from './poem'

export const schemaTypes = [
  focusWall,
  book,
  sentence,
  song,
  word,
  poem
>>>>>>> Stashed changes
]