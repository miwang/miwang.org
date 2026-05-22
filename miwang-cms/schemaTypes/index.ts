// 引入你所有的图纸文件
import { book } from './book'
import { parentContact } from './parentContact'
import { word } from './word'
import { sentence } from './sentence'
import { song } from './song'
import { poem } from './poem'
import { family } from './family'
import { gameAudio } from './gameAudio'
import { focusWall } from './focusWall'
import { student } from './student'
import { centerConfig } from './centerConfig'
import { sentenceConfig } from './sentenceConfig'
import { extraPhrase } from './extraPhrase' // 🌟 1. 引入新加的补充词汇模型
import { studentWork } from './studentWork'
import { hallOfFame } from './hallOfFame'
import { pictureTalk } from './pictureTalk' // 🌟 引入看图说话模型
import { academicYearConfig } from './academicYearConfig'
import { centerRotation } from './centerRotation'
import { reportCard } from './reportCard'
import { esgiAssessmentResult } from './esgiAssessmentResult'




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
  parentContact,
  centerConfig,
  sentenceConfig, 
  extraPhrase, // 🌟 2. 注册进系统
  studentWork,
  hallOfFame,
  pictureTalk, // 🌟 注册看图说话
  academicYearConfig,
  centerRotation,
  reportCard,
  esgiAssessmentResult,
 ]