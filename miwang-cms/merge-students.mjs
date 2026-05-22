/**
 * merge-students.mjs
 * 
 * 合并 Sanity 中重复的学生记录：
 *   - 旧记录：有 avatar + name（legacy 字段），被现有页面引用
 *   - 新记录：有 nameZh / nameEn / birthday 等，没有头像
 * 
 * 策略：
 *   1. 以旧记录为主体（保留 _id），把新记录的字段 patch 进去
 *   2. 把所有引用新记录 _id 的文档（parentContact / centerRotation /
 *      hallOfFame / studentWork）全部改指向旧记录
 *   3. 删除新记录
 * 
 * 使用方法：
 *   1. npm install @sanity/client
 *   2. 设置环境变量 SANITY_TOKEN（需要 Editor 或以上权限）
 *   3. node merge-students.mjs          ← 先跑 dry-run，只打印不修改
 *   4. node merge-students.mjs --apply  ← 确认无误后再真正执行
 */

import { createClient } from '@sanity/client'

const DRY_RUN = !process.argv.includes('--apply')

const client = createClient({
  projectId: 'sow12t1i',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_TOKEN,
  useCdn: false,
})

// ─── 工具函数 ────────────────────────────────────────────────

function log(msg) { console.log(msg) }
function warn(msg) { console.warn('⚠️  ' + msg) }
function dryLog(msg) { if (DRY_RUN) console.log('  [dry-run] ' + msg) }

// ─── 第一步：拉取全部学生记录 ────────────────────────────────

async function fetchAllStudents() {
  return client.fetch(`
    *[_type == "student"] {
      _id, _rev, name, nameZh, nameEn, birthday,
      academicYear, className, avatar, homeroomCode,
      status, notes, importSource, lastImportedAt
    }
  `)
}

// ─── 第二步：配对旧记录与新记录 ──────────────────────────────
//
// 旧记录特征：name 有值（legacy 字段）
// 新记录特征：nameZh 有值，name 为空
// 匹配逻辑：新记录.nameZh === 旧记录.name

function pairStudents(allStudents) {
  const oldRecords = allStudents.filter(s => s.name && s.name.trim() !== '')
  const newRecords = allStudents.filter(s => (!s.name || s.name.trim() === '') && s.nameZh)

  log(`\n找到旧记录 ${oldRecords.length} 条，新记录 ${newRecords.length} 条`)

  const pairs = []
  const unmatchedNew = []

  for (const newRec of newRecords) {
    const match = oldRecords.find(o =>
      o.name && o.name.trim() === (newRec.nameZh || '').trim()
    )
    if (match) {
      pairs.push({ old: match, new: newRec })
    } else {
      unmatchedNew.push(newRec)
    }
  }

  log(`\n成功配对 ${pairs.length} 对：`)
  for (const p of pairs) {
    log(`  ✅  旧[${p.old._id}] "${p.old.name}"  ←←  新[${p.new._id}] "${p.new.nameZh}"`)
  }

  if (unmatchedNew.length > 0) {
    warn(`\n以下新记录未能匹配到旧记录（将跳过，不会删除）：`)
    for (const r of unmatchedNew) {
      warn(`  "${r.nameZh}" (${r._id})`)
    }
  }

  return { pairs, unmatchedNew }
}

// ─── 第三步：把新记录的字段 patch 到旧记录 ───────────────────

async function patchOldRecord(oldRec, newRec) {
  const patch = {}

  // 只把新记录里"有值"而旧记录里"没有"的字段复制过来
  if (!oldRec.nameZh && newRec.nameZh)    patch.nameZh    = newRec.nameZh
  if (!oldRec.nameEn && newRec.nameEn)    patch.nameEn    = newRec.nameEn
  if (!oldRec.birthday && newRec.birthday) patch.birthday  = newRec.birthday
  if (!oldRec.homeroomCode && newRec.homeroomCode) patch.homeroomCode = newRec.homeroomCode
  if (!oldRec.status && newRec.status)    patch.status    = newRec.status
  if (!oldRec.notes && newRec.notes)      patch.notes     = newRec.notes
  // academicYear / className：如果旧记录已有就保留，否则从新记录补
  if (!oldRec.academicYear && newRec.academicYear) patch.academicYear = newRec.academicYear
  if (!oldRec.className && newRec.className)       patch.className    = newRec.className

  if (Object.keys(patch).length === 0) {
    log(`    （无需补充字段）`)
    return
  }

  log(`    补充字段：${JSON.stringify(patch)}`)
  dryLog(`patch ${oldRec._id}`)

  if (!DRY_RUN) {
    await client.patch(oldRec._id).set(patch).commit()
  }
}

// ─── 第四步：更新所有引用了新记录 _id 的文档 ─────────────────

/**
 * 递归扫描一个对象，找出所有 { _type: 'reference', _ref: targetId } 并替换
 */
function replaceRef(obj, oldId, newId) {
  if (Array.isArray(obj)) {
    return obj.map(item => replaceRef(item, oldId, newId))
  }
  if (obj && typeof obj === 'object') {
    if (obj._type === 'reference' && obj._ref === oldId) {
      return { ...obj, _ref: newId }
    }
    const result = {}
    for (const key of Object.keys(obj)) {
      result[key] = replaceRef(obj[key], oldId, newId)
    }
    return result
  }
  return obj
}

// 查询所有引用了某个学生 _id 的文档
async function findReferencingDocs(studentId) {
  return client.fetch(
    `*[references($id)] { _id, _type, _rev }`,
    { id: studentId }
  )
}

async function updateReferences(newId, oldId) {
  const docs = await findReferencingDocs(newId)
  if (docs.length === 0) {
    log(`    没有其他文档引用新记录 ${newId}`)
    return
  }

  log(`    找到 ${docs.length} 个引用新记录的文档，开始重定向 → ${oldId}`)

  for (const doc of docs) {
    // 拉取完整文档内容
    const fullDoc = await client.fetch(`*[_id == $id][0]`, { id: doc._id })
    const updated = replaceRef(fullDoc, newId, oldId)

    // 去掉系统字段，只 patch 变更部分
    const { _id, _rev, _type, _createdAt, _updatedAt, ...fields } = updated

    log(`      更新 [${doc._type}] ${doc._id}`)
    dryLog(`set fields on ${doc._id}`)

    if (!DRY_RUN) {
      await client.patch(doc._id).set(fields).commit()
    }
  }
}

// ─── 第五步：删除新记录 ──────────────────────────────────────

async function deleteNewRecord(newRec) {
  log(`    删除新记录 ${newRec._id} ("${newRec.nameZh}")`)
  dryLog(`delete ${newRec._id}`)

  if (!DRY_RUN) {
    await client.delete(newRec._id)
  }
}

// ─── 主流程 ──────────────────────────────────────────────────

async function main() {
  log(DRY_RUN
    ? '\n🔍 DRY-RUN 模式（只打印，不修改数据）\n   加上 --apply 参数才会真正执行\n'
    : '\n🚀 APPLY 模式 — 正在修改 Sanity 数据...\n'
  )

  const allStudents = await fetchAllStudents()
  const { pairs } = pairStudents(allStudents)

  if (pairs.length === 0) {
    log('\n没有找到可合并的记录对，退出。')
    return
  }

  log(`\n开始处理 ${pairs.length} 对记录...\n`)

  for (const { old: oldRec, new: newRec } of pairs) {
    log(`\n── 处理：${oldRec.name} ──`)
    log(`  [1] 补充字段到旧记录 ${oldRec._id}`)
    await patchOldRecord(oldRec, newRec)

    log(`  [2] 更新引用：把新记录 ${newRec._id} 的引用改为 ${oldRec._id}`)
    await updateReferences(newRec._id, oldRec._id)

    log(`  [3] 删除新记录`)
    await deleteNewRecord(newRec)
  }

  log('\n' + (DRY_RUN ? '✅ Dry-run 完成，没有实际修改。' : '✅ 合并完成！'))
}

main().catch(err => {
  console.error('\n❌ 出错：', err.message)
  process.exit(1)
})
