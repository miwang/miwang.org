/**
 * POST /api/avatar-match
 *
 * Takes a list of uploaded file names and matches each one to a student
 * document in Sanity. Returns match candidates only — nothing is written.
 *
 * Matching is done against nameEn / name / nameZh, in this order:
 *   1. exact slug match      (confidence 1.00)
 *   2. slug without middle   (confidence 0.92)  "Adalynn E McDonald" -> "adalynn-mcdonald"
 *   3. "Last, First" form    (confidence 0.90)  roster PDF order
 *   4. Chinese name exact    (confidence 1.00)
 *   5. fuzzy (edit distance) (confidence 0.60-0.85)
 *
 * Body:
 *   { academicYear: "26-27", className: "elephant"|"tiger"|"", files: ["a.jpg", ...] }
 *
 * Required Cloudflare Pages env vars:
 *   CONTACTS_PASSWORD  — verifies the contacts_session cookie
 *   SANITY_API_TOKEN   — Sanity token with read access
 */

// Read published content only. Without this, Sanity's default perspective can
// include drafts, so an unpublished edit in Studio would leak onto the site and
// existence checks could match a document that is not actually live.
const PROJECT_ID = 'sow12t1i'
const DATASET = 'production'
const API_VERSION = '2021-10-21'
const COOKIE_NAME = 'contacts_session'

const IMAGE_EXT = /\.(jpe?g|png|webp|heic|heif)$/i

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

/* ---------- session (same scheme as contacts-data.js) ---------- */

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function parseCookies(header) {
  const out = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim()
  }
  return out
}

export async function isValidSession(request, pw) {
  if (!pw) return false
  const token = parseCookies(request.headers.get('Cookie'))[COOKIE_NAME]
  if (!token) return false
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const a = await hmacHex(pw, 'contacts:' + today)
  const b = await hmacHex(pw, 'contacts:' + yesterday)
  return token === a || token === b
}

/* ---------- name normalisation ---------- */

export function baseName(fileName) {
  return String(fileName || '')
    .replace(/^.*[\\/]/, '')
    .replace(IMAGE_EXT, '')
    .replace(/[\s_]*\(\d+\)$/, '')   // "Emma Wiley (1).jpg" -> duplicate suffix
    .replace(/[-_\s]*\d{1,3}$/, '')  // "Emma Wiley-2" -> trailing counter
    .trim()
}

export function slug(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip accents
    .replace(/['’`]/g, '')             // Lily'Anna -> lilyanna
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function hasHan(value) {
  return /[\u4e00-\u9fff]/.test(String(value || ''))
}

/** "McDonald, Adalynn E" -> "Adalynn E McDonald" */
export function flipCommaName(value) {
  const m = String(value || '').split(',')
  if (m.length !== 2) return ''
  const last = m[0].trim()
  const first = m[1].trim()
  if (!last || !first) return ''
  return first + ' ' + last
}

/** drop single-letter middle initials: "adalynn-e-mcdonald" -> "adalynn-mcdonald" */
export function dropInitials(slugged) {
  const parts = String(slugged || '').split('-').filter(p => p.length > 1)
  return parts.join('-')
}

function levenshtein(a, b) {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    prev = cur
  }
  return prev[n]
}

function similarity(a, b) {
  const longest = Math.max(a.length, b.length)
  if (!longest) return 0
  return 1 - levenshtein(a, b) / longest
}

/* ---------- matching ---------- */

/**
 * Matching tiers, most specific first.
 *
 * Photo filenames in practice are not full names. The 23-24 batch arrived as
 * bare first names ("Emma.png") with one file named after a surname
 * ("Abdullah.png", because two students share the first name Muhammad).
 * So each tier keeps ALL candidates and a tier that matches more than one
 * student is reported as ambiguous rather than silently resolved.
 */
const TIERS = [
  { name: 'exact',             conf: 1.00, key: s => slug(s) },
  { name: 'no_middle_initial', conf: 0.95, key: s => dropInitials(slug(s)) },
  { name: 'first_last',        conf: 0.92, key: s => {
      const parts = slug(s).split('-').filter(Boolean)
      return parts.length > 1 ? `${parts[0]}-${parts[parts.length - 1]}` : parts[0] || ''
    } },
  // First name before surname: photo filenames are overwhelmingly first names.
  // With surname first, "James.png" (James Douglas Stir) would be handed to
  // Emma James, whose SURNAME is James.
  { name: 'first_name_only',   conf: 0.80, key: s => (slug(s).split('-')[0] || '') },
  { name: 'last_name_only',    conf: 0.78, key: s => {
      const parts = slug(s).split('-').filter(Boolean)
      return parts.length ? parts[parts.length - 1] : ''
    } },
]

export function buildIndex(students) {
  const entries = students.map(s => {
    const en = s.nameEn || s.name || ''
    const zh = s.nameZh || (hasHan(s.name) ? s.name : '')
    return { doc: s, en, zh, enSlug: slug(en), zhSlug: slug(zh) }
  })

  // one lookup map per tier, plus a Chinese-name map
  const maps = TIERS.map(t => {
    const m = new Map()
    for (const e of entries) {
      const k = t.key(e.en)
      if (!k) continue
      if (!m.has(k)) m.set(k, [])
      m.get(k).push(e)
    }
    return m
  })
  const zhMap = new Map()
  for (const e of entries) {
    if (!e.zhSlug) continue
    if (!zhMap.has(e.zhSlug)) zhMap.set(e.zhSlug, [])
    zhMap.get(e.zhSlug).push(e)
  }
  return { entries, maps, zhMap }
}

function asCandidate(entry, confidence, method) {
  return {
    studentId: entry.doc._id,
    name: entry.en,
    nameZh: entry.zh || null,
    className: entry.doc.className || null,
    hasAvatar: !!entry.doc.hasAvatar,
    confidence,
    method,
  }
}

export function matchOne(fileName, index) {
  const raw = baseName(fileName)
  if (!raw) return { fileName, status: 'unmatched', reason: 'empty_name', candidates: [] }

  const flipped = flipCommaName(raw)
  const forms = [raw]
  if (flipped) forms.push(flipped)

  // Chinese filename: exact only, never fuzzy.
  for (const form of forms) {
    if (!hasHan(form)) continue
    const hits = index.zhMap.get(slug(form))
    if (hits && hits.length === 1) {
      return { fileName, parsedName: raw, status: 'matched',
               studentId: hits[0].doc._id,
               candidates: [asCandidate(hits[0], 1, 'chinese_exact')] }
    }
    if (hits && hits.length > 1) {
      return { fileName, parsedName: raw, status: 'ambiguous', reason: 'chinese_duplicate',
               candidates: hits.map(h => asCandidate(h, 1, 'chinese_exact')) }
    }
  }

  for (let i = 0; i < TIERS.length; i++) {
    const tier = TIERS[i]
    for (const form of forms) {
      if (hasHan(form)) continue
      const hits = index.maps[i].get(tier.key(form))
      if (!hits || !hits.length) continue
      if (hits.length === 1) {
        return { fileName, parsedName: raw, status: 'matched',
                 studentId: hits[0].doc._id, matchMethod: tier.name,
                 looseMatch: i >= 2,
                 candidates: [asCandidate(hits[0], tier.conf, tier.name)] }
      }
      return { fileName, parsedName: raw, status: 'ambiguous', reason: 'multiple_students',
               matchMethod: tier.name,
               candidates: hits.map(h => asCandidate(h, tier.conf, tier.name)) }
    }
  }

  // Last resort: edit distance against full names, always needs confirmation.
  const scored = []
  for (const e of index.entries) {
    let best = 0
    for (const form of forms) {
      if (hasHan(form)) continue
      const sim = Math.max(
        similarity(slug(form), e.enSlug),
        similarity(slug(form), (e.enSlug.split('-')[0] || '')),
      )
      if (sim > best) best = sim
    }
    if (best >= 0.72) scored.push(asCandidate(e, Math.min(best, 0.85), 'fuzzy'))
  }
  scored.sort((a, b) => b.confidence - a.confidence)
  if (!scored.length) {
    return { fileName, parsedName: raw, status: 'unmatched', reason: 'no_candidate', candidates: [] }
  }
  return { fileName, parsedName: raw, status: 'review', looseMatch: true,
           matchMethod: 'fuzzy', candidates: scored.slice(0, 5) }
}

/* ---------- handler ---------- */

export async function onRequestPost(context) {
  try {
    const pw = context.env.CONTACTS_PASSWORD
    const token = context.env.SANITY_API_TOKEN || context.env.SANITY_WRITE_TOKEN || context.env.SANITY_TOKEN
    if (!pw || !token) {
      return json({ ok: false, error: '服务器未配置 CONTACTS_PASSWORD / SANITY_API_TOKEN' }, 500)
    }
    if (!(await isValidSession(context.request, pw))) {
      return json({ ok: false, error: '未登录或登录已过期，请重新登录。' }, 401)
    }

    let body
    try {
      body = await context.request.json()
    } catch {
      return json({ ok: false, error: 'Invalid request body' }, 400)
    }

    const files = Array.isArray(body.files) ? body.files.slice(0, 300) : []
    if (!files.length) return json({ ok: false, error: '没有收到文件名列表。' }, 400)

    const academicYear = String(body.academicYear || '').trim()
    const className = String(body.className || '').trim()

    const filters = ['_type == "student"']
    if (academicYear) filters.push('academicYear == $year')
    if (className) filters.push('className == $cls')
    const query = `*[${filters.join(' && ')}]{_id, name, nameEn, nameZh, className, academicYear, "hasAvatar": defined(avatar.asset)}`

    const url = new URL(`https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}`)
    url.searchParams.set('perspective', 'published')
    url.searchParams.set('query', query)
    if (academicYear) url.searchParams.set('$year', JSON.stringify(academicYear))
    if (className) url.searchParams.set('$cls', JSON.stringify(className))

    const res = await fetch(url.toString(), {
      headers: { authorization: 'Bearer ' + token },
    })
    if (!res.ok) throw new Error(`Sanity query failed: ${res.status} ${await res.text()}`)
    const students = (await res.json()).result || []
    if (!students.length) return json({ ok: false, error: '该学年/班级下没有找到学生。' }, 404)

    const index = buildIndex(students)
    const results = files.map(f => matchOne(f, index))

    // Flag the same student being claimed by two different files.
    const claimed = {}
    for (const r of results) {
      if (r.status !== 'matched') continue
      claimed[r.studentId] = (claimed[r.studentId] || 0) + 1
    }
    for (const r of results) {
      if (r.status === 'matched' && claimed[r.studentId] > 1) {
        r.status = 'ambiguous'
        r.reason = 'duplicate_target'
        r.studentId = null
      }
    }

    const summary = {
      total: results.length,
      matched: results.filter(r => r.status === 'matched').length,
      review: results.filter(r => r.status === 'review').length,
      loose: results.filter(r => r.looseMatch).length,
      ambiguous: results.filter(r => r.status === 'ambiguous').length,
      unmatched: results.filter(r => r.status === 'unmatched').length,
      studentsInScope: students.length,
      studentsWithoutAvatar: students.filter(s => !s.hasAvatar).length,
    }

    return json({
      ok: true,
      summary,
      results,
      students: index.entries.map(e => ({
        _id: e.doc._id,
        name: e.en,
        nameZh: e.zh || null,
        className: e.doc.className || null,
        hasAvatar: !!e.doc.hasAvatar,
      })),
    })
  } catch (error) {
    return json({ ok: false, error: error.message || 'Match failed.' }, 500)
  }
}
