/**
 * POST /api/contacts-import
 *
 * Accepts parsed roster rows and upserts both student documents and
 * parentContact documents into Sanity. Requires a valid session cookie.
 *
 * Required Cloudflare Pages env vars:
 *   CONTACTS_PASSWORD  — session validation
 *   SANITY_API_TOKEN   — Sanity write token (editor role)
 *
 * Request body (JSON):
 *   {
 *     rows: Array<{
 *       nameEn:       string,
 *       nameZh?:      string,
 *       homeroomCode: string,        // "15" | "17"
 *       className:    string,        // "elephant" | "tiger"
 *       academicYear: string,        // "25-26"
 *       birthday?:    string,        // "YYYY-MM-DD"
 *       needsReview?: boolean,
 *       rawImportText?: string,
 *       contacts: Array<{
 *         contactName?:  string,
 *         relationship?: string,
 *         type:          string,     // "phone"|"email"|"wechat"|"other"
 *         value:         string,
 *         isPrimary?:    boolean,
 *         notes?:        string,
 *       }>
 *     }>
 *   }
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

/**
 * Build a deterministic student document ID from key fields.
 * The same student imported multiple times produces the same ID → safe upsert.
 */
function buildStudentId(row) {
  const namePart = (row.nameEn || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return `student-roster-${row.academicYear}-${row.className}-${namePart}`
}

function buildContactId(studentId, academicYear) {
  return `parentContact-${studentId}-${academicYear}`
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

  for (const row of rows) {
    if (!row.nameEn && !row.nameZh) continue // skip completely empty rows

    const studentId = buildStudentId(row)
    const contactId = buildContactId(studentId, row.academicYear || '25-26')

    // 1. Create student doc only if it doesn't already exist.
    //    This preserves any manually-entered nameZh / avatar set via Sanity Studio.
    mutations.push({
      createIfNotExists: {
        _id: studentId,
        _type: 'student',
        nameEn: row.nameEn || undefined,
        className: row.className,
        academicYear: row.academicYear || '25-26',
        status: 'active',
      },
    })

    // 2. Patch only the roster-sourced fields so manual fields (nameZh, avatar, notes)
    //    are never overwritten by a re-import.
    const patchSet = {
      className: row.className,
      academicYear: row.academicYear || '25-26',
      status: 'active',
      importSource,
      lastImportedAt: now,
    }
    if (row.nameEn) patchSet.nameEn = row.nameEn
    if (row.nameZh) patchSet.nameZh = row.nameZh
    if (row.homeroomCode) patchSet.homeroomCode = row.homeroomCode
    if (row.birthday) patchSet.birthday = row.birthday
    // legacy compat: only set if doc doesn't already have a nameZh or nameEn
    if (!row.nameZh && row.nameEn) patchSet.name = row.nameEn

    mutations.push({
      patch: {
        id: studentId,
        set: patchSet,
      },
    })

    // Upsert parentContact document
    const contacts = (row.contacts || []).map((c, i) => ({
      _type: 'object',
      _key: `c${i}`,
      contactName: c.contactName || '',
      relationship: c.relationship || 'parent',
      type: c.type || 'phone',
      value: c.value || '',
      isPrimary: typeof c.isPrimary === 'boolean' ? c.isPrimary : i === 0,
      notes: c.notes || '',
    }))

    mutations.push({
      createOrReplace: {
        _id: contactId,
        _type: 'parentContact',
        student: {_type: 'reference', _ref: studentId},
        academicYear: row.academicYear || '25-26',
        contacts,
        needsReview: row.needsReview === true,
        rawImportText: row.rawImportText || '',
        importSource,
        importedAt: now,
      },
    })
  }

  try {
    const result = await sanityMutate(mutations, sanityToken)
    return json({
      ok: true,
      imported: rows.length,
      mutations: mutations.length,
      result,
    })
  } catch (err) {
    return json({error: err.message || 'Sanity write error'}, 500)
  }
}
