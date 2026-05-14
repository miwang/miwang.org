/**
 * POST /api/contacts-import
 *
 * Accepts parsed roster rows and upserts both student documents and
 * parentContact documents into Sanity with duplicate-merge protections.
 * Requires a valid session cookie.
 */

const COOKIE_NAME = 'contacts_session'
const PROJECT_ID = 'sow12t1i'
const DATASET = 'production'
const API_VER = 'v2023-05-03'

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

async function validateSession(request, secret) {
  const cookieHeader = request.headers.get('Cookie') || ''
  const cookies = {}
  for (const part of cookieHeader.split(';')) {
    const eqIdx = part.indexOf('=')
    if (eqIdx === -1) continue
    const k = part.slice(0, eqIdx).trim()
    const v = part.slice(eqIdx + 1).trim()
    if (k) cookies[k] = v
  }
  const token = cookies[COOKIE_NAME]
  if (!token) return false
  const expected = await hmacHex(secret, 'contacts:' + todayStr())
  return token === expected
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {'Content-Type': 'application/json'},
  })
}

function quoteGroqString(s) {
  return JSON.stringify(String(s || ''))
}

async function sanityQuery(groq, token) {
  const url = `https://${PROJECT_ID}.api.sanity.io/${API_VER}/data/query/${DATASET}?query=${encodeURIComponent(groq)}`
  const resp = await fetch(url, {
    headers: {Authorization: `Bearer ${token}`},
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Sanity query failed (${resp.status}): ${text.slice(0, 300)}`)
  }
  const data = await resp.json()
  return Array.isArray(data.result) ? data.result : []
}

/**
 * Build a deterministic student document ID from key fields.
 * The same student imported multiple times produces the same ID → safe upsert.
 */
function buildStudentId(row) {
  const namePart = (row.nameEn || row.nameZh || '')
    .replace(/[A-Z]/g, m => m.toLowerCase())
    .replace(/[^a-z0-9\u4e00-\u9fff]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'unnamed'
  return `student-roster-${row.academicYear}-${row.className}-${namePart}`
}

function buildContactId(studentId, academicYear) {
  return `parentContact-${studentId}-${academicYear}`
}

function normalizeZhExact(name) {
  return String(name || '')
    .trim()
    .replace(/[\s\u3000]+/g, '')
}

function normalizeZhAliasBase(name) {
  let s = String(name || '').trim()
  if (!s) return ''
  s = s
    .replace(/[（(][^）)]*[）)]/g, ' ')
    .replace(/[A-Za-z]+(?:[\s'’.-]+[A-Za-z]+)*/g, ' ')
    .replace(/[\s\u3000]+/g, '')
  return s
}

function firstTokenFromEn(nameEn) {
  const token = String(nameEn || '')
    .trim()
    .replace(/^[^A-Za-z]+/, '')
    .split(/\s+/)[0] || ''
  return token.toLowerCase().replace(/[^a-z]/g, '')
}

function extractAsciiAliases(nameZh) {
  const s = String(nameZh || '')
  const out = new Set()
  const bracketMatches = s.match(/[（(]([^）)]+)[）)]/g) || []
  for (const m of bracketMatches) {
    const inner = m.replace(/^[（(]|[）)]$/g, '')
    const token = firstTokenFromEn(inner)
    if (token) out.add(token)
  }
  const tailAscii = (s.match(/[A-Za-z]+(?:[\s'’.-]+[A-Za-z]+)*\s*$/) || [])[0] || ''
  const tailToken = firstTokenFromEn(tailAscii)
  if (tailToken) out.add(tailToken)
  return out
}

function collectFirstNameCandidates(nameEn, nameZh) {
  const out = new Set()
  const en = firstTokenFromEn(nameEn)
  if (en) out.add(en)
  for (const a of extractAsciiAliases(nameZh)) out.add(a)
  return out
}

function getStudentDisplayName(student) {
  return student?.nameZh || student?.nameEn || student?.name || student?._id || '未知学生'
}

function chooseMergeCandidate(row, candidates) {
  const rowZhExact = normalizeZhExact(row.nameZh)
  if (rowZhExact) {
    const exactMatches = candidates.filter(c => normalizeZhExact(c.nameZh) === rowZhExact)
    if (exactMatches.length === 1) {
      return {
        status: 'high',
        reason: 'exact_zh_class_year',
        student: exactMatches[0],
      }
    }
    if (exactMatches.length > 1) {
      return {
        status: 'conflict',
        reason: 'multiple_exact_zh_matches',
        candidates: exactMatches,
      }
    }
  }

  const rowZhBase = normalizeZhAliasBase(row.nameZh)
  if (!rowZhBase) return {status: 'none'}

  const rowFirsts = collectFirstNameCandidates(row.nameEn, row.nameZh)
  const mediumMatches = candidates.filter(c => {
    if (normalizeZhAliasBase(c.nameZh) !== rowZhBase) return false
    const cFirsts = collectFirstNameCandidates(c.nameEn || c.name, c.nameZh)
    if (!rowFirsts.size || !cFirsts.size) return false
    for (const f of rowFirsts) {
      if (cFirsts.has(f)) return true
    }
    return false
  })

  if (mediumMatches.length === 1) {
    return {
      status: 'pending',
      reason: 'alias_match_requires_review',
      student: mediumMatches[0],
    }
  }
  if (mediumMatches.length > 1) {
    return {
      status: 'conflict',
      reason: 'multiple_alias_matches',
      candidates: mediumMatches,
    }
  }

  return {status: 'none'}
}

function normalizeContactValue(type, value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (type === 'phone') return raw.replace(/\D/g, '')
  if (type === 'email') return raw.toLowerCase()
  return raw.toLowerCase().replace(/[\s\u3000]+/g, ' ')
}

function sanitizeContact(c, i) {
  return {
    _type: 'object',
    _key: `c${i}`,
    contactName: String(c?.contactName || '').trim(),
    relationship: String(c?.relationship || 'parent').trim() || 'parent',
    type: String(c?.type || 'phone').trim() || 'phone',
    value: String(c?.value || '').trim(),
    isPrimary: typeof c?.isPrimary === 'boolean' ? c.isPrimary : i === 0,
    notes: String(c?.notes || '').trim(),
  }
}

function mergeContacts(existingContacts, incomingContacts) {
  const merged = (existingContacts || []).map((c, i) => sanitizeContact(c, i))
  const conflicts = []

  for (const incomingRaw of incomingContacts || []) {
    const incoming = sanitizeContact(incomingRaw, merged.length)
    if (!incoming.value) continue
    const keyType = incoming.type || 'phone'
    const keyVal = normalizeContactValue(keyType, incoming.value)
    if (!keyVal) continue

    const existingIdx = merged.findIndex(c => {
      const t = c.type || 'phone'
      return t === keyType && normalizeContactValue(t, c.value) === keyVal
    })

    if (existingIdx === -1) {
      incoming._key = `c${merged.length}`
      merged.push(incoming)
      continue
    }

    const current = merged[existingIdx]
    if (!current.contactName && incoming.contactName) current.contactName = incoming.contactName
    else if (
      current.contactName && incoming.contactName &&
      current.contactName !== incoming.contactName
    ) {
      conflicts.push(`联系人姓名冲突：${incoming.value}（保留旧值 ${current.contactName}）`)
    }

    if (!current.relationship && incoming.relationship) current.relationship = incoming.relationship
    else if (
      current.relationship && incoming.relationship &&
      current.relationship !== incoming.relationship
    ) {
      conflicts.push(`关系字段冲突：${incoming.value}（保留旧值 ${current.relationship}）`)
    }

    if (!current.notes && incoming.notes) current.notes = incoming.notes
    else if (current.notes && incoming.notes && current.notes !== incoming.notes) {
      conflicts.push(`备注冲突：${incoming.value}（保留旧备注）`)
    }

    if (!current.isPrimary && incoming.isPrimary) current.isPrimary = true
  }

  if (merged.length && !merged.some(c => c.isPrimary)) {
    merged[0].isPrimary = true
  }

  return {contacts: merged, conflicts}
}

async function sanityMutate(mutations, token) {
  const url = `https://${PROJECT_ID}.api.sanity.io/${API_VER}/data/mutate/${DATASET}`
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({mutations, returnDocuments: false}),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Sanity mutate failed (${resp.status}): ${text.slice(0, 300)}`)
  }
  return resp.json()
}

async function fetchExistingData(rows, sanityToken) {
  const years = Array.from(new Set(rows.map(r => String(r.academicYear || '25-26').trim()).filter(Boolean)))
  if (!years.length) return {students: [], parentContacts: []}
  const yearsList = `[${years.map(quoteGroqString).join(',')}]`

  const studentGroq = `*[_type == "student" && academicYear in ${yearsList}] {
    _id,
    nameZh,
    nameEn,
    name,
    className,
    academicYear,
    birthday,
    homeroomCode,
    notes,
    avatar,
    _updatedAt
  }`
  const contactGroq = `*[_type == "parentContact" && academicYear in ${yearsList}] {
    _id,
    academicYear,
    contacts,
    needsReview,
    rawImportText,
    importSource,
    importedAt,
    "studentId": student._ref
  }`

  const [students, parentContacts] = await Promise.all([
    sanityQuery(studentGroq, sanityToken),
    sanityQuery(contactGroq, sanityToken),
  ])

  return {students, parentContacts}
}

function buildStudentsByYearClass(students) {
  const map = new Map()
  for (const s of students || []) {
    const key = `${s.academicYear || ''}|${s.className || ''}`
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(s)
  }
  return map
}

function buildContactIndex(parentContacts) {
  const byStudentYear = new Map()
  for (const c of parentContacts || []) {
    const key = `${c.studentId || ''}|${c.academicYear || ''}`
    if (!byStudentYear.has(key)) byStudentYear.set(key, [])
    byStudentYear.get(key).push(c)
  }
  return byStudentYear
}

function collectPostMergeDuplicateWarnings(students, plannedStudentsById) {
  const combined = new Map()
  for (const s of students || []) combined.set(s._id, s)
  for (const [id, s] of plannedStudentsById.entries()) combined.set(id, s)

  const bucket = new Map()
  for (const s of combined.values()) {
    const zh = normalizeZhExact(s.nameZh)
    if (!zh) continue
    const key = `${s.academicYear || ''}|${s.className || ''}|${zh}`
    if (!bucket.has(key)) bucket.set(key, [])
    bucket.get(key).push(s)
  }

  const warnings = []
  for (const [key, items] of bucket.entries()) {
    if (items.length <= 1) continue
    const [year, className] = key.split('|')
    warnings.push({
      type: 'duplicate_zh_class',
      academicYear: year,
      className,
      nameZh: items[0].nameZh || '',
      students: items.map(s => ({_id: s._id, name: getStudentDisplayName(s)})),
    })
  }
  return warnings
}

export async function onRequestPost(context) {
  const pw = context.env.CONTACTS_PASSWORD
  const sanityToken = context.env.SANITY_API_TOKEN
  if (!pw || !sanityToken) {
    return json({error: '服务器未配置所需的环境变量'}, 500)
  }

  const isValid = await validateSession(context.request, pw)
  if (!isValid) {
    return json({error: 'Unauthorized'}, 401)
  }

  let body
  try {
    body = await context.request.json()
  } catch {
    return json({error: '请求体解析失败'}, 400)
  }

  const {rows = []} = body
  if (!rows.length) {
    return json({error: '没有可导入的数据行'}, 400)
  }

  const now = new Date().toISOString()
  const importSource = `roster-import-${todayStr()}`
  const mutations = []

  let existing
  try {
    existing = await fetchExistingData(rows, sanityToken)
  } catch (err) {
    return json({error: err.message || '读取现有数据失败'}, 500)
  }

  const studentsByYearClass = buildStudentsByYearClass(existing.students)
  const parentContactByStudentYear = buildContactIndex(existing.parentContacts)

  const pendingReviews = []
  const mergeSummary = {
    highConfidenceMerged: 0,
    createdNewStudents: 0,
    preservedOldFieldConflicts: 0,
    contactConflicts: 0,
  }

  const plannedStudentsById = new Map()

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex] || {}
    if (!row.nameEn && !row.nameZh) continue

    const academicYear = String(row.academicYear || '25-26').trim() || '25-26'
    const className = String(row.className || '').trim()
    const homeroomCode = String(row.homeroomCode || '').trim()
    const rowLabel = row.nameZh || row.nameEn || `第 ${rowIndex + 1} 行`
    const classKey = `${academicYear}|${className}`
    const candidates = studentsByYearClass.get(classKey) || []

    const decision = chooseMergeCandidate(row, candidates)
    if (decision.status === 'pending' || decision.status === 'conflict') {
      pendingReviews.push({
        rowIndex,
        rowLabel,
        reason: decision.reason,
        candidateStudents: (decision.candidates || (decision.student ? [decision.student] : [])).map(s => ({
          _id: s._id,
          nameZh: s.nameZh || '',
          nameEn: s.nameEn || s.name || '',
          className: s.className || '',
          academicYear: s.academicYear || '',
        })),
      })
      continue
    }

    let studentId
    let existingStudent = null
    if (decision.status === 'high' && decision.student) {
      existingStudent = decision.student
      studentId = existingStudent._id
      mergeSummary.highConfidenceMerged++
    } else {
      studentId = buildStudentId({
        academicYear,
        className,
        nameEn: row.nameEn,
        nameZh: row.nameZh,
      })
      existingStudent = existing.students.find(s => s._id === studentId) || null
      if (!existingStudent) mergeSummary.createdNewStudents++
    }

    const patchSet = {
      className,
      academicYear,
      status: 'active',
      importSource,
      lastImportedAt: now,
    }

    const existingNameZh = String(existingStudent?.nameZh || '').trim()
    const existingNameEn = String(existingStudent?.nameEn || '').trim()
    const existingLegacyName = String(existingStudent?.name || '').trim()

    if (existingNameZh) {
      if (row.nameZh && row.nameZh.trim() && row.nameZh.trim() !== existingNameZh) {
        mergeSummary.preservedOldFieldConflicts++
      }
    } else if (row.nameZh) {
      patchSet.nameZh = row.nameZh
    }

    if (existingNameEn) {
      if (row.nameEn && row.nameEn.trim() && row.nameEn.trim() !== existingNameEn) {
        mergeSummary.preservedOldFieldConflicts++
      }
    } else if (row.nameEn) {
      patchSet.nameEn = row.nameEn
    }

    if (!existingLegacyName) {
      patchSet.name = existingNameZh || row.nameZh || existingNameEn || row.nameEn || undefined
    }

    const existingBirthday = String(existingStudent?.birthday || '').trim()
    if (!existingBirthday && row.birthday) {
      patchSet.birthday = row.birthday
    } else if (existingBirthday && row.birthday && existingBirthday !== row.birthday) {
      mergeSummary.preservedOldFieldConflicts++
    }

    const existingHomeroomCode = String(existingStudent?.homeroomCode || '').trim()
    if (!existingHomeroomCode && homeroomCode) {
      patchSet.homeroomCode = homeroomCode
    } else if (existingHomeroomCode && homeroomCode && existingHomeroomCode !== homeroomCode) {
      mergeSummary.preservedOldFieldConflicts++
    }

    mutations.push({
      createIfNotExists: {
        _id: studentId,
        _type: 'student',
        nameEn: row.nameEn || undefined,
        nameZh: row.nameZh || undefined,
        className,
        academicYear,
        status: 'active',
      },
    })

    mutations.push({
      patch: {
        id: studentId,
        set: patchSet,
      },
    })

    const contactKey = `${studentId}|${academicYear}`
    const existingContactDocs = parentContactByStudentYear.get(contactKey) || []
    const baseContact = existingContactDocs[0] || null

    const mergedContactResult = mergeContacts(baseContact?.contacts || [], row.contacts || [])
    if (mergedContactResult.conflicts.length) {
      mergeSummary.contactConflicts += mergedContactResult.conflicts.length
    }

    const contactDocId = baseContact?._id || buildContactId(studentId, academicYear)

    mutations.push({
      createOrReplace: {
        _id: contactDocId,
        _type: 'parentContact',
        student: {_type: 'reference', _ref: studentId},
        academicYear,
        contacts: mergedContactResult.contacts,
        needsReview: row.needsReview === true || mergedContactResult.conflicts.length > 0,
        rawImportText: row.rawImportText || baseContact?.rawImportText || '',
        importSource,
        importedAt: now,
      },
    })

    plannedStudentsById.set(studentId, {
      _id: studentId,
      nameZh: existingNameZh || row.nameZh || '',
      nameEn: existingNameEn || row.nameEn || '',
      name: existingLegacyName || patchSet.name || '',
      className,
      academicYear,
    })
  }

  if (pendingReviews.length) {
    return json({
      error: '存在中置信别名匹配或冲突匹配，请先人工确认后再导入',
      pendingReviews,
      mergeSummary,
    }, 409)
  }

  const duplicateWarnings = collectPostMergeDuplicateWarnings(existing.students, plannedStudentsById)

  try {
    const result = await sanityMutate(mutations, sanityToken)
    return json({
      ok: true,
      imported: rows.length,
      mutations: mutations.length,
      mergeSummary,
      duplicateWarnings,
      result,
    })
  } catch (err) {
    return json({error: err.message || 'Sanity write error'}, 500)
  }
}
