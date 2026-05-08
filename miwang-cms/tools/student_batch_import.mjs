#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import process from 'node:process'
import {createClient} from '@sanity/client'

const DEFAULT_PROJECT_ID = 'sow12t1i'
const DEFAULT_DATASET = 'production'
const DEFAULT_API_VERSION = '2023-05-03'
const ALLOWED_CLASSES = new Set(['elephant', 'tiger'])

function parseArgs(argv) {
  const out = {apply: false}
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]
    const value = argv[i + 1]
    if (key === '--csv') out.csv = value
    if (key === '--photos') out.photos = value
    if (key === '--apply') out.apply = true
    if (key === '--help') out.help = true
  }
  return out
}

function usage() {
  console.log(`Usage:
  node tools/student_batch_import.mjs --csv <file> --photos <dir> [--apply]

Notes:
  - Default mode is dry-run (no upload/write).
  - Use --apply to upload images and create/update student docs.
  - Requires SANITY_API_TOKEN in environment.
  - Optional: SANITY_PROJECT_ID / SANITY_DATASET / SANITY_API_VERSION.
`)
}

function parseCsvLine(line) {
  const cols = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      cols.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  cols.push(current.trim())
  return cols
}

function parseCsv(content) {
  const lines = content
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
  if (!lines.length) return []
  const headers = parseCsvLine(lines[0])
  return lines.slice(1).map((line, idx) => {
    const values = parseCsvLine(line)
    const obj = {_line: idx + 2}
    headers.forEach((h, i) => {
      obj[h] = values[i] || ''
    })
    return obj
  })
}

function buildDocId(row) {
  const raw = `${row.academicYear}|${row.className}|${row.nameZh}|${row.nameEn}|${row.birthday}`
  return `student-${crypto.createHash('sha256').update(raw).digest('hex')}`
}

function validateRow(row) {
  const errors = []
  if (!row.nameZh && !row.nameEn) errors.push('nameZh/nameEn 至少填一个')
  if (!/^\d{2}-\d{2}$/.test(row.academicYear || '')) errors.push('academicYear 必须是 25-26 这类格式')
  if (!ALLOWED_CLASSES.has(row.className)) errors.push('className 必须是 elephant 或 tiger')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.birthday || '')) errors.push('birthday 必须是 YYYY-MM-DD')
  return errors
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.csv || !args.photos) {
    usage()
    process.exit(args.help ? 0 : 1)
  }

  const csvPath = path.resolve(args.csv)
  const photosDir = path.resolve(args.photos)
  if (!fs.existsSync(csvPath)) throw new Error(`CSV 文件不存在: ${csvPath}`)
  if (!fs.existsSync(photosDir)) throw new Error(`照片目录不存在: ${photosDir}`)

  const rows = parseCsv(fs.readFileSync(csvPath, 'utf-8'))
  if (!rows.length) {
    console.log('CSV 无数据行。')
    return
  }

  const token = process.env.SANITY_API_TOKEN
  if (args.apply && !token) {
    throw new Error('缺少 SANITY_API_TOKEN。请先导出 token 再使用 --apply。')
  }

  const client = createClient({
    projectId: process.env.SANITY_PROJECT_ID || DEFAULT_PROJECT_ID,
    dataset: process.env.SANITY_DATASET || DEFAULT_DATASET,
    apiVersion: process.env.SANITY_API_VERSION || DEFAULT_API_VERSION,
    token,
    useCdn: false,
  })

  const seen = new Set()
  const validRows = []
  const invalidRows = []
  for (const row of rows) {
    const errors = validateRow(row)
    const dedupeKey = `${row.academicYear}|${row.className}|${row.nameZh}|${row.nameEn}|${row.birthday}`
    if (seen.has(dedupeKey)) errors.push('CSV 内重复记录')
    seen.add(dedupeKey)
    if (errors.length) invalidRows.push({row, errors})
    else validRows.push(row)
  }

  console.log(`总行数: ${rows.length}`)
  console.log(`有效: ${validRows.length}，无效: ${invalidRows.length}`)
  if (invalidRows.length) {
    invalidRows.forEach(item => {
      console.log(`- 第 ${item.row._line} 行: ${item.errors.join('；')}`)
    })
  }
  if (!validRows.length) return

  if (!args.apply) {
    console.log('当前为 dry-run，未写入 Sanity。加 --apply 执行写入。')
    return
  }

  let written = 0
  for (const row of validRows) {
    const doc = {
      _id: buildDocId(row),
      _type: 'student',
      nameZh: row.nameZh || undefined,
      nameEn: row.nameEn || undefined,
      name: row.nameZh || row.nameEn || undefined, // 兼容旧字段
      birthday: row.birthday,
      academicYear: row.academicYear,
      className: row.className,
    }

    const photoName = row.photo?.trim()
    if (photoName) {
      const photoPath = path.join(photosDir, photoName)
      if (!fs.existsSync(photoPath)) {
        console.log(`- 第 ${row._line} 行跳过图片：未找到 ${photoName}`)
      } else {
        const asset = await client.assets.upload('image', fs.createReadStream(photoPath), {
          filename: path.basename(photoPath),
        })
        doc.avatar = {
          _type: 'image',
          asset: {_type: 'reference', _ref: asset._id},
        }
      }
    }

    await client.createOrReplace(doc)
    written++
    console.log(`✔ 已写入: ${doc._id}`)
  }
  console.log(`完成写入 ${written} 条学生记录。`)
}

run().catch(err => {
  console.error(err.message || err)
  process.exit(1)
})
